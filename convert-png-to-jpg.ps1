$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$quality = 90L
$excludedDirs = @(".git", ".claude")
$textExtensions = @(".html", ".css", ".js", ".json", ".md", ".txt", ".xml", ".svg")

function Test-IsExcludedPath([string]$path) {
  $relative = Convert-ToRelativePath $path
  foreach ($dir in $excludedDirs) {
    if ($relative -eq $dir -or $relative.StartsWith("$dir/")) {
      return $true
    }
  }
  return $false
}

function Convert-ToRelativePath([string]$path) {
  $rootPath = $root.TrimEnd("\") + "\"
  $rootUri = New-Object System.Uri $rootPath
  $pathUri = New-Object System.Uri $path
  return [System.Uri]::UnescapeDataString($rootUri.MakeRelativeUri($pathUri).ToString()).Replace("\", "/")
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

$pngFiles = Get-ChildItem -LiteralPath $root -Recurse -File -Filter "*.png" |
  Where-Object { -not (Test-IsExcludedPath $_.FullName) }

$converted = New-Object System.Collections.Generic.List[object]
$failed = New-Object System.Collections.Generic.List[string]

foreach ($file in $pngFiles) {
  $jpgPath = [System.IO.Path]::ChangeExtension($file.FullName, ".jpg")
  try {
    $image = [System.Drawing.Image]::FromFile($file.FullName)
  } catch {
    $failed.Add($file.FullName)
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
      Save-Jpeg $bitmap $jpgPath $quality
    } finally {
      $bitmap.Dispose()
    }

    $converted.Add([pscustomobject]@{
      Png = Convert-ToRelativePath $file.FullName
      Jpg = Convert-ToRelativePath $jpgPath
    })
  } finally {
    $image.Dispose()
  }
}

$textFiles = Get-ChildItem -LiteralPath $root -Recurse -File |
  Where-Object {
    -not (Test-IsExcludedPath $_.FullName) -and
    $textExtensions -contains $_.Extension.ToLowerInvariant()
  }

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$updatedFiles = 0

foreach ($textFile in $textFiles) {
  $content = [System.IO.File]::ReadAllText($textFile.FullName, [System.Text.Encoding]::UTF8)
  $updated = $content
  foreach ($item in $converted) {
    $updated = $updated.Replace($item.Png, $item.Jpg)
    $updated = $updated.Replace($item.Png.Replace("/", "\"), $item.Jpg.Replace("/", "\"))
  }
  if ($updated -ne $content) {
    [System.IO.File]::WriteAllText($textFile.FullName, $updated, $utf8NoBom)
    $updatedFiles += 1
  }
}

Write-Host "PNG files found:       $($pngFiles.Count)"
Write-Host "Converted to JPG:     $($converted.Count)"
Write-Host "Reference files changed: $updatedFiles"
if ($failed.Count -gt 0) {
  Write-Host "Failed to decode:"
  foreach ($path in $failed) {
    Write-Host " - $(Convert-ToRelativePath $path)"
  }
}
