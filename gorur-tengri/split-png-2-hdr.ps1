param(
    [Parameter(Mandatory=$true)]
    [int]$N,
    
    [Parameter(Mandatory=$true)]
    [string]$InputPng,
    
    [Parameter(Mandatory=$false)]
    [string]$OutputPrefix = "output"
)

# Check if ImageMagick is available
if (-not (Get-Command "magick" -ErrorAction SilentlyContinue)) {
    Write-Error "ImageMagick is not installed or not in PATH"
    exit 1
}

# Check if input file exists
if (-not (Test-Path $InputPng)) {
    Write-Error "Input file not found: $InputPng"
    exit 1
}

# Get image dimensions
$identify = magick identify -format "%w %h" $InputPng
$dimensions = $identify -split " "
$width = [int]$dimensions[0]
$height = [int]$dimensions[1]

# Calculate tile dimensions
$tileWidth = [math]::Floor($width / $N)
$tileHeight = [math]::Floor($height / $N)

Write-Host "Input image: ${width}x${height}"
Write-Host "Splitting into ${N}x${N} grid"
Write-Host "Tile size: ${tileWidth}x${tileHeight}"

# Split the image
for ($row = 0; $row -lt $N; $row++) {
    for ($col = 0; $col -lt $N; $col++) {
        $x = $col * $tileWidth
        $y = $row * $tileHeight
        
        $outputFile = "${OutputPrefix}_${row}_${col}.hdr"
        
        Write-Host "Creating $outputFile (offset: ${x},${y})"
        
        magick $InputPng -crop "${tileWidth}x${tileHeight}+${x}+${y}" +repage -colorspace RGB -depth 32 $outputFile
        
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to create $outputFile"
            exit 1
        }
    }
}

Write-Host "Done! Created $($N * $N) HDR tiles."