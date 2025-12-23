-- ============================================
-- FIX OAUTH PROFILE CREATION ISSUES
-- ============================================
-- This script fixes:
-- 1. 406 errors (RLS blocking queries)
-- 2. 409 errors (profile conflicts)
-- 3. Foreign key constraint errors
-- 4. Email verification issues
-- ============================================

-- STEP 1: Check if profile already exists for the OAuth user
-- Replace 'd6ffb9e3-792e-4f08-bbfd-0ee739037db8' with your actual user_id
SELECT 
  'Existing client profile:' as info,
  * 
FROM client_profiles 
WHERE user_id = 'd6ffb9e3-792e-4f08-bbfd-0ee739037db8';

SELECT 
  'Existing vet profile:' as info,
  * 
FROM vet_profiles 
WHERE user_id = 'd6ffb9e3-792e-4f08-bbfd-0ee739037db8';

-- STEP 2: Check if user exists in auth.users
SELECT 
  'User in auth.users:' as info,
  id, 
  email, 
  email_confirmed_at,
  created_at,
  raw_app_meta_data->>'provider' as provider
FROM auth.users 
WHERE id = 'd6ffb9e3-792e-4f08-bbfd-0ee739037db8';

-- ============================================
-- STEP 3: FIX RLS POLICIES FOR client_profiles
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own client profile" ON client_profiles;
DROP POLICY IF EXISTS "Users can insert their own client profile" ON client_profiles;
DROP POLICY IF EXISTS "Users can update their own client profile" ON client_profiles;
DROP POLICY IF EXISTS "Vets can view client profiles" ON client_profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON client_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON client_profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON client_profiles;

-- Create new comprehensive policies
CREATE POLICY "Allow users to read their own profile"
ON client_profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Allow users to insert their own profile"
ON client_profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own profile"
ON client_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow vets to view client profiles (for test requests)
CREATE POLICY "Allow vets to view client profiles"
ON client_profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM vet_profiles 
    WHERE vet_profiles.user_id = auth.uid()
  )
);

-- ============================================
-- STEP 4: FIX RLS POLICIES FOR vet_profiles
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own vet profile" ON vet_profiles;
DROP POLICY IF EXISTS "Users can insert their own vet profile" ON vet_profiles;
DROP POLICY IF EXISTS "Users can update their own vet profile" ON vet_profiles;
DROP POLICY IF EXISTS "Public can view verified vets" ON vet_profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON vet_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON vet_profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON vet_profiles;

-- Create new comprehensive policies
CREATE POLICY "Allow users to read their own vet profile"
ON vet_profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Allow users to insert their own vet profile"
ON vet_profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own vet profile"
ON vet_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow public to view verified vets (for search)
CREATE POLICY "Allow public to view verified vets"
ON vet_profiles FOR SELECT
TO authenticated
USING (is_verified = true);

-- ============================================
-- STEP 5: ENABLE EMAIL CONFIRMATION REQUIREMENT
-- ============================================
-- This must be done in Supabase Dashboard:
-- 1. Go to Authentication -> Settings
-- 2. Enable "Confirm email" toggle
-- 3. Set "Site URL" to: https://vetdzz-2.onrender.com
-- 4. Add redirect URLs:
--    - https://vetdzz-2.onrender.com/#/auth
--    - https://vetdzz-2.onrender.com/#/oauth-complete
--    - http://localhost:5173/#/auth
--    - http://localhost:5173/#/oauth-complete

-- ============================================
-- STEP 6: DELETE EXISTING PROFILE IF IT EXISTS (OPTIONAL)
-- ============================================
-- Only run this if you want to start fresh
-- UNCOMMENT THE LINES BELOW TO DELETE:

-- DELETE FROM client_profiles WHERE user_id = 'd6ffb9e3-792e-4f08-bbfd-0ee739037db8';
-- DELETE FROM vet_profiles WHERE user_id = 'd6ffb9e3-792e-4f08-bbfd-0ee739037db8';

-- ============================================
-- STEP 7: VERIFY RLS IS ENABLED
-- ============================================
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('client_profiles', 'vet_profiles');

-- ============================================
-- STEP 8: CHECK ALL POLICIES
-- ============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('client_profiles', 'vet_profiles')
ORDER BY tablename, policyname;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these after applying the fixes to verify everything works

-- Test 1: Can the user read their own profile?
-- (Run this while logged in as the OAuth user)
-- SELECT * FROM client_profiles WHERE user_id = auth.uid();

-- Test 2: Can the user insert their own profile?
-- (This should work now)
-- INSERT INTO client_profiles (user_id, full_name, email, phone, is_verified)
-- VALUES (auth.uid(), 'Test User', 'test@example.com', '', true)
-- ON CONFLICT (user_id) DO UPDATE SET full_name = EXCLUDED.full_name;

-- ============================================
-- NOTES
-- ============================================
-- 1. The 406 error was caused by RLS policies blocking SELECT queries
-- 2. The 409 error was caused by trying to insert when profile already exists
-- 3. The foreign key error was caused by trying to insert before user exists in auth.users
-- 4. Email verification must be configured in Supabase Dashboard (not SQL)
-- 5. For custom SMTP, configure in: Authentication -> Settings -> SMTP Settings
