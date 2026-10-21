# Verifies the launcher icons, fonts and notification icon inside the built APK.
# Renders the house mark as ASCII so it can be eyeballed without an emulator.
#   # = the white house, o = the green keyhole, : = the green tile, . = nothing
param(
  [string]$Apk = "$PSScriptRoot\..\android\app\build\outputs\apk\debug\app-debug.apk"
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.Drawing

if (!(Test-Path $Apk)) { throw "APK not found: $Apk" }

$zip = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path $Apk).Path)

function Get-Entry([string]$name) {
  return $zip.Entries | Where-Object { $_.FullName -eq $name } | Select-Object -First 1
}

function Show-Grid([string]$entryName, [int]$n) {
  $e = Get-Entry $entryName
  if ($null -eq $e) { Write-Host "  MISSING: $entryName"; return }
  $tmp = Join-Path ([System.IO.Path]::GetTempPath()) ('kodi_' + [System.IO.Path]::GetRandomFileName() + '.png')
  [System.IO.Compression.ZipFileExtensions]::ExtractToFile($e, $tmp, $true)
  $b = $null
  try { $b = New-Object System.Drawing.Bitmap($tmp) } catch { $b = $null }
  if ($null -eq $b) { Write-Host "  FAILED TO DECODE: $entryName"; Remove-Item $tmp -Force -ErrorAction SilentlyContinue; return }

  Write-Host "  $entryName  ($($b.Width)x$($b.Height))"
  for ($y = 0; $y -lt $n; $y++) {
    $line = ''
    for ($x = 0; $x -lt $n; $x++) {
      $px = [int]($x * $b.Width / $n)
      $py = [int]($y * $b.Height / $n)
      $p = $b.GetPixel($px, $py)
      if ($p.A -lt 40) { $line += '.' }
      elseif ($p.R -ge 200 -and $p.G -ge 200 -and $p.B -ge 200) { $line += '#' } # white house
      elseif ($p.R -lt 60 -and $p.G -lt 160) { $line += 'o' }                    # green keyhole
      else { $line += ':' }                                                       # green tile
    }
    Write-Host $line
  }
  $b.Dispose()
  Remove-Item $tmp -Force -ErrorAction SilentlyContinue
}

Write-Host "APK: $Apk"
Write-Host "Size: $((Get-Item $Apk).Length) bytes"
Write-Host "Modified: $((Get-Item $Apk).LastWriteTime)"

Write-Host ''
Write-Host '--- required entries ---'
foreach ($name in @(
    'res/mipmap-anydpi-v26/ic_launcher.xml',
    'res/drawable/ic_launcher_bg_gradient.xml',
    'res/drawable/ic_stat_house.xml',
    'assets/public/fonts/pjs-latin.woff2',
    'assets/public/fonts/fonts.css',
    'assets/public/symbol/tz-flag-320.png',
    'assets/public/symbol/tz-flag-640.png',
    'assets/public/index.html'
  )) {
  $hit = Get-Entry $name
  if ($null -eq $hit) { Write-Host "  MISSING  $name" } else { Write-Host "  ok       $name ($($hit.Length) B)" }
}

Write-Host ''
Write-Host '--- adaptive icon manifest (compiled AXML, decoded below) ---'
$ax = Get-Entry 'res/mipmap-anydpi-v26/ic_launcher.xml'
if ($null -ne $ax) {
  # aapt2 compiles XML to binary; the drawable ids are what matter here.
  $bytes = New-Object byte[] $ax.Length
  $s = $ax.Open()
  [void]$s.Read($bytes, 0, $ax.Length)
  $s.Dispose()
  $ascii = -join ($bytes | ForEach-Object { if ($_ -ge 32 -and $_ -lt 127) { [char]$_ } else { '.' } })
  Write-Host "  $($ax.Length) B binary; strings: $ascii"
}
Write-Host ''
Write-Host '--- source of truth (res folder) ---'
foreach ($f in @(
    'android\app\src\main\res\mipmap-anydpi-v26\ic_launcher.xml',
    'android\app\src\main\res\drawable\ic_launcher_bg_gradient.xml',
    'android\app\src\main\res\values\ic_launcher_background.xml'
  )) {
  $p = Join-Path $PSScriptRoot "..\$f"
  if (Test-Path $p) { Write-Host "### $f"; Get-Content $p -Raw }
}

Write-Host '--- legacy launcher (green tile + white house) ---'
Show-Grid 'res/mipmap-xxxhdpi-v4/ic_launcher.png' 44

Write-Host ''
Write-Host '--- adaptive foreground (house + keyhole, transparent bg) ---'
Show-Grid 'res/mipmap-xxxhdpi-v4/ic_launcher_foreground.png' 44

$zip.Dispose()
