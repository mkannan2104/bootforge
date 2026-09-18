# BootForge Windows Executable Build Script
$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   BootForge Desktop Build Pipeline       " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Ensure Cargo & LLVM-MinGW paths are in PATH
$cargoBin = "C:\Users\PC\.cargo\bin"
$llvmBin = "C:\Users\PC\AppData\Local\Microsoft\WinGet\Packages\MartinStorsjo.LLVM-MinGW.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe\llvm-mingw-20260616-ucrt-x86_64\bin"

if (Test-Path $cargoBin) {
    if ($env:PATH -notlike "*$cargoBin*") {
        $env:PATH = "$cargoBin;$env:PATH"
    }
}

if (Test-Path $llvmBin) {
    if ($env:PATH -notlike "*$llvmBin*") {
        $env:PATH = "$llvmBin;$env:PATH"
    }
}

Write-Host "[1/4] Verifying toolchain..." -ForegroundColor Yellow
$rustcVer = & rustc --version
Write-Host "Rust: $rustcVer" -ForegroundColor Green

# 2. Build Frontend
Write-Host "`n[2/4] Compiling frontend assets..." -ForegroundColor Yellow
& npm run build
if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }

# 3. Build Native Desktop Executable & Bundles
Write-Host "`n[3/4] Compiling native release executable..." -ForegroundColor Yellow
& npx @tauri-apps/cli build
if ($LASTEXITCODE -ne 0) { throw "Tauri build failed" }

# 4. Stage Binaries to dist-exe
Write-Host "`n[4/4] Staging binaries to ./dist-exe..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "dist-exe" | Out-Null

$srcTarget = "src-tauri\target\x86_64-pc-windows-gnullvm\release"
Copy-Item "$srcTarget\bootforge.exe" "dist-exe\BootForge.exe" -Force
if (Test-Path "$srcTarget\bundle\nsis\BootForge_0.1.0_x64-setup.exe") {
    Copy-Item "$srcTarget\bundle\nsis\BootForge_0.1.0_x64-setup.exe" "dist-exe\BootForge-Setup.exe" -Force
}
if (Test-Path "$srcTarget\bundle\msi\BootForge_0.1.0_x64_en-US.msi") {
    Copy-Item "$srcTarget\bundle\msi\BootForge_0.1.0_x64_en-US.msi" "dist-exe\BootForge.msi" -Force
}

Write-Host "`nBuild Succeeded! Generated Files:" -ForegroundColor Green
Get-ChildItem -Path "dist-exe" | Format-Table Name, @{Name="Size (MB)"; Expression={"{0:N2}" -f ($_.Length / 1MB)}}, LastWriteTime
