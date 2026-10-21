# Mirrors package.json's version into android/app/build.gradle so the Android
# settings screen, the GitHub release tag and the in-app update check can never
# drift apart. versionCode is derived from the semver (maj*10000 + min*100 +
# patch), which stays monotonic for any version order you would ever release.
#
# Called automatically by `npm run apk`; safe to run standalone.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

$pkg = Get-Content (Join-Path $root 'package.json') -Raw | ConvertFrom-Json
$v = ([string]$pkg.version).Trim().TrimStart('v')
if (-not $v) { throw 'package.json has no version' }

$parts = @($v -split '\.')
while ($parts.Count -lt 3) { $parts += '0' }
$maj = [int]$parts[0]; $min = [int]$parts[1]; $pat = [int]$parts[2]
$code = $maj * 10000 + $min * 100 + $pat

$gradle = Join-Path $root 'android\app\build.gradle'
$text = Get-Content $gradle -Raw
$new = $text -replace 'versionCode\s+\d+', "versionCode $code"
$new = $new -replace 'versionName\s+"[^"]*"', "versionName `"$v`""

if ($new -ne $text) {
  Set-Content -Path $gradle -Value $new -NoNewline
  Write-Host "android version synced: versionName `"$v`", versionCode $code"
} else {
  Write-Host "android version already at `"$v`" (versionCode $code)"
}
