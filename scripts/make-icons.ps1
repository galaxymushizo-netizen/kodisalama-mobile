# Generates KodiSalama PWA icons (192 / 512 / maskable / apple-touch / favicon)
# All of them show a green key (funguo ya kijani) on a light mint tile.
Add-Type -AssemblyName System.Drawing
. (Join-Path $PSScriptRoot 'keyglyph.ps1')

$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root 'public'
$iconDir = Join-Path $out 'icons'
New-Item -ItemType Directory -Force -Path $iconDir | Out-Null

# Same palette as scripts/make-android-assets.ps1 — keep the two in step so the
# PWA icon and the Android launcher icon are visually identical.
$tileLight = [System.Drawing.Color]::FromArgb(255, 220, 252, 231) # #dcfce7
$tileDark  = [System.Drawing.Color]::FromArgb(255, 134, 239, 172) # #86efac
$keyLight = [System.Drawing.Color]::FromArgb(255, 21, 128, 61)   # #15803d
$keyDark  = [System.Drawing.Color]::FromArgb(255, 20, 83, 45)    # #14532d

function New-KeyTile {
  param([int]$size, [bool]$rounded, [double]$keyLen, [double]$angle)
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.TextRenderingHint = 'AntiAliasGridFit'
  $g.PixelOffsetMode = 'HighQuality'
  $g.Clear([System.Drawing.Color]::Transparent)

  $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)

  if ($rounded) {
    $radius = [int]($size * 0.20)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $radius * 2
    $path.AddArc($rect.X, $rect.Y, $d, $d, 180, 90)
    $path.AddArc($rect.Right - $d, $rect.Y, $d, $d, 270, 90)
    $path.AddArc($rect.Right - $d, $rect.Bottom - $d, $d, $d, 0, 90)
    $path.AddArc($rect.X, $rect.Bottom - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
      $rect, $tileLight, $tileDark, [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal)
    $g.FillPath($brush, $path)
    $brush.Dispose(); $path.Dispose()
  } else {
    $brush = New-Object System.Drawing.SolidBrush($tileLight)
    $g.FillRectangle($brush, $rect)
    $brush.Dispose()
  }

  # Soft drop shadow under the key so it lifts off the tile
  $shadow = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(30, 20, 83, 45))
  $off = [double]$size * 0.012
  Draw-KeyGlyph $g ($size / 2.0 + $off) ($size / 2.0 + $off) ([double]($size * $keyLen)) $shadow $angle
  $shadow.Dispose()

  # The green key itself
  $keyBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.RectangleF(0, 0, [float]$size, [float]$size)),
    $keyLight, $keyDark, [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal)
  Draw-KeyGlyph $g ($size / 2.0) ($size / 2.0) ([double]($size * $keyLen)) $keyBrush $angle
  $keyBrush.Dispose()

  $g.Dispose()
  return $bmp
}

$jobs = @(
  @{ name = 'icon-192.png';         size = 192; rounded = $true;  len = 0.60; angle = -45 },
  @{ name = 'icon-512.png';         size = 512; rounded = $true;  len = 0.60; angle = -45 },
  @{ name = 'icon-maskable-512.png'; size = 512; rounded = $false; len = 0.60; angle = -45 },
  @{ name = '../apple-touch-icon.png'; size = 180; rounded = $false; len = 0.58; angle = -45 }
)

foreach ($j in $jobs) {
  $bmp = New-KeyTile -size $j.size -rounded $j.rounded -keyLen $j.len -angle $j.angle
  $path = Join-Path $iconDir $j.name
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Host "wrote $path"
}

# favicon.svg — same key, drawn as vector paths
$favicon = @'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="t" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f0fdf4"/><stop offset="1" stop-color="#dcfce7"/>
    </linearGradient>
    <linearGradient id="k" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#16a34a"/><stop offset="1" stop-color="#14532d"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="url(#t)"/>
  <g transform="translate(32 32) rotate(-45) scale(0.3073) translate(-21 1.5)" fill="url(#k)">
    <path d="M-20,-20 A20,20 0 1,1 -20,20 A20,20 0 1,1 -20,-20 Z M-12,-12 A12,12 0 1,0 -12,12 A12,12 0 1,0 -12,-12 Z" fill-rule="evenodd"/>
    <rect x="12" y="-4.5" width="50" height="9"/>
    <rect x="46" y="4.5" width="7" height="12.5"/>
    <rect x="55" y="4.5" width="7" height="9"/>
  </g>
</svg>
'@
Set-Content -Path (Join-Path $out 'favicon.svg') -Value $favicon -Encoding UTF8
Write-Host "wrote favicon.svg"
