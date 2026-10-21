# Downloads the Plus Jakarta Sans VARIABLE woff2 (latin + latin-ext) into
# public/fonts and writes public/fonts/fonts.css pointing at the local files,
# so the app keeps its typography offline inside the Android APK.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$fontDir = Join-Path $root 'public\fonts'
New-Item -ItemType Directory -Force -Path $fontDir | Out-Null

# 'wght@200..800' => Google serves a variable font (font-weight: 200 800)
$ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
$css = (Invoke-WebRequest -Uri 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@200..800&display=swap' -UserAgent $ua).Content

$keep = @('latin', 'latin-ext')
$out = @()
$got = 0

# Each block is: /* subset-name */ @font-face { ... }
$blocks = [regex]::Matches($css, '/\*\s*([a-z-]+)\s*\*/\s*@font-face\s*\{([^}]+)\}')
foreach ($b in $blocks) {
    $subset = $b.Groups[1].Value.Trim()
    $body   = $b.Groups[2].Value
    if ($keep -notcontains $subset) { continue }

    $url   = [regex]::Match($body, 'url\((https://[^)]+\.woff2)\)').Groups[1].Value
    $range = [regex]::Match($body, 'unicode-range:\s*([^;]+);').Groups[1].Value.Trim()
    $fwt   = [regex]::Match($body, 'font-weight:\s*([^;]+);').Groups[1].Value.Trim()
    if (-not $url)  { continue }
    if (-not $fwt)  { $fwt = '200 800' }

    $name = "pjs-$subset.woff2"
    Invoke-WebRequest -Uri $url -UserAgent $ua -OutFile (Join-Path $fontDir $name)
    $kb = [math]::Round((Get-Item (Join-Path $fontDir $name)).Length / 1KB, 1)
    Write-Host "downloaded $subset -> $name ($kb KB)  font-weight: $fwt"

    $out += "@font-face {"
    $out += "  font-family: 'Plus Jakarta Sans';"
    $out += "  font-style: normal;"
    $out += "  font-weight: $fwt;"
    $out += "  font-display: swap;"
    $out += "  src: url('/fonts/$name') format('woff2-variations'), url('/fonts/$name') format('woff2');"
    if ($range) { $out += "  unicode-range: $range;" }
    $out += '}'
    $got++
}

if ($got -eq 0) { throw 'No font subsets were found in the Google Fonts CSS.' }

$out | Set-Content -Path (Join-Path $fontDir 'fonts.css') -Encoding utf8
Remove-Item (Join-Path $fontDir '_source.css') -ErrorAction SilentlyContinue
Write-Host "wrote fonts.css with $got @font-face rule(s)"
