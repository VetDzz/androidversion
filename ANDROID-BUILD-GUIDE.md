# VetDZ Android App - Build & Deploy Guide

## Overview
This is a WebView-based Android app that wraps your VetDZ web application with:
- Google & Facebook OAuth support
- Firebase Push Notifications
- File upload/download support
- Deep linking for OAuth callbacks

## Prerequisites

1. **Android Studio** (latest version)
2. **Java JDK 17+**
3. **Firebase Project** (for push notifications)

## Step 1: Firebase Setup

### 1.1 Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing one
3. Add an Android app with package name: `dz.vet.vetdz`

### 1.2 Download google-services.json
1. In Firebase Console, go to Project Settings
2. Under "Your apps", find the Android app
3. Download `google-services.json`
4. Place it in `android/app/google-services.json`

### 1.3 Enable Cloud Messaging
1. In Firebase Console, go to Cloud Messaging
2. Enable the Cloud Messaging API

## Step 2: OAuth Configuration

### 2.1 Google OAuth
In your Supabase Dashboard:
1. Go to Authentication > Providers > Google
2. Add these redirect URLs:
   - `https://vet-dzz.vercel.app/#/auth/callback`
   - `dz.vet.vetdz://auth/callback`

### 2.2 Facebook OAuth
In Facebook Developer Console:
1. Go to your app settings
2. Add Android platform with:
   - Package Name: `dz.vet.vetdz`
   - Class Name: `dz.vet.vetdz.MainActivity`
   - Key Hashes: (generate using keytool - see below)

To generate key hash:
```bash
keytool -exportcert -alias vetdz -keystore vetdz-release-key.jks | openssl sha1 -binary | openssl base64
```

## Step 3: Create Signing Key

For Google Play release, you need a signing key:

```bash
cd android/app

# Generate release keystore
keytool -genkey -v -keystore vetdz-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias vetdz
```

You'll be prompted for:
- Keystore password
- Key password
- Your name, organization, etc.

**IMPORTANT: Save these passwords securely! You'll need them for every release.**

## Step 4: Configure Signing

Create `android/gradle.properties` (or add to existing):

```properties
VETDZ_RELEASE_STORE_FILE=vetdz-release-key.jks
VETDZ_RELEASE_STORE_PASSWORD=your_store_password
VETDZ_RELEASE_KEY_ALIAS=vetdz
VETDZ_RELEASE_KEY_PASSWORD=your_key_password
```

**Never commit this file to git!** Add it to `.gitignore`.

## Step 5: Build the App

### Debug Build (for testing)
```bash
cd android
./gradlew assembleDebug
```
APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

### Release Build (for Google Play)
```bash
cd android
./gradlew assembleRelease
```
APK location: `android/app/build/outputs/apk/release/app-release.apk`

### Build App Bundle (recommended for Google Play)
```bash
cd android
./gradlew bundleRelease
```
AAB location: `android/app/build/outputs/bundle/release/app-release.aab`

## Step 6: Google Play Deployment

### 6.1 Create Developer Account
1. Go to [Google Play Console](https://play.google.com/console)
2. Pay the one-time $25 registration fee
3. Complete account setup

### 6.2 Create App Listing
1. Click "Create app"
2. Fill in app details:
   - App name: VetDZ
   - Default language: French
   - App or game: App
   - Free or paid: Free

### 6.3 Upload App Bundle
1. Go to Release > Production
2. Create new release
3. Upload the `.aab` file
4. Add release notes

### 6.4 Complete Store Listing
- App icon (512x512 PNG)
- Feature graphic (1024x500 PNG)
- Screenshots (phone & tablet)
- Short description
- Full description
- Privacy policy URL

## Step 7: Push Notification Testing

### Send Test Notification from Firebase
1. Go to Firebase Console > Cloud Messaging
2. Click "Send your first message"
3. Enter notification title and body
4. Target your app
5. Send

### Send from Supabase Edge Function
Your existing `send-push-notification` edge function should work. Make sure to:
1. Store FCM tokens in your database when users log in
2. Call the edge function with the token

## Troubleshooting

### OAuth not working
- Check redirect URLs in Supabase match exactly
- Ensure deep links are configured in AndroidManifest.xml
- Check logcat for errors: `adb logcat | grep VetDZ`

### Push notifications not received
- Verify `google-services.json` is in the right location
- Check Firebase Cloud Messaging is enabled
- Ensure notification permissions are granted on device

### Build errors
- Run `./gradlew clean` before building
- Check Java version: `java -version` (should be 17+)
- Sync Gradle files in Android Studio

## File Structure

```
android/
├── app/
│   ├── src/main/
│   │   ├── java/dz/vet/vetdz/
│   │   │   ├── MainActivity.java          # Main WebView activity
│   │   │   └── VetDZFirebaseMessagingService.java  # FCM handler
│   │   ├── res/
│   │   │   ├── layout/activity_main.xml   # Main layout
│   │   │   ├── drawable/                  # Icons & drawables
│   │   │   ├── values/                    # Colors, strings, styles
│   │   │   └── xml/                       # Network config
│   │   └── AndroidManifest.xml            # App manifest
│   ├── build.gradle                       # App build config
│   ├── google-services.json               # Firebase config (add this!)
│   └── vetdz-release-key.jks              # Signing key (create this!)
├── build.gradle                           # Project build config
└── gradle.properties                      # Signing credentials (create this!)
```

## Version Updates

To update the app version for new releases, edit `android/app/build.gradle`:

```groovy
defaultConfig {
    versionCode 2        // Increment for each release
    versionName "1.1.0"  // User-visible version
}
```

## Support

For issues with:
- **OAuth**: Check Supabase and provider console settings
- **Push Notifications**: Check Firebase Console
- **Build**: Check Android Studio and Gradle logs
