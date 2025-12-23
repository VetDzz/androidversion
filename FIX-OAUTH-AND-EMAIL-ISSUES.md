# 🔧 FIX OAUTH PROFILE CREATION & EMAIL VERIFICATION ISSUES

## 🎯 PROBLEMS IDENTIFIED

1. **406 Error**: RLS (Row Level Security) policies are blocking profile queries
2. **409 Error**: Profile already exists but can't be updated due to RLS
3. **Foreign Key Error**: Trying to create profile before user exists in auth.users
4. **Email Not Received**: Supabase default email service has limitations
5. **Email Verification**: Not required before account creation

---

## ✅ SOLUTION STEPS (IN ORDER)

### STEP 1: Apply SQL Fixes to Supabase

1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `plwfbeqtupboeerqiplw`
3. Go to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy and paste the entire content of `fix-oauth-profile-creation.sql`
6. Click **Run** (or press Ctrl+Enter)
7. Check the results - you should see:
   - Existing profiles (if any)
   - User info from auth.users
   - "Policy created" messages
   - RLS status (should be `true`)
   - List of all policies

**IMPORTANT**: If you see an existing profile for user_id `d6ffb9e3-792e-4f08-bbfd-0ee739037db8`, that's why you're getting 409 errors. The profile already exists!

---

### STEP 2: Enable Email Confirmation (Supabase Dashboard)

1. In Supabase Dashboard, go to **Authentication** → **Settings**
2. Scroll to **Email Auth**
3. **Enable** the toggle for "Confirm email"
4. Set **Site URL** to: `https://vetdzz-2.onrender.com`
5. Under **Redirect URLs**, add these URLs (one per line):
   ```
   https://vetdzz-2.onrender.com/#/auth
   https://vetdzz-2.onrender.com/#/oauth-complete
   http://localhost:5173/#/auth
   http://localhost:5173/#/oauth-complete
   ```
6. Click **Save**

---

### STEP 3: Configure Custom SMTP (Fix Email Delivery)

**Why?** Supabase default email service:
- Only sends 3 emails per hour on free tier
- Often goes to spam
- May not work on localhost
- Not reliable for production

**Solution**: Configure Gmail SMTP (still through Supabase, no external service needed!)

1. In Supabase Dashboard, go to **Authentication** → **Settings**
2. Scroll to **SMTP Settings**
3. Click **Enable Custom SMTP**
4. Fill in these details:

   **For Gmail:**
   ```
   Sender email: your-email@gmail.com
   Sender name: VetDZ
   Host: smtp.gmail.com
   Port: 587
   Username: your-email@gmail.com
   Password: [Your Gmail App Password - see below]
   ```

5. Click **Save**

**How to get Gmail App Password:**
1. Go to https://myaccount.google.com/security
2. Enable 2-Step Verification (if not already enabled)
3. Go to https://myaccount.google.com/apppasswords
4. Select "Mail" and "Other (Custom name)"
5. Enter "VetDZ Supabase"
6. Click **Generate**
7. Copy the 16-character password (no spaces)
8. Paste it in the SMTP Password field

**Alternative: SendGrid (if you prefer)**
```
Host: smtp.sendgrid.net
Port: 587
Username: apikey
Password: [Your SendGrid API Key]
```

---

### STEP 4: Test the Fixes

1. **Clear browser cache and cookies**
2. **Open browser console** (F12)
3. Go to your website: https://vetdzz-2.onrender.com
4. Try to sign up with OAuth (Google/Facebook)
5. Watch the console for debug messages:
   ```
   🔍 [DEBUG] Step 1: Getting user from auth...
   🔍 [DEBUG] Step 2: User data: {...}
   🔍 [DEBUG] Step 3: Checking if profile already exists...
   🔍 [DEBUG] Step 4: Preparing profile data: {...}
   🔍 [DEBUG] Step 5: Attempting insert to client_profiles...
   🔍 [DEBUG] Step 6: Insert result: {...}
   ✅ [DEBUG] Profile created successfully!
   ```

6. **Check for errors**:
   - If you see **406 error**: RLS policies not applied correctly
   - If you see **409 error**: Profile already exists (this is OK now, it will redirect)
   - If you see **42501 error**: RLS permissions issue

---

### STEP 5: Check Email Delivery

1. Go to Supabase Dashboard → **Authentication** → **Logs**
2. Look for recent email events
3. Check the status:
   - ✅ **Sent**: Email was sent successfully
   - ❌ **Failed**: Email failed to send (check SMTP settings)
   - ⏳ **Pending**: Email is queued

4. **Check your spam folder** if using default Supabase email
5. **Check Gmail sent folder** if using custom SMTP

---

## 🔍 DEBUGGING GUIDE

### If you still get 406 errors:

1. Check RLS policies are applied:
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename = 'client_profiles';
   ```

2. Verify RLS is enabled:
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE tablename = 'client_profiles';
   ```

3. Test if you can read your own profile:
   ```sql
   SELECT * FROM client_profiles 
   WHERE user_id = auth.uid();
   ```

### If you still get 409 errors:

This means the profile already exists. The updated code now handles this gracefully and redirects you to the home page.

### If emails still not received:

1. **Check Supabase email logs** (Authentication → Logs)
2. **Check spam folder**
3. **Verify SMTP settings** are correct
4. **Test SMTP connection** using a tool like https://www.smtper.net/
5. **Check Gmail "Less secure app access"** is NOT blocking (use App Password instead)

---

## 📋 VERIFICATION CHECKLIST

- [ ] SQL script executed successfully in Supabase
- [ ] RLS policies created (check pg_policies table)
- [ ] Email confirmation enabled in Supabase settings
- [ ] Site URL and Redirect URLs configured
- [ ] Custom SMTP configured (Gmail or SendGrid)
- [ ] SMTP settings saved and tested
- [ ] Browser cache cleared
- [ ] OAuth signup tested with console open
- [ ] No 406 or 409 errors in console
- [ ] Profile created successfully
- [ ] Email received (check inbox and spam)
- [ ] Email verification link works

---

## 🎉 EXPECTED BEHAVIOR AFTER FIXES

1. **OAuth Signup**:
   - User signs up with Google/Facebook
   - Redirected to OAuth complete page
   - Chooses account type (Client/Vet)
   - Accepts terms
   - Profile created successfully (or redirected if exists)
   - No 406/409 errors

2. **Email Signup**:
   - User signs up with email/password
   - Receives verification email immediately
   - Clicks verification link
   - Account activated
   - Can log in

3. **Password Reset**:
   - User clicks "Forgot Password"
   - Enters email
   - Receives reset email immediately
   - Clicks reset link
   - Sets new password
   - Can log in with new password

---

## 🆘 STILL HAVING ISSUES?

If you're still experiencing problems after following all steps:

1. **Share the console output** (all debug messages)
2. **Share the Supabase logs** (Authentication → Logs)
3. **Share the SQL query results** from fix-oauth-profile-creation.sql
4. **Confirm which steps you completed**

---

## 📝 NOTES

- The code now checks if profile exists before creating (prevents 409 errors)
- Better error messages show exactly what went wrong
- RLS policies allow users to read/write their own profiles
- Email verification is now required (configure in Supabase Dashboard)
- Custom SMTP ensures reliable email delivery
- All changes are done through Supabase Dashboard (no external services needed)
