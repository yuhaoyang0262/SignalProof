using System.Net;
using System.Text;
using System.Text.Json;
using SignalProof.Tutor;

int assertions = 0;
void Check(bool condition, string label) { if (!condition) throw new Exception(label); assertions++; }
JsonElement Json(string text) => JsonDocument.Parse(text).RootElement.Clone();
void Reject(string json, string expected)
{
    try { ResponseReader.Parse(Json(json), "gpt-6-astra"); throw new Exception("Expected rejection"); }
    catch (TutorException e) { Check(e.Kind == expected, expected); }
}
var root = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../../"));
var bank = new QuestionBank(Path.Combine(root, "data/question-bank.json"));
Check(bank.Questions.Count == 200, "200 questions");
foreach (var q in bank.Questions)
{
    foreach (var source in new[] { "attempt", "reference" })
    {
        var rows = QuestionBank.GetSteps(q, source);
        var request = new TutorRequest(q.GetProperty("id").GetString(), rows.GetArrayLength(), "explain", source);
        Check(bank.Validate(request) is null, "valid last line");
        Check(bank.Validate(request with { Step = rows.GetArrayLength() + 1 }) is not null, "reject invalid line");
        Check(Json(TutorPrompt.Build(q, request)).GetProperty("steps").GetArrayLength() == rows.GetArrayLength(), "prompt rows");
    }
}
Check(bank.Validate(new("missing", 1, "hint", "attempt")) is not null, "unknown question");
Check(bank.Validate(new("Q101", 0, "hint", "attempt")) is not null, "zero line");
Check(bank.Validate(new("Q101", 1, "other", "attempt")) is not null, "unknown mode");
Check(bank.Validate(new("Q101", 1, "hint", "other")) is not null, "unknown source");
var question = bank.Find("Q101")!.Value;
var ask = new TutorRequest("Q101", 2, "explain", "attempt");
var prompt = Json(TutorPrompt.Build(question, ask));
Check(prompt.GetProperty("reference").GetProperty("correctedSteps")[1].GetString()!.Contains("+"), "corrected sign");
Check(Json(TutorPrompt.Build(question, ask with { Mode = "hint" })).GetProperty("reference").ValueKind == JsonValueKind.Null, "hint excludes oracle");
Check(QuestionBank.GetSteps(bank.Questions.First(q=>!q.TryGetProperty("solutionSteps",out _) && q.GetProperty("expected").GetString()=="wrong"),"reference")[0].ValueKind == JsonValueKind.Object, "baseline reference uses solution formulas");
const string completed = """{"status":"completed","model":"gpt-6-astra","output":[{"type":"reasoning","summary":[]},{"type":"message","content":[{"type":"output_text","text":"解释"},{"type":"output_text","text":"完成"}]}],"usage":{"total_tokens":20}}""";
var parsed = ResponseReader.Parse(Json(completed), "fallback");
Check(parsed.Text == "解释\n完成" && parsed.Model == "gpt-6-astra", "message text and actual model");
Check(parsed.Usage?.GetProperty("total_tokens").GetInt32() == 20, "usage");
Reject("""{"status":"incomplete","output":[]}""", "incomplete");
Reject("""{"status":"completed","output":[{"type":"message","content":[{"type":"refusal"}]}]}""", "refusal");
Reject("""{"status":"completed","output":[{"type":"message","content":[{}]}]}""", "empty");
var settings = new TutorSettings("https://example.invalid/responses", "test-only-key", "gpt-6-astra", "high", "test-actor", 5080);
var handler = new FakeHandler(async request =>
{
    Check(request.Headers.Authorization?.Parameter == "test-only-key", "server bearer");
    Check(request.Headers.GetValues("x-openai-actor-authorization").Single() == "test-actor", "actor header");
    var body = Json(await request.Content!.ReadAsStringAsync());
    Check(body.GetProperty("model").GetString() == "gpt-6-astra", "requested model");
    Check(body.GetProperty("reasoning").GetProperty("effort").GetString() == "high", "high reasoning");
    Check(!body.GetProperty("store").GetBoolean() && body.GetProperty("stream").GetBoolean(), "store false and streaming");
    Check(!body.ToString().Contains("test-only-key"), "no credential in model prompt");
    return new(HttpStatusCode.OK) { Content = new StringContent("event: response.created\ndata: {\"type\":\"response.created\"}\n\ndata: {\"type\":\"response.completed\",\"response\":" + completed + "}\n\n", Encoding.UTF8, "text/event-stream") };
});
var answer = await new TutorClient(new HttpClient(handler),settings).AskAsync(question,ask,default);
Check(answer.Text == parsed.Text, "SSE completion");
foreach (var scenario in new[] { "unauthorized", "premature", "failed", "json" })
{
    var client = new TutorClient(new HttpClient(new FakeHandler(_ => Task.FromResult(scenario switch
    {
        "unauthorized" => new HttpResponseMessage(HttpStatusCode.Unauthorized) { Content = new StringContent("sensitive-upstream-echo") },
        "premature" => new(HttpStatusCode.OK) { Content = new StringContent("data: [DONE]\n\n", Encoding.UTF8, "text/event-stream") },
        "failed" => new(HttpStatusCode.OK) { Content = new StringContent("data: {\"type\":\"response.failed\"}\n\n", Encoding.UTF8, "text/event-stream") },
        _ => new(HttpStatusCode.OK) { Content = new StringContent(completed, Encoding.UTF8, "application/json") }
    }))),settings);
    try { var result=await client.AskAsync(question,ask,default); Check(scenario=="json" && result.Text==parsed.Text,"JSON fallback"); }
    catch(TutorException e) { Check(scenario!="json" && !e.Message.Contains("sensitive-upstream-echo"),"sanitized upstream failures"); }
}
Console.WriteLine($"PASS: {assertions} tutor assertions (mock upstream, no live API calls).");

sealed class FakeHandler(Func<HttpRequestMessage, Task<HttpResponseMessage>> send) : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) => send(request);
}
