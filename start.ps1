# 一键启动：projects.json 中登记的项目 + Dev Monitor
# 用法: pwsh D:\文档\monitor-app\start.ps1
#       npm run dev  (等价)

param(
    [int]$MonitorPort = 3334,
    [string]$HostName = "0.0.0.0"
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
        Write-Host "  $Name already running on port $Port" -ForegroundColor Yellow
        return
    }

    if (-not (Test-Path $Path)) {
        Write-Host "  $Name path not found: $Path" -ForegroundColor Red
        return
    }

    if (-not (Test-Path (Join-Path $Path "node_modules"))) {
        Write-Host "  Installing dependencies for $Name..." -ForegroundColor Yellow
        Push-Location $Path
        npm install
        Pop-Location
    }

    $command = $CommandTemplate.Replace("{port}", [string]$Port)

    # 注入 GitHub Token（被监控项目可能用 gh CLI 或 API）
    $ghToken = ""
    try { $ghToken = gh auth token 2>$null } catch {}

    $wrappedCommand = if ($ghToken) {
        "`$env:GITHUB_TOKEN='$ghToken'; Set-Location `"$Path`"; $command"
    } else {
        "Set-Location `"$Path`"; $command"
    }

    Start-Process -FilePath $PowerShellExe `
        -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $wrappedCommand `
        -WindowStyle Hidden

    Write-Host "  Starting $Name on port $Port... $(if ($ghToken) { '(with GH token)' } else { '(no GH token)' })" -ForegroundColor Green
}

# ─── Phase 1: 自动启动所有被监控项目 ───
Write-Host ""
Write-Host "====== Auto-starting monitored projects ======" -ForegroundColor Green
$lanIp = Get-LanIp
$startedCount = 0

if (Test-Path $ProjectsFile) {
    $projects = Get-Content -LiteralPath $ProjectsFile -Raw | ConvertFrom-Json

    foreach ($project in $projects) {
        if ($project.localPath -and $project.devPort -and $project.devCommand) {
            Start-ProjectApp -Path $project.localPath -Port ([int]$project.devPort) -Name $project.name -CommandTemplate $project.devCommand
            $startedCount++
        }
    }
}

Write-Host "Projects with auto-start config: $startedCount" -ForegroundColor Gray
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""

# ─── Phase 2: 启动 Monitor App ───
if (-not (Test-Path (Join-Path $MonitorPath "node_modules"))) {
    Write-Host "Installing monitor-app dependencies..." -ForegroundColor Yellow
    Set-Location $MonitorPath
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "npm install failed!" -ForegroundColor Red
        exit 1
    }
}

Set-Location $MonitorPath

Start-Sleep -Seconds 8

Write-Host ""
Write-Host "====== Dev Monitor ======" -ForegroundColor Green
Write-Host "Computer URL: http://localhost:$MonitorPort" -ForegroundColor Cyan
if ($lanIp) {
    Write-Host "Phone URL:    http://$lanIp`:$MonitorPort" -ForegroundColor Cyan
    Write-Host "Phone and computer must be on the same Wi-Fi." -ForegroundColor Gray
}
Write-Host ""

if ($projects) {
    Write-Host "Registered projects:" -ForegroundColor Gray
    foreach ($project in $projects) {
        if ($project.devPort) {
            Write-Host "  - $($project.name): http://localhost:$($project.devPort)" -ForegroundColor Gray
        }
    }
}
Write-Host "=========================" -ForegroundColor Green
Write-Host ""

npm exec next -- dev -p $MonitorPort --hostname $HostName
