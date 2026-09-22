$ErrorActionPreference = 'Stop'

$version = '1.0.3'
$root = 'C:\Users\RDP-KIOSK\OneDrive\Desktop\installs'
$out = Join-Path $root "gymkiosk-install-set-v$version"

$adminSrc = 'C:\Users\RDP-KIOSK\OneDrive\Desktop\installs\dist-admin-installer\GymKiosk-Admin-v1.0.3-Setup.exe'
$kioskSrc = 'C:\GymBuildTemp\dist-kiosk-installer-v1.0.3\RDP-GYM-v1.0.3-Setup.exe'

if (-not (Test-Path $adminSrc)) {
  throw "Missing admin installer: $adminSrc"
}
if (-not (Test-Path $kioskSrc)) {
  throw "Missing kiosk installer: $kioskSrc"
}

Remove-Item $out -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path (Join-Path $out 'admin') -Force | Out-Null
New-Item -ItemType Directory -Path (Join-Path $out 'kiosk') -Force | Out-Null

$adminDst = Join-Path $out (Join-Path 'admin' ([System.IO.Path]::GetFileName($adminSrc)))
$kioskDst = Join-Path $out (Join-Path 'kiosk' ([System.IO.Path]::GetFileName($kioskSrc)))

Copy-Item $adminSrc $adminDst -Force
Copy-Item $kioskSrc $kioskDst -Force

$adminHash = (Get-FileHash $adminDst -Algorithm SHA256).Hash.ToLower()
$kioskHash = (Get-FileHash $kioskDst -Algorithm SHA256).Hash.ToLower()

Set-Content -Path ($adminDst + '.sha256.txt') -Value "$adminHash  $([System.IO.Path]::GetFileName($adminDst))" -Encoding utf8
Set-Content -Path ($kioskDst + '.sha256.txt') -Value "$kioskHash  $([System.IO.Path]::GetFileName($kioskDst))" -Encoding utf8

$created = (Get-Date).ToString('o')
$readme = @(
  'GymKiosk Install Set',
  "Version: $version",
  "Created: $created",
  '',
  'This folder contains the Windows installers for both parts of the app:',
  ('- GymKiosk Admin: admin/' + [System.IO.Path]::GetFileName($adminDst)),
  ('- RDP-GYM Kiosk: kiosk/' + [System.IO.Path]::GetFileName($kioskDst)),
  '',
  'Install whichever apps you need on the target machine. For a full deployment, install both.'
)
Set-Content -Path (Join-Path $out 'INSTALL_SET_README.txt') -Value $readme -Encoding utf8

$manifest = [ordered]@{
  version = $version
  createdAt = $created
  entries = @(
    @{
      target = 'admin'
      label = 'GymKiosk Admin'
      installerName = [System.IO.Path]::GetFileName($adminDst)
      installerPath = $adminDst
      hash = $adminHash
      hashFilePath = ($adminDst + '.sha256.txt')
    },
    @{
      target = 'kiosk'
      label = 'RDP-GYM Kiosk'
      installerName = [System.IO.Path]::GetFileName($kioskDst)
      installerPath = $kioskDst
      hash = $kioskHash
      hashFilePath = ($kioskDst + '.sha256.txt')
    }
  )
}

$manifest | ConvertTo-Json -Depth 6 | Set-Content -Path (Join-Path $out 'install-set-manifest.json') -Encoding utf8

Write-Output "INSTALL_SET_READY:$out"
