<#
  Antiks Stories — one-time setup for a video project folder (Windows, PowerShell 5.1+).

  Usage:
    powershell -ExecutionPolicy Bypass -File <path-to-skill>\scripts\setup.ps1 -Project "C:\Videos\Antiks"
    Add -Install to let it install missing programs with winget (Node.js, FFmpeg, Python 3.12, eSpeak NG).

  What it does:
    1. Checks the programs it needs (and installs them with -Install)
    2. Copies this skill into <Project>\.claude\skills\antiks-stories (if it isn't there already)
    3. Installs the video renderer (puppeteer-core) in <Project>\node_modules
    4. Creates the Kokoro voice environment in <Project>\tools\kokoro-venv (~1 GB download)
    5. Generates the starter sound-effects kit, creates <Project>\videos, adds pyrefly.toml
    6. Downloads the Kokoro voice model with a short test (needs ~2 GB free memory)
#>
param(
  [string]$Project = (Get-Location).Path,
  [switch]$Install,
  [switch]$SkipVoiceTest
)
# 'Continue' on purpose: in PowerShell 5.1, 'Stop' turns harmless warnings from pip/npm/python into fatal errors.
# Failures are detected with $LASTEXITCODE instead.
$ErrorActionPreference = 'Continue'
$SkillSrc = Split-Path -Parent $PSScriptRoot
$Project = [System.IO.Path]::GetFullPath($Project)

function Say($msg, $color = 'Cyan') { Write-Host $msg -ForegroundColor $color }
function Has($cmd) { return [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }
function Refresh-Path { $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User') }

Say "`n== Antiks Stories setup ==" 'Yellow'
Say "Project folder: $Project"
New-Item -ItemType Directory -Force $Project | Out-Null

# ---------- 1. prerequisites ----------
Say "`n[1/6] Checking programs..."
$espeak = 'C:\Program Files\eSpeak NG\espeak-ng.exe'
$edge = @('C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe', 'C:\Program Files\Microsoft\Edge\Application\msedge.exe') | Where-Object { Test-Path $_ } | Select-Object -First 1

$py = $null
if (Has 'py') { try { & py -3.12 --version *> $null; if ($LASTEXITCODE -eq 0) { $py = @('py', '-3.12') } } catch {} }
if (-not $py -and (Has 'python')) {
  $v = (& python --version 2>&1) -replace 'Python ', ''
  if ($v -match '^3\.(10|11|12)\.') { $py = @('python') }
}

$missing = @()
if (-not (Has 'node')) { $missing += @{ name = 'Node.js 22+'; id = 'OpenJS.NodeJS.LTS' } }
elseif ([int]((& node --version) -replace 'v(\d+).*', '$1') -lt 22) { $missing += @{ name = 'Node.js 22+ (yours is older)'; id = 'OpenJS.NodeJS.LTS' } }
if (-not (Has 'ffmpeg')) { $missing += @{ name = 'FFmpeg'; id = 'Gyan.FFmpeg' } }
if (-not $py) { $missing += @{ name = 'Python 3.10-3.12 (Kokoro does not support 3.13+)'; id = 'Python.Python.3.12' } }
if (-not (Test-Path $espeak)) { $missing += @{ name = 'eSpeak NG (fixes Filipino name pronunciation)'; id = 'eSpeak-NG.eSpeak-NG' } }
if (-not $edge) { Say '  Microsoft Edge not found - it is used to draw the video frames. Install Edge first.' 'Red'; exit 1 }

if ($missing.Count) {
  Say '  Missing:' 'Red'
  $missing | ForEach-Object { Say ("   - {0}   (winget install --id {1} -e)" -f $_.name, $_.id) 'Red' }
  if (-not $Install) { Say "`n  Install them (or re-run with -Install), close and reopen PowerShell, then run setup again." 'Yellow'; exit 1 }
  foreach ($m in $missing) {
    Say "  Installing $($m.name)... (approve the Windows prompt if one appears)"
    winget install --id $m.id -e --accept-source-agreements --accept-package-agreements --silent
  }
  Refresh-Path
  Say '  Installed. If a later step says a command is not found, close PowerShell, open a new one and run setup again.' 'Yellow'
  if (-not $py -and (Has 'py')) { $py = @('py', '-3.12') }
}
Say '  OK: Node.js, FFmpeg, Python, eSpeak NG, Edge' 'Green'

# ---------- 2. skill into the project ----------
Say "`n[2/6] Placing the skill in the project..."
$SkillDst = Join-Path $Project '.claude\skills\antiks-stories'
if ([System.IO.Path]::GetFullPath($SkillSrc).TrimEnd('\') -ne [System.IO.Path]::GetFullPath($SkillDst).TrimEnd('\')) {
  New-Item -ItemType Directory -Force $SkillDst | Out-Null
  robocopy $SkillSrc $SkillDst /E /NFL /NDL /NJH /NJS /NP /XD .git | Out-Null
  Say "  Copied to $SkillDst" 'Green'
} else { Say '  Already running from the project - nothing to copy.' 'Green' }

# ---------- 3. renderer ----------
Say "`n[3/6] Installing the video renderer (puppeteer-core)..."
Push-Location $Project
try {
  if (-not (Test-Path 'package.json')) { npm init -y | Out-Null }
  npm install puppeteer-core@23.11.1 --silent
  if ($LASTEXITCODE -ne 0) { throw 'npm install failed' }
  Say '  OK' 'Green'

  # ---------- 4. Kokoro voice environment ----------
  Say "`n[4/6] Creating the Kokoro voice environment (about 1 GB, takes a while)..."
  $venvPy = Join-Path $Project 'tools\kokoro-venv\Scripts\python.exe'
  if (-not (Test-Path $venvPy)) {
    New-Item -ItemType Directory -Force (Join-Path $Project 'tools') | Out-Null
    $pyExe = $py[0]; $pyArgs = @(); if ($py.Count -gt 1) { $pyArgs = $py[1..($py.Count - 1)] }
    & $pyExe @pyArgs -m venv (Join-Path $Project 'tools\kokoro-venv')
  }
  & $venvPy -m pip install --quiet --upgrade pip
  # --no-compile + CPU-only torch keep memory use low (prevents MemoryError on 4-8 GB PCs)
  & $venvPy -m pip install --quiet --no-compile torch --index-url https://download.pytorch.org/whl/cpu
  & $venvPy -m pip install --quiet --no-compile 'kokoro>=0.9.4' soundfile
  if ($LASTEXITCODE -ne 0) { throw 'pip install failed (low memory? close apps and re-run)' }
  Say '  OK' 'Green'

  # ---------- 5. project files + sound kit ----------
  Say "`n[5/6] Project folders and starter sound kit..."
  New-Item -ItemType Directory -Force (Join-Path $Project 'videos') | Out-Null
  $pyre = Join-Path $Project 'pyrefly.toml'
  if (-not (Test-Path $pyre)) {
    "# Keep editor Python checkers away from the big Kokoro environment (saves GBs of RAM)`nproject-excludes = [`"tools/**`", `"**/node_modules/**`"]" | Out-File -Encoding utf8 $pyre
  }
  node (Join-Path $SkillDst 'scripts\make-sfx.js') | Out-Null
  Say '  OK: videos\ folder, pyrefly.toml, 19 sound effects' 'Green'

  # ---------- 6. voice model download + test ----------
  Say "`n[6/6] Downloading the voice model and testing it..."
  if ($SkipVoiceTest) { Say '  Skipped (-SkipVoiceTest). The model downloads on first use.' 'Yellow' }
  else {
    $freeGB = (Get-CimInstance Win32_OperatingSystem).FreeVirtualMemory / 1MB
    if ($freeGB -lt 2) {
      Say ("  Only {0:N1} GB memory free - close some apps (browser tabs, other editors) and re-run setup to test the voice." -f $freeGB) 'Yellow'
    } else {
      $env:PYTHONWARNINGS = 'ignore'
      & $venvPy -c "from kokoro import KPipeline; p=KPipeline(lang_code='b', repo_id='hexgrad/Kokoro-82M'); a=[r for r in p('Antiks Stories is ready.', voice='bm_george')]; print('voice OK')" 2>$null
      if ($LASTEXITCODE -eq 0) { Say '  Voice test OK (bm_george)' 'Green' } else { Say '  Voice test failed - usually low memory. Close apps and re-run setup.' 'Yellow' }
    }
  }
} finally { Pop-Location }

$brandFile = Join-Path $SkillDst 'data\brand.json'
if ((Test-Path $brandFile) -and ((Get-Content -Raw $brandFile) -match '"name":\s*"Antiks Stories"')) {
  Say "`nBRANDING: this project still uses the 'Antiks Stories' brand (name + host design are reserved by the author)." 'Yellow'
  Say "If this is your own channel, edit: $brandFile" 'Yellow'
  Say "(channel name, tagline, handle, accent colour, host cap/tassel/badge - see README > Make it yours)" 'Yellow'
}

Say "`n== Setup complete ==" 'Yellow'
Say "Next: open the folder '$Project' in VS Code (or run 'claude' in it), start a NEW chat and type:"
Say '   /antiks-stories' 'Green'
