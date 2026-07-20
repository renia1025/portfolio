$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$quality = 70L
$excludedDirs = @(".git", ".claude")

function Test-IsExcludedPath([string]$path) {
  $relative = $path.Substring($root.Length).TrimStart("\").Replace("\", "/")
  foreach ($dir in $excludedDirs) {
    if ($relative -eq $dir -or $relative.StartsWith("$dir/")) {
      return $true
    }
  }
  return $false
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

$jpgFiles = Get-ChildItem -LiteralPath $root -Recurse -File -Include "*.jpg", "*.jpeg" |
  Where-Object { -not (Test-IsExcludedPath $_.FullName) }

$processed = 0
$skipped = 0
$failed = New-Object System.Collections.Generic.List[string]
$totalBefore = 0L
$totalAfter = 0L

foreach ($file in $jpgFiles) {
  $before = $file.Length
  $totalBefore += $before
  $tempPath = Join-Path $file.DirectoryName ($file.BaseName + ".quality70.tmp.jpg")

  try {
    $image = [System.Drawing.Image]::FromFile($file.FullName)
  } catch {
    $failed.Add($file.FullName)
    $totalAfter += $before
    continue
  }

  try {
    $bitmap = New-Object System.Drawing.Bitmap $image.Width, $image.Height, ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      try {
        $graphics.Clear([System.Drawing.Color]::White)
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.DrawImage($image, 0, 0, $image.Width, $image.Height)
      } finally {
        $graphics.Dispose()
      }
      Save-Jpeg $bitmap $tempPath $quality
    } finally {
      $bitmap.Dispose()
    }
  } finally {
    $image.Dispose()
  }

  $after = (Get-Item -LiteralPath $tempPath).Length
  if ($after -lt $before) {
    Move-Item -LiteralPath $tempPath -Destination $file.FullName -Force
    $totalAfter += $after
    $processed += 1
  } else {
    Remove-Item -LiteralPath $tempPath -Force
    $totalAfter += $before
    $skipped += 1
  }
}

$saved = if ($totalBefore -gt 0) { 100 - [Math]::Round(($totalAfter / $totalBefore) * 100, 1) } else { 0 }
Write-Host "JPG files found:  $($jpgFiles.Count)"
Write-Host "Compressed:       $processed"
Write-Host "Skipped:          $skipped"
Write-Host "Before:           $([Math]::Round($totalBefore / 1MB, 2)) MB"
Write-Host "After:            $([Math]::Round($totalAfter / 1MB, 2)) MB"
Write-Host "Saved:            $saved%"
if ($failed.Count -gt 0) {
  Write-Host "Failed:"
  foreach ($path in $failed) {
    Write-Host " - $($path.Substring($root.Length).TrimStart("\"))"
  }
}
