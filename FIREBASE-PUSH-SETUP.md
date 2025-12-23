# Firebase Push Notifications Setup for VetDZ

## Overview
This guide explains how to set up Firebase Cloud Messaging (FCM) for push notifications in the VetDZ Android app.

## Step 1: Firebase Console Setup

### 1.1 Create/Access Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select your existing VetDZ project

### 1.2 Add Android App
1. Click "Add app" → Android
2. Enter package name: `dz.vet.vetdz`
3. Enter app nickname: `VetDZ Android`
4. Download `google-services.json`
5. Place it in `android/app/google-services.json`

### 1.3 Get Server Key for Supabase
1. Go to Project Settings → Cloud Messaging
2. Enable Cloud Messaging API (Legacy) if not enabled
3. Copy the **Server key** (you'll need this for Supabase)

## Step 2: Supabase Edge Function Setup

### 2.1 Create Edge Function
Create a file `supabase/functions/send-push-notification/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const FCM_SERVER_KEY = Deno.env.get('FCM_SERVER_KEY')

interface PushNotificationRequest {
  token: string
  title: string
  body: string
  data?: Record<string, string>
}

serve(async (req) => {
  try {
    const { token, title, body, data } = await req.json() as PushNotificationRequest

    if (!token || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: token, title, body' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const message = {
      to: token,
      notification: {
        title,
        body,
        sound: 'default',
      },
      data: data || {},
      priority: 'high',
    }

    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${FCM_SERVER_KEY}`,
      },
      body: JSON.stringify(message),
    })

    const result = await response.json()

    return new Response(
      JSON.stringify({ success: true, result }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

### 2.2 Set Environment Variable
In Supabase Dashboard:
1. Go to Edge Functions
2. Add secret: `FCM_SERVER_KEY` = your Firebase Server Key

### 2.3 Deploy Edge Function
```bash
supabase functions deploy send-push-notification
```

## Step 3: Database Schema

### 3.1 Add push_token column to profiles
Run this SQL in Supabase SQL Editor:

```sql
-- Add push_token to client_profiles
ALTER TABLE client_profiles 
ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Add push_token to vet_profiles
ALTER TABLE vet_profiles 
ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_client_profiles_push_token ON client_profiles(push_token);
CREATE INDEX IF NOT EXISTS idx_vet_profiles_push_token ON vet_profiles(push_token);
```

## Step 4: Sending Notifications

### 4.1 From Your Backend/Edge Functions
When you want to send a notification (e.g., when a CVD request is accepted):

```typescript
// Example: Send notification when CVD request is accepted
const sendPushNotification = async (clientId: string, vetName: string) => {
  // Get client's push token
  const { data: client } = await supabase
    .from('client_profiles')
    .select('push_token')
    .eq('user_id', clientId)
    .single()

  if (client?.push_token) {
    await supabase.functions.invoke('send-push-notification', {
      body: {
        token: client.push_token,
        title: 'Demande CVD acceptée',
        body: `${vetName} a accepté votre demande de consultation à domicile`,
        data: {
          type: 'cvd_accepted',
          vet_id: vetId
        }
      }
    })
  }
}
```

### 4.2 Notification Types
You can send different types of notifications:

| Type | Title | Body |
|------|-------|------|
| `cvd_accepted` | Demande CVD acceptée | {vetName} a accepté votre demande |
| `cvd_rejected` | Demande CVD refusée | {vetName} a refusé votre demande |
| `result_ready` | Résultat disponible | Vos résultats d'analyses sont prêts |
| `new_request` | Nouvelle demande | Vous avez reçu une nouvelle demande CVD |

## Step 5: Testing

### 5.1 Test from Firebase Console
1. Go to Firebase Console → Cloud Messaging
2. Click "Send your first message"
3. Enter test notification details
4. Target your app
5. Send

### 5.2 Test from Supabase
```sql
-- Get a user's push token
SELECT push_token FROM client_profiles WHERE user_id = 'USER_ID';
```

Then call the edge function with that token.

## Troubleshooting

### Notifications not received
1. Check `google-services.json` is in the right place
2. Verify FCM_SERVER_KEY is set in Supabase
3. Check device has notification permissions
4. Look at Android logcat: `adb logcat | grep VetDZ`

### Token not saved
1. Check the Android app is injecting the token
2. Verify the web app is receiving the `fcmTokenReceived` event
3. Check database for push_token column

### Edge function errors
1. Check Supabase Edge Function logs
2. Verify FCM_SERVER_KEY is correct
3. Test with a simple curl request first

## Security Notes

- Never expose FCM_SERVER_KEY in client code
- Always validate user permissions before sending notifications
- Rate limit notification sending to prevent abuse
- Store tokens securely and delete when users log out
