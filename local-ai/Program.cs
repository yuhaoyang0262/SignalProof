using System.Diagnostics;
using System.Net;
using System.Text.Json;
using SignalProof.Tutor;

LocalSettings.Load(Path.Combine(AppContext.BaseDirectory, ".env"));
LocalSettings.Load(Path.Combine(Directory.GetCurrentDirectory(), ".env"));
var settings = TutorSettings.FromEnvironment();
var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args,
    ContentRootPath = AppContext.BaseDirectory,
    WebRootPath = Path.Combine(AppContext.BaseDirectory, "wwwroot")
});
builder.WebHost.ConfigureKestrel(server =>
{
    server.ListenLocalhost(settings.Port);
    server.Limits.MaxRequestBodySize = 16 * 1024;
});
builder.Logging.AddFilter("Microsoft.AspNetCore", LogLevel.Warning);
var bank = new QuestionBank(Path.Combine(AppContext.BaseDirectory, "Content", "question-bank.json"));
using var http = new HttpClient(new HttpClientHandler { AllowAutoRedirect = false }) { Timeout = TimeSpan.FromSeconds(180) };
var tutor = new TutorClient(http, settings);
using var gate = new SemaphoreSlim(1, 1);
var app = builder.Build();
app.Use(async (context, next) =>
{
    var host = context.Request.Host.Host.Trim('[', ']');
    if (host != "localhost" && host != "127.0.0.1" && host != "::1")
    { context.Response.StatusCode = 403; return; }
    if (context.Connection.RemoteIpAddress is { } ip && !IPAddress.IsLoopback(ip))
    { context.Response.StatusCode = 403; return; }
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["Referrer-Policy"] = "no-referrer";
    context.Response.Headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'";
    if (context.Request.Path.StartsWithSegments("/api"))
        context.Response.Headers.CacheControl = "no-store";
    if (context.Request.Method == "POST")
    {
        var origin = context.Request.Headers.Origin.ToString();
        var expectedOrigin = $"{context.Request.Scheme}://{context.Request.Host}";
        if (context.Request.Headers["X-SignalProof-Request"] != "1" ||
            (origin.Length > 0 && !string.Equals(origin, expectedOrigin, StringComparison.OrdinalIgnoreCase)) ||
            context.Request.Headers["Sec-Fetch-Site"] == "cross-site")
        { context.Response.StatusCode = 403; await context.Response.WriteAsJsonAsync(new { error = "请从本地助教页面发起请求。" }); return; }
    }
    await next();
});
app.UseDefaultFiles();
app.UseStaticFiles();
app.MapGet("/api/status", () => Results.Json(new
{
    configured = !string.IsNullOrWhiteSpace(settings.ApiKey),
    model = settings.Model, reasoningEffort = settings.ReasoningEffort,
    provider = "Responses API", server = "C# / ASP.NET Core", store = false, questionCount = bank.Questions.Count
}));
app.MapGet("/api/questions", () => Results.Json(new { cases = bank.Questions }));
app.MapPost("/api/tutor", async (TutorRequest request, HttpContext context) =>
{
    if (string.IsNullOrWhiteSpace(settings.ApiKey))
        return Results.Json(new { error = "尚未配置 API Key。请填写 local-ai/.env 后重启本地服务。" }, statusCode: 503);
    var validation = bank.Validate(request);
    if (validation is not null) return Results.BadRequest(new { error = validation });
    if (!await gate.WaitAsync(0, context.RequestAborted))
        return Results.Json(new { error = "已有一个请求正在处理，请稍后再试。" }, statusCode: 429);
    var watch = Stopwatch.StartNew();
    try
    {
        var answer = await tutor.AskAsync(bank.Find(request.QuestionId!)!.Value, request, context.RequestAborted);
        return Results.Json(new { answer = answer.Text, model = answer.Model, reasoningEffort = settings.ReasoningEffort,
            elapsedMs = watch.ElapsedMilliseconds, questionId = request.QuestionId, step = request.Step,
            mode = request.Mode, source = request.Source, usage = answer.Usage, store = false });
    }
    catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
    { return Results.StatusCode(499); }
    catch (OperationCanceledException)
    { return Results.Json(new { error = "模型响应超时，请重试或换一道较短的推导。" }, statusCode: 504); }
    catch (TutorException e)
    { app.Logger.LogWarning("Tutor upstream failure: {Kind}", e.Kind); return Results.Json(new { error = e.Message }, statusCode: e.StatusCode); }
    catch (HttpRequestException)
    { return Results.Json(new { error = "无法连接模型接口。请检查网络和 AI_RESPONSES_URL 配置。" }, statusCode: 502); }
    catch (JsonException)
    { return Results.Json(new { error = "模型接口返回了无法解析的响应，请检查接口是否兼容 Responses API。" }, statusCode: 502); }
    finally { gate.Release(); }
});
app.Run();
