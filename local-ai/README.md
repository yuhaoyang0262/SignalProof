# AI 助教 · 本地演示

ASP.NET Core 同时提供页面与 `/api/tutor`，仅监听本机 `localhost:5080`。页面复用项目的 200 道题和 KaTeX，支持原推导 / 参考推导、逐行选择、解释和渐进提示。默认请求 `gpt-6-astra`，`reasoning.effort = high`，`store = false`。

## 启动

1. 安装 [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)。
2. 将本目录 `.env.example` 复制为 `.env`，填写自己的 `AI_API_KEY`。已有 `.env` 时保留它。`AI_RESPONSES_URL` 是完整的 Responses 路径；环境变量优先于文件。
3. macOS 双击仓库根目录 `start-ai.command`；Windows 双击 `start-ai.cmd`。也可以在本目录运行 `dotnet run --project SignalProof.Tutor.csproj`。
4. 浏览器打开 <http://localhost:5080>，或点击 GitHub Pages 的 **AI 助教 · 本地演示**。

答辩建议先选「余弦的双边冲激谱」第 2 行，点击「解释这一步」；再切换参考推导。页面显示接口实际返回的模型、耗时及 token 用量（接口提供时）。没有配置 Key 时仍可浏览题目，但不能调用模型。

`localhost` 始终是打开浏览器的那台电脑。换电脑演示需在那台电脑安装 SDK、配置 `.env` 并启动服务。模型调用需要联网；GitHub Pages 本身只提供入口，不运行 C#。关闭终端或按 Ctrl+C 停止服务。

## 配置与边界

- Key 和额外认证头只由 C# 发送给指定模型接口，浏览器不接收凭据。`.env` 已忽略，不会提交或复制到编译 / 发布目录。
- 使用 Responses 流式协议，收到完整 `response.completed` 后显示答案；超时、限流、拒绝或未完成会显示错误，不伪装成成功回答。可停止请求，切换题目会取消旧请求。
- 上游认证 / 错误正文不会转发到页面或日志。API 限制本机来源并要求同源自定义请求头，同一时间处理一个问题。
- 原推导可能有错。参考公式来自题库；模型解答供学习参考，不替代原数学验证引擎。提示模式不发送参考答案标签。
- `store:false` 是发送给服务提供方的请求选项，不是对第三方留存政策的保证。
- 其他 Codex 配置（review_model、model_catalog_json、features 等）不属于本应用配置。

## 检查

```sh
dotnet build local-ai/SignalProof.Tutor.csproj
dotnet run --project local-ai/tests/SignalProof.Tutor.Checks.csproj
```

浏览器检查（服务启动后、已安装 Playwright / Chrome）：

```sh
CHROME_EXECUTABLE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' node tools/check_tutor.cjs
```

默认浏览器测试用显式模拟响应验证交互和错误分支，不产生模型费用。真实调用由 `TUTOR_LIVE=1` 启用，会使用本机配置的凭据发起一次解释请求。
