#!/bin/zsh
set -e
cd "$(dirname "$0")/local-ai"
if command -v dotnet >/dev/null 2>&1; then
  DOTNET_BIN="$(command -v dotnet)"
elif [[ -x /usr/local/share/dotnet/dotnet ]]; then
  DOTNET_BIN=/usr/local/share/dotnet/dotnet
else
  echo '请先安装 .NET 10 SDK：https://dotnet.microsoft.com/download/dotnet/10.0'
  read -r '?按回车退出'; exit 1
fi
echo 'SignalProof AI 助教：http://localhost:5080（按 Ctrl+C 停止）'
"$DOTNET_BIN" run --project SignalProof.Tutor.csproj --no-launch-profile
