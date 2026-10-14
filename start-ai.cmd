@echo off
chcp 65001 >nul
cd /d "%~dp0local-ai"
where dotnet >nul 2>nul
if errorlevel 1 (
  echo 请先安装 .NET 10 SDK: https://dotnet.microsoft.com/download/dotnet/10.0
  pause
  exit /b 1
)
echo SignalProof AI 助教: http://localhost:5080 - Ctrl+C 停止
dotnet run --project SignalProof.Tutor.csproj --no-launch-profile
pause
