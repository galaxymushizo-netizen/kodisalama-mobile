# Generates KodiSalama Android launcher icons (legacy + adaptive) and splash
# screens — all showing the house-and-keyhole mark, matching the PWA icons.
Add-Type -AssemblyName System.Drawing
. (Join-Path $PSScriptRoot 'housemark.ps1')

$root = Split-Path -Parent $PSScriptRoot
$res = Join-Path $root 'android\app\src\main\res'

# Adaptive-icon background. The mark's keyhole is painted in $script:KeyholeGreen,
# so the layer behind it has to be the same gradient the PWA tile uses or the
# foreground and background will visibly disagree.
function Get-BackdropBrush($rect) {
  # Bright end first — see the note in Draw-HouseMark: GDI+ BackwardDiagonal
  # starts at the top-right, and the launcher background must read the same way
  # as the adaptive icon's foreground would suggest.
  return New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $rect, $script:TileBright, $script:TileDark,
    [System.Drawing.Drawing2D.LinearGradientMode]::BackwardDiagonal)
}

function New-Launcher {
  # Legacy (pre-API-26) icons are plain squares that Android masks itself, so
  # the tile runs full-bleed with no corner radius.
  param([int]$size, [string]$path)
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  Draw-HouseMark -g $g -size ([double]$size) -rounded $false -radius 0 -scale 1.0
  $g.Dispose()
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

function New-Foreground {
  # Adaptive icon: a 108dp canvas whose usable area is a 66dp circle centred on
  # the icon. The mark reaches 199 units from its centre in 512-space, and
  # 33/108 * 512 = 156.7 units are safe, so scale must stay under 0.79.
  # 0.72 leaves roughly 9% slack for launcher-specific masks.
  param([int]$size, [string]$path)
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::Transparent)
  Draw-HouseGlyph -g $g -size ([double]$size) -scale 0.72
  $g.Dispose()
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

function New-Splash {
  # Re-paints a splash background with the launcher gradient and centres the
  # mark on it. Portrait and landscape keep whatever size they already had.
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
  $tb = Get-BackdropBrush $rect
  $g.FillRectangle($tb, $rect)
  $tb.Dispose()
  # The mark is ~342 units tall inside its 512 box, so scale 0.75 puts the house
  # at roughly half the shorter screen edge — the presence a splash logo needs,
  # and the same fraction the adaptive launcher icon uses.
  Draw-HouseGlyph -g $g -size ([double]([Math]::Min($w, $h))) -scale 0.75 `
    -cx ($w / 2.0) -cy ($h / 2.0)
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
