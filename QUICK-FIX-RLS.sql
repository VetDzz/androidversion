-- ============================================
-- QUICK FIX FOR OAUTH PROFILE CREATION
-- Run this in Supabase SQL Editor NOW
-- ============================================

-- Fix client_profiles RLS policies
DROP POLICY IF EXISTS "Allow users to read their own profile" ON client_profiles;
DROP POLICY IF EXISTS "Allow users to insert their own profile" ON client_profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON client_profiles;
DROP POLICY IF EXISTS "Allow vets to view client profiles" ON client_profiles;

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

CREATE POLICY "Allow vets to view client profiles"
ON client_profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM vet_profiles 
    WHERE vet_profiles.user_id = auth.uid()
  )
);

-- Fix vet_profiles RLS policies
DROP POLICY IF EXISTS "Allow users to read their own vet profile" ON vet_profiles;
DROP POLICY IF EXISTS "Allow users to insert their own vet profile" ON vet_profiles;
DROP POLICY IF EXISTS "Allow users to update their own vet profile" ON vet_profiles;
DROP POLICY IF EXISTS "Allow public to view verified vets" ON vet_profiles;

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

CREATE POLICY "Allow public to view verified vets"
ON vet_profiles FOR SELECT
TO authenticated
USING (is_verified = true);

-- Verify RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('client_profiles', 'vet_profiles');

-- Check policies
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename IN ('client_profiles', 'vet_profiles')
ORDER BY tablename, policyname;
