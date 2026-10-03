$ErrorActionPreference = 'Stop'

$src = 'C:\Users\RDP-KIOSK\OneDrive\Desktop\installs\gymkiosk-install-set-v1.0.2'
$dst = 'C:\Users\RDP-KIOSK\OneDrive\Desktop\installs\gymkiosk-install-set-v1.0.2-r1'

if (-not (Test-Path $src)) {
  throw "Source install set not found: $src"
}

if (Test-Path $dst) {
  Remove-Item $dst -Recurse -Force
}

Copy-Item $src $dst -Recurse -Force
Write-Output "CREATED:$dst"
