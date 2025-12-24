# Google Play Release Guide

## 1. Generate Production Keystore

Run this command to create a secure keystore for Google Play:

```powershell
keytool -genkey -v -keystore vetdz-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias vetdz-release -storepass YOUR_SECURE_PASSWORD -keypass YOUR_SECURE_PASSWORD -dname "CN=VetDZ, OU=Mobile, O=VetDZ, L=Algiers, ST=Algiers, C=DZ"
```

**IMPORTANT:** 
- Replace `YOUR_SECURE_PASSWORD` with a strong password
- Save this keystore file and password securely - you'll need it for all future updates!
- Never share or lose this keystore

## 2. Configure Signing in build.gradle

Edit `android/app/build.gradle`:

```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file('vetdz-release.jks')
            storePassword 'YOUR_SECURE_PASSWORD'
            keyAlias 'vetdz-release'
            keyPassword 'YOUR_SECURE_PASSWORD'
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

## 3. Build Release APK/AAB

```powershell
# Build AAB (Android App Bundle) - required for Google Play
cd android
.\gradlew bundleRelease

# AAB will be at: android/app/build/outputs/bundle/release/app-release.aab

# Or build APK for testing
.\gradlew assembleRelease
```

## 4. Google Play Console Setup

1. Go to https://play.google.com/console
2. Create a new app
3. Fill in app details:
   - App name: VetDZ
   - Default language: French
   - App type: App
   - Category: Medical

4. Upload your AAB file
5. Fill in store listing:
   - Short description
   - Full description
   - Screenshots (phone + tablet)
   - Feature graphic (1024x500)
   - App icon (512x512)

## 5. App Signing by Google Play

Google Play will manage your app signing. When you upload:
1. Go to Setup → App signing
2. Choose "Let Google manage and protect your app signing key"
3. Upload your AAB

## 6. Required Assets

- **App Icon**: 512x512 PNG
- **Feature Graphic**: 1024x500 PNG
- **Screenshots**: At least 2 phone screenshots
- **Privacy Policy URL**: Required for medical apps

## 7. Content Rating

Complete the content rating questionnaire - for a medical/vet app:
- No violence
- No sexual content
- Medical information: Yes

## 8. Release

1. Create a production release
2. Upload AAB
3. Add release notes
4. Submit for review

Review typically takes 1-3 days for new apps.
