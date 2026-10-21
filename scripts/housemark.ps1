# KodiSalama house-and-keyhole mark. Dot-source this file, then call
# Draw-HouseGlyph (house only, transparent) or Draw-HouseMark (on a tiled
# background). All geometry is authored in a 512x512 space and scaled per size,
# so every icon in the project is literally the same drawing.
Add-Type -AssemblyName System.Drawing

# Tile palette — the launcher tile is a real green gradient rather than the
# near-white mint it used to be, so the icon holds its own on a launcher grid.
$script:TileDark   = [System.Drawing.Color]::FromArgb(255, 6, 110, 42)    # #066e2a
$script:TileBright = [System.Drawing.Color]::FromArgb(255, 64, 232, 96)   # #40e860
$script:HouseWhite = [System.Drawing.Color]::FromArgb(255, 255, 255, 255)
$script:KeyholeGreen = [System.Drawing.Color]::FromArgb(255, 11, 118, 45) # #0b762d

# Radial extent of the mark from its centre, in 512-space units. Used to work
# out how far the glyph may be scaled before it breaches a mask's safe zone.
$script:HouseRadius = 199.0

function New-HouseTilePath {
  param([System.Drawing.Rectangle]$rect, [int]$radius)
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $radius * 2
  $p.AddArc($rect.X, $rect.Y, $d, $d, 180, 90)
  $p.AddArc($rect.Right - $d, $rect.Y, $d, $d, 270, 90)
  $p.AddArc($rect.Right - $d, $rect.Bottom - $d, $d, $d, 0, 90)
  $p.AddArc($rect.X, $rect.Bottom - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

<#
  Draws the house + keyhole at the centre of the graphics surface, with no
  tile behind it.

  size      edge length of the 512-space square to map onto
  scale     how much of that square the mark may occupy (1.0 = edge to edge;
            maskable icons and adaptive foregrounds need < 1.0)
  house     colour of the house
  hole      colour of the keyhole
#>
function Draw-HouseGlyph {
  param(
    $g,
    [double]$size,
    [double]$scale = 1.0,
    [System.Drawing.Color]$house = [System.Drawing.Color]::White,
    [System.Drawing.Color]$hole = $script:KeyholeGreen,
    [double]$cx = -1,
    [double]$cy = -1
  )

  if ($cx -lt 0) { $cx = $size / 2.0 }
  if ($cy -lt 0) { $cy = $size / 2.0 }

  $u = ($size * $scale) / 512.0
  # The mark is not perfectly centred in its 512 box, so shift by its true
  # centre (257, 259) rather than the box centre.
  $ox = $cx - 257.0 * $u
  $oy = $cy - 259.0 * $u

  $g.SmoothingMode = 'AntiAlias'
  $g.PixelOffsetMode = 'HighQuality'

  $W = New-Object System.Drawing.SolidBrush($house)

  # chimney first, so the roof stroke crosses over it
  $g.FillRectangle($W, ($ox + 322 * $u), ($oy + 96 * $u), (50 * $u), (88 * $u))

  # roof: thick chevron with round caps and a round join at the apex
  $pen = New-Object System.Drawing.Pen($house, (29 * $u))
  $pen.StartCap = 'Round'
  $pen.EndCap = 'Round'
  $pen.LineJoin = 'Round'
  $g.DrawLines($pen, @(
    (New-Object System.Drawing.PointF([float]($ox + 92 * $u),  [float]($oy + 232 * $u))),
    (New-Object System.Drawing.PointF([float]($ox + 252 * $u), [float]($oy + 88 * $u))),
    (New-Object System.Drawing.PointF([float]($ox + 422 * $u), [float]($oy + 232 * $u)))
  ))
  $pen.Dispose()

  # body
  $body = New-HouseTilePath (New-Object System.Drawing.Rectangle(
    [int]($ox + 132 * $u), [int]($oy + 168 * $u),
    [int](258 * $u), [int](224 * $u))) ([int](10 * $u))
  $g.FillPath($W, $body)
  $body.Dispose()
  $W.Dispose()

  # keyhole: ring, then a tapering stem that runs out below the house
  $K = New-Object System.Drawing.SolidBrush($hole)
  $ring = New-Object System.Drawing.Drawing2D.GraphicsPath
  $ring.FillMode = [System.Drawing.Drawing2D.FillMode]::Alternate
  $ring.AddEllipse([float](($ox + 204 * $u)), [float](($oy + 220 * $u)), [float](104 * $u), [float](104 * $u))
  $ring.AddEllipse([float](($ox + 233 * $u)), [float](($oy + 249 * $u)), [float](46 * $u),  [float](46 * $u))
  $g.FillPath($K, $ring)
  $ring.Dispose()

  $stem = New-Object System.Drawing.Drawing2D.GraphicsPath
  $stem.FillMode = [System.Drawing.Drawing2D.FillMode]::Winding
  $stem.AddPolygon(@(
    (New-Object System.Drawing.PointF([float]($ox + 238 * $u), [float]($oy + 292 * $u))),
    (New-Object System.Drawing.PointF([float]($ox + 274 * $u), [float]($oy + 292 * $u))),
    (New-Object System.Drawing.PointF([float]($ox + 270 * $u), [float]($oy + 402 * $u))),
    (New-Object System.Drawing.PointF([float]($ox + 256 * $u), [float]($oy + 430 * $u))),
    (New-Object System.Drawing.PointF([float]($ox + 242 * $u), [float]($oy + 402 * $u)))
  ))
  $g.FillPath($K, $stem)
  $stem.Dispose()
  $K.Dispose()
}

<#
  Draws the mark on a green gradient tile.

  size      edge length of the output square
  rounded   $true draws a rounded-corner tile (PWA icons); $false fills the
            whole square, which is what launchers and iOS expect since they
            apply their own mask
  radius    corner radius for the rounded variant
  scale     how much of the tile the house may occupy
#>
function Draw-HouseMark {
  param(
    $g,
    [double]$size,
    [bool]$rounded = $true,
    [int]$radius = 0,
    [double]$scale = 1.0,
    [System.Drawing.Color]$tileDark = $script:TileDark,
    [System.Drawing.Color]$tileBright = $script:TileBright
  )

  $g.SmoothingMode = 'AntiAlias'
  $g.PixelOffsetMode = 'HighQuality'
  $g.Clear([System.Drawing.Color]::Transparent)

  $rect = New-Object System.Drawing.Rectangle(0, 0, [int]$size, [int]$size)
  # GDI+ puts startColor at the TOP-right for BackwardDiagonal (verified by
  # sampling the finished PNGs), so the bright end has to be listed first to
  # match the reference: dark at the bottom-left, bright at the top-right.
  if ($rounded) {
    $tpath = New-HouseTilePath $rect $radius
    $tb = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
      $rect, $tileBright, $tileDark, [System.Drawing.Drawing2D.LinearGradientMode]::BackwardDiagonal)
    $g.FillPath($tb, $tpath)
    $tb.Dispose(); $tpath.Dispose()
  } else {
    $tb = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
      $rect, $tileBright, $tileDark, [System.Drawing.Drawing2D.LinearGradientMode]::BackwardDiagonal)
    $g.FillRectangle($tb, $rect)
    $tb.Dispose()
  }

  Draw-HouseGlyph -g $g -size $size -scale $scale `
    -house $script:HouseWhite -hole $script:KeyholeGreen
}
