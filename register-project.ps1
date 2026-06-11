# Register a local project in Dev Monitor and assign a stable port.
#
# Example:
# pwsh D:\文档\monitor-app\register-project.ps1 `
#   -Path "D:\文档\我的新项目" `
#   -Name "我的新项目" `
#   -Repo "owner/repo"

param(
    [Parameter(Mandatory = $true)]
    [string]$Path,

    [string]$Name,
    [string]$Description = "",
    [string]$Repo = "",
    [string]$RepoUrl = "",
    [int]$PreferredPort = 0,
    [int]$StartPort = 3001,
    [string]$MonitorPath = "/api/monitor"
)

$MonitorRoot = "D:\文档\monitor-app"
$ProjectsFile = Join-Path $MonitorRoot "projects.json"

function Convert-ToSlug([string]$Value) {
    $slug = $Value.ToLowerInvariant() -replace '[^a-z0-9]+', '-'
    $slug = $slug.Trim('-')
    if (-not $slug) {
        $slug = "project-" + (Get-Date -Format "yyyyMMddHHmmss")
    }
    return $slug
}

function Test-PortInUse([int]$Port) {
    [bool](Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
}

function Get-NextPort($Projects, [int]$Preferred, [int]$Start) {
    $used = @{}
    foreach ($project in $Projects) {
        if ($project.devPort) {
            $used[[int]$project.devPort] = $true
        }
    }

    if ($Preferred -gt 0 -and -not $used.ContainsKey($Preferred) -and -not (Test-PortInUse $Preferred)) {
        return $Preferred
    }

    $port = $Start
    while ($used.ContainsKey($port) -or (Test-PortInUse $port)) {
        $port += 1
    }
    return $port
}

function Get-PackageName([string]$ProjectPath) {
    $packageFile = Join-Path $ProjectPath "package.json"
    if (-not (Test-Path $packageFile)) {
        return $null
    }
    try {
        return (Get-Content -LiteralPath $packageFile -Raw | ConvertFrom-Json).name
    } catch {
        return $null
    }
}

if (-not (Test-Path $Path)) {
    Write-Host "Project path not found: $Path" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $ProjectsFile)) {
    Write-Host "projects.json not found: $ProjectsFile" -ForegroundColor Red
    exit 1
}

$resolvedPath = (Resolve-Path -LiteralPath $Path).Path
$projects = @(Get-Content -LiteralPath $ProjectsFile -Raw | ConvertFrom-Json)
$packageName = Get-PackageName $resolvedPath

if (-not $Name) {
    $Name = if ($packageName) { $packageName } else { Split-Path -Leaf $resolvedPath }
}

$baseSlug = Convert-ToSlug $(if ($packageName) { $packageName } else { $Name })
$slug = $baseSlug
$suffix = 2
while ($projects | Where-Object { $_.slug -eq $slug }) {
    $slug = "$baseSlug-$suffix"
    $suffix += 1
}

$existing = $projects | Where-Object { $_.localPath -eq $resolvedPath } | Select-Object -First 1
if ($existing) {
    Write-Host "Project already registered: $($existing.name) ($($existing.slug))" -ForegroundColor Yellow
    Write-Host "Monitor: http://localhost:3334/project/$($existing.slug)" -ForegroundColor Cyan
    exit 0
}

$port = Get-NextPort -Projects $projects -Preferred $PreferredPort -Start $StartPort
$apiUrl = "http://localhost:$port$MonitorPath"
if ($Repo -and -not $RepoUrl) {
    $RepoUrl = "https://github.com/$Repo"
}

$entry = [ordered]@{
    slug = $slug
    name = $Name
    description = $Description
    repo = $Repo
    apiUrl = $apiUrl
    repoUrl = $RepoUrl
    localPath = $resolvedPath
    devPort = $port
    devCommand = "npm exec next -- dev -p {port} --hostname 0.0.0.0"
    monitorPath = $MonitorPath
}

$updated = @($projects) + [pscustomobject]$entry
$updated | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $ProjectsFile -Encoding UTF8

Write-Host "Registered project:" -ForegroundColor Green
Write-Host "- Name:    $Name"
Write-Host "- Slug:    $slug"
Write-Host "- Port:    $port"
Write-Host "- API:     $apiUrl"
Write-Host "- Path:    $resolvedPath"
Write-Host ""
Write-Host "Next step: ensure this project provides $MonitorPath, then run:" -ForegroundColor Yellow
Write-Host "pwsh D:\文档\monitor-app\start-all.ps1" -ForegroundColor Cyan
