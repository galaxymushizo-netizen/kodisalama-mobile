# Generates KodiSalama PWA icons (192 / 512 / maskable / apple-touch / favicon).
# Every one of them is the house-and-keyhole mark on a green gradient tile —
# the same drawing scripts/housemark.ps1 produces for the Android launcher, so
# the website and the app icon can never drift apart.
Add-Type -AssemblyName System.Drawing
. (Join-Path $PSScriptRoot 'housemark.ps1')

$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root 'public'
$iconDir = Join-Path $out 'icons'
New-Item -ItemType Directory -Force -Path $iconDir | Out-Null

# radius/scale are fractions of the icon's edge.
#   rounded    -> tile gets the 0.20 corner radius the browser stores on disk
#   maskable   -> tile must be full-bleed (the launcher cuts its own mask) and
#                 the mark is inset, since Google's maskable safe zone is the
#                 circle covering 80% of the width. The mark reaches 199 units
#                 from its centre in 512-space, so scale has to stay under
#                 204.8 / 199 = 1.03 to be safe; 0.80 leaves visible slack.
$jobs = @(
  @{ name = 'icon-192.png';            size = 192; rounded = $true;  radius = 0.20; scale = 1.00 }
  @{ name = 'icon-512.png';            size = 512; rounded = $true;  radius = 0.20; scale = 1.00 }
  @{ name = 'icon-maskable-512.png';   size = 512; rounded = $false; radius = 0;    scale = 0.80 }
  @{ name = '../apple-touch-icon.png'; size = 180; rounded = $false; radius = 0;    scale = 0.90 }
)

foreach ($j in $jobs) {
  $bmp = New-Object System.Drawing.Bitmap($j.size, $j.size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  Draw-HouseMark -g $g -size ([double]$j.size) -rounded ([bool]$j.rounded) `
    -radius ([int]($j.size * $j.radius)) -scale ([double]$j.scale)
  $g.Dispose()
  $path = Join-Path $iconDir $j.name
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Host "wrote $path"
}

# favicon.svg — the same mark, written as vector so it stays sharp in a tab.
# Geometry mirrors Draw-HouseGlyph exactly (512-space authoring).
$favicon = @'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="t" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stop-color="#066e2a"/><stop offset="1" stop-color="#40e860"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="110" fill="url(#t)"/>
  <rect x="322" y="96" width="50" height="88" fill="#fff"/>
  <path d="M92 232 L252 88 L422 232" fill="none" stroke="#fff"
        stroke-width="29" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="132" y="168" width="258" height="224" rx="10" fill="#fff"/>
  <path fill-rule="evenodd" fill="#0b762d"
        d="M204 272 A52 52 0 1 1 308 272 A52 52 0 1 1 204 272 Z
           M233 272 A23 23 0 1 1 279 272 A23 23 0 1 1 233 272 Z"/>
  <path fill="#0b762d" d="M238 292 L274 292 L270 402 L256 430 L242 402 Z"/>
</svg>
'@
Set-Content -Path (Join-Path $out 'favicon.svg') -Value $favicon -Encoding UTF8
Write-Host "wrote favicon.svg"
