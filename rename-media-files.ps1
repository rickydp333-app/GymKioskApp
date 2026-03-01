# =========================================
# Media File Batch Rename Script
# Auto-generates proper slugs for all exercise images and videos
# =========================================

Write-Host "=== GymKioskApp Media File Renaming Tool ===" -ForegroundColor Cyan
Write-Host ""

# Function to generate slug from filename
function Get-Slug {
    param([string]$Name)
    
    return $Name `
        -replace '\.[^.]+$', '' `
        -replace '[()]', '' `
        -replace '[^\w\s-]', '' `
        -replace '\s+', '-' `
        -replace '-+', '-' `
        -replace '^-|-$', '' `
        | ForEach-Object { $_.ToLower().Trim() }
}

# Function to process directory
function Process-Directory {
    param(
        [string]$Path,
        [string]$Type
    )
    
    if (!(Test-Path $Path)) {
        Write-Host "⚠️  Directory not found: $Path" -ForegroundColor Yellow
        return
    }
    
    Write-Host "`n📁 Processing $Type in: $Path" -ForegroundColor Green
    
    $files = Get-ChildItem -Path $Path -File
    $renamed = 0
    $skipped = 0
    
    foreach ($file in $files) {
        $originalName = $file.BaseName
        $extension = $file.Extension
        $slug = Get-Slug $originalName
        $newName = "$slug$extension"
        
        if ($file.Name -eq $newName) {
            Write-Host "  ✓ Already correct: $($file.Name)" -ForegroundColor Gray
            $skipped++
        } else {
            $newPath = Join-Path $file.DirectoryName $newName
            
            if (Test-Path $newPath) {
                Write-Host "  ⚠️  Target exists, skipping: $($file.Name) -> $newName" -ForegroundColor Yellow
                $skipped++
            } else {
                try {
                    Rename-Item -Path $file.FullName -NewName $newName -ErrorAction Stop
                    Write-Host "  ✓ Renamed: $($file.Name) -> $newName" -ForegroundColor Green
                    $renamed++
                } catch {
                    Write-Host "  ❌ Failed: $($file.Name) - $($_.Exception.Message)" -ForegroundColor Red
                    $skipped++
                }
            }
        }
    }
    
    Write-Host "  Summary: $renamed renamed, $skipped skipped" -ForegroundColor Cyan
}

# Main execution
$baseDir = $PSScriptRoot

# Muscle groups
$muscleGroups = @('chest', 'shoulders', 'back', 'biceps', 'triceps', 'legs', 'abs', 'core', 'traps')

Write-Host "Starting batch rename process..." -ForegroundColor Cyan
Write-Host "Base directory: $baseDir" -ForegroundColor White
Write-Host ""

# Process images
Write-Host "=== PROCESSING IMAGES ===" -ForegroundColor Magenta
foreach ($muscle in $muscleGroups) {
    $imagePath = Join-Path $baseDir "assets\muscles\$muscle"
    Process-Directory -Path $imagePath -Type "Images ($muscle)"
}

# Process videos
Write-Host "`n=== PROCESSING VIDEOS ===" -ForegroundColor Magenta
foreach ($muscle in $muscleGroups) {
    $videoPath = Join-Path $baseDir "assets\videos\$muscle"
    Process-Directory -Path $videoPath -Type "Videos ($muscle)"
}

Write-Host "`n=== COMPLETE ===" -ForegroundColor Green
Write-Host "All media files have been processed." -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
