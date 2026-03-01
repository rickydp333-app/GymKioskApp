# =========================================
# Media File Checker
# Identifies missing images and videos for exercises
# =========================================

Write-Host "=== GymKioskApp Media File Checker ===" -ForegroundColor Cyan
Write-Host ""

# Load exercise data from exercises.js
$exercisesFile = Join-Path $PSScriptRoot "js\data\exercises.js"

if (!(Test-Path $exercisesFile)) {
    Write-Host "❌ exercises.js not found!" -ForegroundColor Red
    exit
}

Write-Host "📖 Reading exercise data..." -ForegroundColor Green

# Function to generate slug
function Get-Slug {
    param([string]$Name)
    
    return $Name `
        -replace '[()]', '' `
        -replace '[^\w\s-]', '' `
        -replace '\s+', '-' `
        -replace '-+', '-' `
        -replace '^-|-$', '' `
        | ForEach-Object { $_.ToLower().Trim() }
}

# Parse exercises (basic regex-based parsing)
$content = Get-Content $exercisesFile -Raw

$muscleGroups = @{
    chest = @()
    shoulders = @()
    back = @()
    biceps = @()
    triceps = @()
    legs = @()
    abs = @()
    core = @()
    traps = @()
}

# Extract exercise names per muscle group
foreach ($muscle in $muscleGroups.Keys) {
    $pattern = "$muscle\s*:\s*\[\s*((?:\{[^}]+\},?\s*)+)\]"
    if ($content -match $pattern) {
        $exerciseBlock = $Matches[1]
        $namePattern = 'name:\s*"([^"]+)"'
        $names = [regex]::Matches($exerciseBlock, $namePattern) | ForEach-Object { $_.Groups[1].Value }
        $muscleGroups[$muscle] = $names
    }
}

Write-Host ""
Write-Host "=== CHECKING MEDIA FILES ===" -ForegroundColor Magenta
Write-Host ""

$totalMissing = 0
$totalExercises = 0

foreach ($muscle in $muscleGroups.Keys | Sort-Object) {
    $exercises = $muscleGroups[$muscle]
    
    if ($exercises.Count -eq 0) {
        continue
    }
    
    Write-Host "📂 $($muscle.ToUpper())" -ForegroundColor Yellow
    Write-Host "   Exercises: $($exercises.Count)" -ForegroundColor White
    
    $missingImages = @()
    $missingVideos = @()
    
    foreach ($exercise in $exercises) {
        $totalExercises++
        $slug = Get-Slug $exercise
        
        $imagePath = Join-Path $PSScriptRoot "assets\muscles\$muscle\$slug.png"
        $videoPath = Join-Path $PSScriptRoot "assets\videos\$muscle\$slug.mp4"
        
        if (!(Test-Path $imagePath)) {
            $missingImages += $exercise
        }
        
        if (!(Test-Path $videoPath)) {
            $missingVideos += $exercise
        }
    }
    
    if ($missingImages.Count -gt 0) {
        Write-Host "   ❌ Missing Images ($($missingImages.Count)):" -ForegroundColor Red
        foreach ($ex in $missingImages) {
            $slug = Get-Slug $ex
            Write-Host "      • $ex" -ForegroundColor Gray
            Write-Host "        → Expected: $slug.png" -ForegroundColor DarkGray
        }
        $totalMissing += $missingImages.Count
    }
    
    if ($missingVideos.Count -gt 0) {
        Write-Host "   ⚠️  Missing Videos ($($missingVideos.Count)):" -ForegroundColor Yellow
        foreach ($ex in $missingVideos) {
            $slug = Get-Slug $ex
            Write-Host "      • $ex" -ForegroundColor Gray
            Write-Host "        → Expected: $slug.mp4" -ForegroundColor DarkGray
        }
    }
    
    if ($missingImages.Count -eq 0 -and $missingVideos.Count -eq 0) {
        Write-Host "   ✓ All media files present!" -ForegroundColor Green
    }
    
    Write-Host ""
}

Write-Host "=== SUMMARY ===" -ForegroundColor Cyan
Write-Host "Total exercises: $totalExercises" -ForegroundColor White
Write-Host "Missing images: $totalMissing" -ForegroundColor $(if ($totalMissing -gt 0) { 'Red' } else { 'Green' })
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
