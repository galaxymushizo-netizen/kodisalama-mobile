# Generates KodiSalama Android launcher icons (legacy + adaptive) and splash screens
# — all showing the green key (funguo ya kijani).
Add-Type -AssemblyName System.Drawing
. (Join-Path $PSScriptRoot 'keyglyph.ps1')

$root = Split-Path -Parent $PSScriptRoot
$res = Join-Path $root 'android\app\src\main\res'

$tileLight = [System.Drawing.Color]::FromArgb(255, 240, 253, 244) # #f0fdf4
$tileDark  = [System.Drawing.Color]::FromArgb(255, 220, 252, 231) # #dcfce7
$keyLight  = [System.Drawing.Color]::FromArgb(255, 22, 163, 74)   # #16a34a
$keyDark   = [System.Drawing.Color]::FromArgb(255, 20, 83, 45)    # #14532d

function Get-TileBrush($rect) {
  return New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $rect, $tileLight, $tileDark, [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal)
}
function Get-KeyBrush($size) {
  return New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.RectangleF(0, 0, [float]$size, [float]$size)),
    $keyLight, $keyDark, [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal)
}

function New-Launcher {
  param([int]$size, [string]$path)
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.PixelOffsetMode = 'HighQuality'
  $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
  $tb = Get-TileBrush $rect
  $g.FillRectangle($tb, $rect)
  $tb.Dispose()
  $kb = Get-KeyBrush $size
  Draw-KeyGlyph $g ($size / 2.0) ($size / 2.0) ([double]($size * 0.58)) $kb -45
  $kb.Dispose()
  $g.Dispose()
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

function New-Foreground {
  # Adaptive icon: 108dp canvas, key kept inside the 66dp safe zone (0.42 of canvas)
  param([int]$size, [string]$path)
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.PixelOffsetMode = 'HighQuality'
  $g.Clear([System.Drawing.Color]::Transparent)
  $kb = Get-KeyBrush $size
  Draw-KeyGlyph $g ($size / 2.0) ($size / 2.0) ([double]($size * 0.42)) $kb -45
  $kb.Dispose()
  $g.Dispose()
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

function New-Splash {
  param([string]$srcPath, [string]$outPath)
  $src = [System.Drawing.Image]::FromFile($srcPath)
  $w = $src.Width
  $h = $src.Height
  $src.Dispose()
  $bmp = New-Object System.Drawing.Bitmap($w, $h)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.PixelOffsetMode = 'HighQuality'
  $rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
  $tb = Get-TileBrush $rect
  $g.FillRectangle($tb, $rect)
  $tb.Dispose()
  $kb = Get-KeyBrush ([Math]::Min($w, $h))
  Draw-KeyGlyph $g ($w / 2.0) ($h / 2.0) ([double]([Math]::Min($w, $h) * 0.34)) $kb -45
  $kb.Dispose()
  $g.Dispose()
  $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

$densities = @{
  'mipmap-mdpi'    = 48
  'mipmap-hdpi'    = 72
  'mipmap-xhdpi'   = 96
  'mipmap-xxhdpi'  = 144
  'mipmap-xxxhdpi' = 192
}
$fgScale = @{
  'mipmap-mdpi'    = 108
  'mipmap-hdpi'    = 162
  'mipmap-xhdpi'   = 216
  'mipmap-xxhdpi'  = 324
  'mipmap-xxxhdpi' = 432
}

foreach ($d in $densities.Keys) {
  $dir = Join-Path $res $d
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  New-Launcher $densities[$d] (Join-Path $dir 'ic_launcher.png')
  New-Launcher $densities[$d] (Join-Path $dir 'ic_launcher_round.png')
  New-Foreground $fgScale[$d] (Join-Path $dir 'ic_launcher_foreground.png')
  Write-Host "icons: $d"
}

# Splash screens (portrait + landscape) — keep each file's original dimensions
Get-ChildItem $res -Recurse -Filter 'splash.png' | ForEach-Object {
  $out = $_.FullName
  $tmp = "$out.tmp.png"
  New-Splash $_.FullName $tmp
  Move-Item -Force $tmp $out
  Write-Host "splash: $($_.Directory.Name)"
}

Write-Host 'done'
