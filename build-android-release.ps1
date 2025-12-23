# VetDZ Android Build Script
# This script builds the Android app for release

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  VetDZ Android Build Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "android")) {
    Write-Host "Error: Please run this script from the project root directory" -ForegroundColor Red
    exit 1
}

# Check for google-services.json
if (-not (Test-Path "android/app/google-services.json")) {
    Write-Host "Warning: google-services.json not found!" -ForegroundColor Yellow
    Write-Host "Push notifications will not work without it." -ForegroundColor Yellow
    Write-Host "Download it from Firebase Console and place it in android/app/" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 1
    }
}

# Check for signing key
$hasSigningKey = Test-Path "android/app/vetdz-release-key.jks"
if (-not $hasSigningKey) {
    Write-Host "No signing key found. Creating one..." -ForegroundColor Yellow
    Write-Host ""
    
    # Create keystore
    Set-Location android/app
    
    Write-Host "You'll be prompted to enter keystore details." -ForegroundColor Cyan
    Write-Host "Remember your passwords - you'll need them for future releases!" -ForegroundColor Yellow
    Write-Host ""
    
    keytool -genkey -v -keystore vetdz-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias vetdz
    
    Set-Location ../..
    
    if (-not (Test-Path "android/app/vetdz-release-key.jks")) {
        Write-Host "Error: Failed to create signing key" -ForegroundColor Red
        exit 1
    }
    
    Write-Host ""
    Write-Host "Signing key created successfully!" -ForegroundColor Green
    Write-Host ""
    
    # Prompt for passwords to add to gradle.properties
    Write-Host "Now let's configure the signing credentials..." -ForegroundColor Cyan
    $storePassword = Read-Host "Enter keystore password"
    $keyPassword = Read-Host "Enter key password"
    
    # Create or update gradle.properties
    $gradleProps = @"
VETDZ_RELEASE_STORE_FILE=vetdz-release-key.jks
VETDZ_RELEASE_STORE_PASSWORD=$storePassword
VETDZ_RELEASE_KEY_ALIAS=vetdz
VETDZ_RELEASE_KEY_PASSWORD=$keyPassword
"@
    
    $gradleProps | Out-File -FilePath "android/gradle.properties" -Encoding UTF8 -Append
    Write-Host "Signing credentials saved to android/gradle.properties" -ForegroundColor Green
}

# Build options
Write-Host ""
Write-Host "Build Options:" -ForegroundColor Cyan
Write-Host "1. Debug APK (for testing)"
Write-Host "2. Release APK (signed)"
Write-Host "3. Release AAB (for Google Play)"
Write-Host ""
$choice = Read-Host "Select option (1-3)"

Set-Location android

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "Building Debug APK..." -ForegroundColor Cyan
        ./gradlew assembleDebug
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "Build successful!" -ForegroundColor Green
            Write-Host "APK location: android/app/build/outputs/apk/debug/app-debug.apk" -ForegroundColor Yellow
        }
    }
    "2" {
        Write-Host ""
        Write-Host "Building Release APK..." -ForegroundColor Cyan
        ./gradlew assembleRelease
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "Build successful!" -ForegroundColor Green
            Write-Host "APK location: android/app/build/outputs/apk/release/app-release.apk" -ForegroundColor Yellow
        }
    }
    "3" {
        Write-Host ""
        Write-Host "Building Release AAB (App Bundle)..." -ForegroundColor Cyan
        ./gradlew bundleRelease
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "Build successful!" -ForegroundColor Green
            Write-Host "AAB location: android/app/build/outputs/bundle/release/app-release.aab" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "This AAB file is ready for Google Play upload!" -ForegroundColor Cyan
        }
    }
    default {
        Write-Host "Invalid option" -ForegroundColor Red
    }
}

Set-Location ..

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
