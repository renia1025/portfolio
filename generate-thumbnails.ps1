$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$thumbRoot = Join-Path $root "images\thumbs"
$maxSide = 1200
$quality = 70L
$excludedSegments = @("\.git\", "\.claude\", "\images\thumbs\")
$imageExtensions = @(".jpg", ".jpeg", ".png")

function Test-IsExcludedPath([string]$path) {
  foreach ($segment in $excludedSegments) {
    if ($path.Contains($segment)) {
      return $true
    }
  }
  return $false
}

function Convert-ToRelativePath([string]$path) {
  return $path.Substring($root.Length).TrimStart("\").Replace("\", "/")
}

function Save-Jpeg([System.Drawing.Bitmap]$bitmap, [string]$path, [long]$quality) {
  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
    Where-Object { $_.MimeType -eq "image/jpeg" } |
    Select-Object -First 1
  $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters 1
  $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
    [System.Drawing.Imaging.Encoder]::Quality,
    $quality
  )
  $bitmap.Save($path, $codec, $encoderParams)
}

if (-not (Test-Path -LiteralPath $thumbRoot)) {
  New-Item -ItemType Directory -Path $thumbRoot -Force | Out-Null
}

$sources = Get-ChildItem -LiteralPath $root -Recurse -File |
  Where-Object {
    -not (Test-IsExcludedPath $_.FullName) -and
    $imageExtensions -contains $_.Extension.ToLowerInvariant()
  }

$created = 0
$skipped = 0
$failed = New-Object System.Collections.Generic.List[string]
$totalOriginal = 0L
$totalThumbs = 0L

foreach ($source in $sources) {
  $relative = Convert-ToRelativePath $source.FullName
  $relativeNoExt = [System.IO.Path]::ChangeExtension($relative, $null)
  if ($relativeNoExt.EndsWith(".")) {
    $relativeNoExt = $relativeNoExt.Substring(0, $relativeNoExt.Length - 1)
  }
  $thumbRelative = ($relativeNoExt + ".jpg").Replace("/", "\")
  $thumbPath = Join-Path $thumbRoot $thumbRelative
  $thumbDir = Split-Path -Parent $thumbPath
  if (-not (Test-Path -LiteralPath $thumbDir)) {
    New-Item -ItemType Directory -Path $thumbDir -Force | Out-Null
  }

  try {
    $image = [System.Drawing.Image]::FromFile($source.FullName)
  } catch {
    $failed.Add($relative)
    continue
  }

  try {
    $scale = [Math]::Min(1.0, [double]$maxSide / [double]([Math]::Max($image.Width, $image.Height)))
    $newWidth = [Math]::Max(1, [int][Math]::Round($image.Width * $scale))
    $newHeight = [Math]::Max(1, [int][Math]::Round($image.Height * $scale))

    $bitmap = New-Object System.Drawing.Bitmap $newWidth, $newHeight, ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      try {
        $graphics.Clear([System.Drawing.Color]::White)
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.DrawImage($image, 0, 0, $newWidth, $newHeight)
      } finally {
        $graphics.Dispose()
      }
      Save-Jpeg $bitmap $thumbPath $quality
    } finally {
      $bitmap.Dispose()
    }
  } finally {
    $image.Dispose()
  }

  $originalSize = $source.Length
  $thumbSize = (Get-Item -LiteralPath $thumbPath).Length
  $totalOriginal += $originalSize
  $totalThumbs += $thumbSize
  if ($thumbSize -lt $originalSize) {
    $created += 1
  } else {
    $skipped += 1
  }
}

$saved = if ($totalOriginal -gt 0) { 100 - [Math]::Round(($totalThumbs / $totalOriginal) * 100, 1) } else { 0 }
Write-Host "Source images: $($sources.Count)"
Write-Host "Thumbs made:   $created"
Write-Host "Not smaller:   $skipped"
Write-Host "Original:      $([Math]::Round($totalOriginal / 1MB, 2)) MB"
Write-Host "Thumbnails:    $([Math]::Round($totalThumbs / 1MB, 2)) MB"
Write-Host "Saved:         $saved%"
if ($failed.Count -gt 0) {
  Write-Host "Failed:"
  foreach ($item in $failed) {
    Write-Host " - $item"
  }
}
