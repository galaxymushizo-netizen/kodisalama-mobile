# Shared "green key" (funguo ya kijani) glyph for KodiSalama icons/splash.
# Dot-source this file, then call Draw-KeyGlyph.
Add-Type -AssemblyName System.Drawing

# Key geometry in local units (origin = ring centre, key points along +x):
#   ring: outer R=20, inner r=12 (donut head with a hole)
#   shaft: x 12..62, half-height 4.5
#   teeth: two stubs hanging off the underside of the shaft
$script:KeyR = 20.0
$script:Keyr = 12.0
$script:KeyLen = 82.0   # -20 .. 62 along the key axis

function New-KeyDonutPath {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $p.FillMode = [System.Drawing.Drawing2D.FillMode]::Alternate
  $p.AddEllipse([float](-$script:KeyR), [float](-$script:KeyR), [float](2 * $script:KeyR), [float](2 * $script:KeyR))
  $p.AddEllipse([float](-$script:Keyr), [float](-$script:Keyr), [float](2 * $script:Keyr), [float](2 * $script:Keyr))
  return $p
}

function New-KeyBodyPath {
  # shaft + teeth (solid, drawn with Winding)
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $p.FillMode = [System.Drawing.Drawing2D.FillMode]::Winding
  $p.AddRectangle((New-Object System.Drawing.RectangleF(12, -4.5, 50, 9)))
  $p.AddRectangle((New-Object System.Drawing.RectangleF(46, 4.5, 7, 12.5)))
  $p.AddRectangle((New-Object System.Drawing.RectangleF(55, 4.5, 7, 9)))
  return $p
}

<#
  Draws the key so that its *visual* centre lands on (cx, cy).

  GetBounds() reports Bézier control-point bounds, which overstate curved
  shapes, so centring on those leaves the glyph looking lopsided. Instead the
  offset is calibrated once by rasterising the glyph and measuring where its
  opaque pixels actually average out to. The result scales linearly with
  lengthPx, so one measurement covers every icon size.
#>
function Get-KeyCenterOffset {
  if ($script:KeyOffset) { return $script:KeyOffset }

  $refLen = 100.0
  $box = 300
  $mid = $box / 2.0

  $bmp = New-Object System.Drawing.Bitmap($box, $box)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.Clear([System.Drawing.Color]::White)
  $br = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::Black)
  # Guard flag: Draw-KeyGlyph consults this function, so without it the
  # calibration pass would recurse forever.
  $script:Calibrating = $true
  try {
    Draw-KeyGlyph $g $mid $mid $refLen $br -45
  } finally {
    $script:Calibrating = $false
  }
  $br.Dispose()
  $g.Dispose()

  $sumX = 0.0
  $sumY = 0.0
  $count = 0L
  for ($y = 0; $y -lt $box; $y += 2) {
    for ($x = 0; $x -lt $box; $x += 2) {
      if ($bmp.GetPixel($x, $y).R -lt 128) {
        $sumX += $x
        $sumY += $y
        $count++
      }
    }
  }
  $bmp.Dispose()

  if ($count -eq 0) { $script:KeyOffset = ,@(0.0, 0.0); return $script:KeyOffset }

  # Offset in units of lengthPx, to be applied to the requested centre.
  $avgX = $sumX / [double]$count
  $avgY = $sumY / [double]$count
  $ox = ($mid - $avgX) / $refLen
  $oy = ($mid - $avgY) / $refLen
  $script:KeyOffset = ,@($ox, $oy)
  return $script:KeyOffset
}

<#
  Draws the key centred at (cx, cy).

  cx, cy    centre point in pixels
  lengthPx  how long the key is along its axis, in pixels
  brush     System.Drawing.Brush to fill with
  angle     rotation in degrees (-45 puts the ring at the upper right)
#>
function Draw-KeyGlyph {
  param(
    $g,
    [double]$cx,
    [double]$cy,
    [double]$lengthPx,
    $brush,
    [double]$angle = -45
  )

  $s = $lengthPx / $script:KeyLen
  $rad = $angle * [Math]::PI / 180.0
  $c = [Math]::Cos($rad)
  $sn = [Math]::Sin($rad)

  # Scale + rotate about the local origin (the ring centre).
  $m = New-Object System.Drawing.Drawing2D.Matrix(
    [float]($c * $s), [float]($sn * $s), [float](-$sn * $s), [float]($c * $s), 0.0, 0.0)

  $donut = New-KeyDonutPath
  $body = New-KeyBodyPath
  $donut.Transform($m)
  $body.Transform($m)
  $m.Dispose()

  $b1 = $donut.GetBounds()
  $b2 = $body.GetBounds()
  $left = [Math]::Min($b1.X, $b2.X)
  $top = [Math]::Min($b1.Y, $b2.Y)
  $right = [Math]::Max($b1.Right, $b2.Right)
  $bottom = [Math]::Max($b1.Bottom, $b2.Bottom)
  # Start from a bounds-centred placement, then nudge by the calibrated
  # centroid offset so the glyph reads as optically centred too. Skipped while
  # the calibration pass itself is running (see Get-KeyCenterOffset).
  $off = if ($script:Calibrating) { @(0.0, 0.0) } else { Get-KeyCenterOffset }
  $dx = $cx - (($left + $right) / 2.0) + ($off[0] * $lengthPx)
  $dy = $cy - (($top + $bottom) / 2.0) + ($off[1] * $lengthPx)

  $t = New-Object System.Drawing.Drawing2D.Matrix(1.0, 0.0, 0.0, 1.0, [float]$dx, [float]$dy)
  $donut.Transform($t)
  $body.Transform($t)
  $t.Dispose()

  $g.FillPath($brush, $donut)
  $g.FillPath($brush, $body)
  $donut.Dispose()
  $body.Dispose()
}
