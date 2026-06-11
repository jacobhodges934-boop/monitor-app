# 启动多项目开发监控面板
# 用法: pwsh start-monitor.ps1
# 默认端口 3334，可被同一局域网手机访问

param(
    [int]$Port = 3334,
    [string]$HostName = "0.0.0.0"
)

$MONITOR = "D:\文档\monitor-app"
$LAN_IP = (Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object {
        $_.IPAddress -notlike "127.*" -and
        $_.IPAddress -notlike "169.254.*" -and
        $_.PrefixOrigin -ne "WellKnown"
    } |
    Select-Object -First 1 -ExpandProperty IPAddress)

if (-not (Test-Path (Join-Path $MONITOR "node_modules"))) {
    Write-Host "Installing monitor-app dependencies..." -ForegroundColor Yellow
    Set-Location $MONITOR
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "npm install failed!" -ForegroundColor Red
        exit 1
    }
}

Set-Location $MONITOR
Write-Host "====== Dev Monitor ======" -ForegroundColor Green
Write-Host "Computer URL: http://localhost:$Port" -ForegroundColor Cyan
if ($LAN_IP) {
    Write-Host "Phone URL:    http://$LAN_IP`:$Port" -ForegroundColor Cyan
}
Write-Host "=========================" -ForegroundColor Green
Write-Host ""
Write-Host "Monitored projects config: D:\文档\monitor-app\projects.json" -ForegroundColor Gray
Write-Host ""

npm exec next -- dev -p $Port --hostname $HostName
