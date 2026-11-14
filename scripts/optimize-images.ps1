Add-Type -AssemblyName System.Drawing
$projectRoot = Split-Path -Parent $PSScriptRoot
$codec = [Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
$jobs = @(
    @{ Source='engineering-bim-team.png'; Name='engineering-bim-team'; Sizes=@(480,960) },
    @{ Source='subramanian-sekar.png'; Name='subramanian-sekar'; Sizes=@(420,840) }
)
foreach ($job in $jobs) {
    $source = [Drawing.Image]::FromFile((Join-Path $projectRoot ('assets/' + $job.Source)))
    try {
        foreach ($width in $job.Sizes) {
            $height = [int][Math]::Round($source.Height * $width / $source.Width)
            $bitmap = New-Object Drawing.Bitmap($width,$height)
            $graphics = [Drawing.Graphics]::FromImage($bitmap)
            try {
                $graphics.CompositingQuality = [Drawing.Drawing2D.CompositingQuality]::HighQuality
                $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $graphics.DrawImage($source,0,0,$width,$height)
                $parameters = New-Object Drawing.Imaging.EncoderParameters(1)
                $parameters.Param[0] = New-Object Drawing.Imaging.EncoderParameter([Drawing.Imaging.Encoder]::Quality, [long]84)
                try { $bitmap.Save((Join-Path $projectRoot ('assets/' + $job.Name + '-' + $width + '.jpg')), $codec, $parameters) }
                finally { $parameters.Dispose() }
            } finally { $graphics.Dispose(); $bitmap.Dispose() }
        }
    } finally { $source.Dispose() }
}
