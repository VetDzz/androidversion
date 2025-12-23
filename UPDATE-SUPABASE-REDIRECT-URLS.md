# 🔧 UPDATE SUPABASE REDIRECT URLs

## ⚠️ PROBLEM

Your email confirmation links are redirecting to the old Vercel domain:
```
https://vetdzz.vercel.app/#access_token=...
```

This causes a 404 error because that domain doesn't exist anymore.

---

## ✅ SOLUTION - Update Redirect URLs in Supabase

### Step 1: Go to Supabase Dashboard

1. Open: https://supabase.com/dashboard
2. Select your project: `plwfbeqtupboeerqiplw`
3. Go to **Authentication** → **URL Configuration** (left sidebar)

---

### Step 2: Update Site URL

Find the **Site URL** field and change it to:
```
https://vetdzz-2.onrender.com
```

**Important**: Remove the `/#/` at the end - just use the base URL!

---

### Step 3: Update Redirect URLs

Find the **Redirect URLs** section and add these URLs (one per line):

```
https://vetdzz-2.onrender.com/#/auth/callback
https://vetdzz-2.onrender.com/#/oauth-complete
https://vetdzz-2.onrender.com/#/auth
https://vetdzz-2.onrender.com/#/
http://localhost:5173/#/auth/callback
http://localhost:5173/#/oauth-complete
http://localhost:5173/#/auth
http://localhost:5173/#/
```

**Remove any old URLs** that point to:
- `vetdzz.vercel.app`
- Any other old domains

---

### Step 4: Save Changes

Click **Save** at the bottom of the page.

---

## 🧪 TEST IT

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Sign up with a new email** (not the one you already used)
3. **Check your email** (inbox and spam)
4. **Click the confirmation link**
5. **You should be redirected to**:
   - `https://vetdzz-2.onrender.com/#/auth/callback` (loading screen)
   - Then automatically to:
     - `/#/` (home) if you're a client
     - `/#/vet-home` if you're a vet

---

## 🔍 WHAT WAS FIXED IN THE CODE

The `AuthCallback.tsx` page now:
1. ✅ Handles email confirmations properly
2. ✅ Checks user type from database (client_profiles or vet_profiles)
3. ✅ Redirects clients to `/#/` (home page)
4. ✅ Redirects vets to `/#/vet-home` (vet dashboard)
5. ✅ Shows proper loading and success messages

---

## 📝 NOTES

- The redirect URL in the email is set by Supabase based on your **Site URL** setting
- You must update this in the Supabase Dashboard (can't be done via SQL)
- After updating, new emails will use the correct URL
- Old confirmation links will still use the old URL (users need to request a new email)

---

## 🆘 IF YOU ALREADY CLICKED THE OLD LINK

If you already confirmed your email using the old Vercel link:

1. Your email IS confirmed (the token was processed)
2. Just go directly to: https://vetdzz-2.onrender.com/#/auth
3. Log in with your email and password
4. You'll be redirected to the correct page based on your user type

---

## ✅ VERIFICATION CHECKLIST

- [ ] Site URL updated to `https://vetdzz-2.onrender.com`
- [ ] Redirect URLs added (all 8 URLs listed above)
- [ ] Old Vercel URLs removed
- [ ] Changes saved in Supabase Dashboard
- [ ] Browser cache cleared
- [ ] Test signup with new email
- [ ] Confirmation email received
- [ ] Confirmation link redirects to correct domain
- [ ] User redirected to correct page (home or vet-home)
