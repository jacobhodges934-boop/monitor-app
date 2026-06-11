# 一键启动：projects.json 中登记的项目 + Dev Monitor
# 用法: pwsh D:\文档\monitor-app\start-all.ps1

param(
    [int]$MonitorPort = 3334
)

$MonitorPath = "D:\文档\monitor-app"
$ProjectsFile = Join-Path $MonitorPath "projects.json"
$PowerShellExe = (Get-Process -Id $PID).Path

function Get-LanIp {
    Get-NetIPAddress -AddressFamily IPv4 |
        Where-Object {
            $_.IPAddress -notlike "127.*" -and
            $_.IPAddress -notlike "169.254.*" -and
            $_.PrefixOrigin -ne "WellKnown"
        } |
        Select-Object -First 1 -ExpandProperty IPAddress
}

function Test-Port([int]$Port) {
    [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Start-ProjectApp([string]$Path, [int]$Port, [string]$Name, [string]$CommandTemplate) {
    if (Test-Port $Port) {
        Write-Host "$Name already running on port $Port" -ForegroundColor Yellow
        return
    }

    if (-not (Test-Path $Path)) {
        Write-Host "$Name path not found: $Path" -ForegroundColor Red
        return
    }

    if (-not (Test-Path (Join-Path $Path "node_modules"))) {
        Write-Host "Installing dependencies for $Name..." -ForegroundColor Yellow
        Push-Location $Path
        npm install
        Pop-Location
    }

    $command = $CommandTemplate.Replace("{port}", [string]$Port)
    Start-Process -FilePath $PowerShellExe `
        -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "Set-Location `"$Path`"; $command" `
        -WindowStyle Hidden

    Write-Host "Starting $Name on port $Port..." -ForegroundColor Green
}

$lanIp = Get-LanIp
$projects = Get-Content -LiteralPath $ProjectsFile -Raw | ConvertFrom-Json

foreach ($project in $projects) {
    if ($project.localPath -and $project.devPort -and $project.devCommand) {
        Start-ProjectApp -Path $project.localPath -Port ([int]$project.devPort) -Name $project.name -CommandTemplate $project.devCommand
    }
}

Start-ProjectApp -Path $MonitorPath -Port $MonitorPort -Name "Dev Monitor" -CommandTemplate "npm exec next -- dev -p {port} --hostname 0.0.0.0"

Start-Sleep -Seconds 8

Write-Host ""
Write-Host "====== Ready ======" -ForegroundColor Green
Write-Host "Computer monitor: http://localhost:$MonitorPort" -ForegroundColor Cyan
if ($lanIp) {
    Write-Host "Phone monitor:    http://$lanIp`:$MonitorPort" -ForegroundColor Cyan
    Write-Host "Phone and computer must be on the same Wi-Fi." -ForegroundColor Gray
}
Write-Host ""
Write-Host "Registered projects:" -ForegroundColor Gray
foreach ($project in $projects) {
    if ($project.devPort) {
        Write-Host "- $($project.name): http://localhost:$($project.devPort)" -ForegroundColor Gray
        if ($lanIp) {
            Write-Host "  phone: http://$lanIp`:$($project.devPort)" -ForegroundColor DarkGray
        }
    }
}
Write-Host "===================" -ForegroundColor Green
