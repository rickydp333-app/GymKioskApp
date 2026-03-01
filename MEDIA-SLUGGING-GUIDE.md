# Media File Slugging System

## Overview
The app now uses an **auto-slugging system** to ensure consistent naming between exercise data and media files (images/videos).

## How It Works

### 1. Slug Generation
Every exercise automatically gets a `slug` property based on its name:

```javascript
"Push-Up" → "push-up"
"Barbell Bench Press" → "barbell-bench-press"
"Machine Chest Press (Female)" → "machine-chest-press-female"
```

**Rules:**
- Lowercase all characters
- Remove parentheses: `()` → (removed)
- Remove special characters except spaces/hyphens
- Replace spaces with hyphens: ` ` → `-`
- Remove multiple consecutive hyphens: `--` → `-`
- Trim leading/trailing hyphens

### 2. File Path Structure
```
assets/
  muscles/
    chest/
      push-up.png
      bench-press.png
      ...
  videos/
    chest/
      push-up.mp4
      bench-press.mp4
      ...
```

### 3. Fallback System

**Images:**
- Primary: `assets/muscles/{muscle}/{slug}.png`
- Fallback: Hide image if not found (no broken image icons)
- Console log: "Image not found: {path}"

**Videos:**
- Primary: `assets/videos/{muscle}/{slug}.mp4`
- Fallback: (To be implemented based on needs)

## Usage Scripts

### Check Missing Media Files
```powershell
.\check-missing-media.ps1
```
**Output:**
- Lists all exercises per muscle group
- Shows which images/videos are missing
- Displays expected filenames

### Batch Rename Existing Files
```powershell
.\rename-media-files.ps1
```
**What it does:**
- Scans all image folders: `assets/muscles/{muscle}/`
- Scans all video folders: `assets/videos/{muscle}/`
- Renames files to match slug format
- Skips already-correct filenames
- Shows summary of renamed/skipped files

**Safety:**
- Won't overwrite existing files
- Shows warnings for conflicts
- Can be run multiple times safely

## Adding New Exercises

### Step 1: Add to exercises.js
```javascript
{ 
  name: "New Exercise Name",
  howTo: ["Step 1", "Step 2", ...],
  primary: ["Muscle 1"],
  secondary: ["Muscle 2"]
}
```

### Step 2: Get the slug
Run the app or check console - slug is auto-generated.

Or use this PowerShell command:
```powershell
"New Exercise Name".ToLower() -replace '[()]','' -replace '[^\w\s-]','' -replace '\s+','-'
```

### Step 3: Name your media files
```
assets/muscles/{muscle}/new-exercise-name.png
assets/videos/{muscle}/new-exercise-name.mp4
```

## Troubleshooting

### Image not showing?
1. Check console for: `Image not found: {path}`
2. Verify filename matches slug exactly (lowercase, hyphens)
3. Check file extension is `.png`
4. Ensure file is in correct muscle folder

### Slug mismatch?
1. Run `check-missing-media.ps1` to see expected filenames
2. Rename file to match expected slug
3. Or use `rename-media-files.ps1` to auto-rename

### Special characters in name?
All special characters except hyphens are removed:
- `"Dumbbell Press (30°)"` → `"dumbbell-press-30"`
- `"Push-Up's"` → `"push-ups"`

## Benefits

✅ **Consistent naming** across code and files  
✅ **Auto-generated** slugs - no manual tracking  
✅ **Fallback handling** - graceful degradation  
✅ **Easy debugging** - console logs missing files  
✅ **Bulk operations** - scripts for batch processing  
✅ **Future-proof** - add videos/animations later  

## File Naming Examples

| Exercise Name | Slug | Image Path |
|--------------|------|------------|
| Push-Up | `push-up` | `assets/muscles/chest/push-up.png` |
| Barbell Bench Press | `barbell-bench-press` | `assets/muscles/chest/barbell-bench-press.png` |
| Cable Fly | `cable-fly` | `assets/muscles/chest/cable-fly.png` |
| Overhead Press | `overhead-press` | `assets/muscles/shoulders/overhead-press.png` |
| Pull-Up | `pull-up` | `assets/muscles/back/pull-up.png` |

## Next Steps

1. ✅ Run `check-missing-media.ps1` to audit current files
2. ✅ Run `rename-media-files.ps1` to standardize existing files
3. ✅ Add missing images/videos based on slug names
4. 🔄 Implement video fallback system (if needed)
5. 🔄 Add animations as additional fallback layer
