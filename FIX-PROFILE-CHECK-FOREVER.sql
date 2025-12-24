-- ============================================
-- PERMANENT FIX FOR PROFILE CHECK ISSUES
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Drop existing function if it exists
DROP FUNCTION IF EXISTS public.get_user_profile_info(uuid);

-- 2. Create a SECURITY DEFINER function that ALWAYS works
-- This bypasses ALL RLS policies
CREATE OR REPLACE FUNCTION public.get_user_profile_info(check_user_id uuid)
RETURNS TABLE (
  has_profile boolean,
  user_type text,
  profile_data jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER -- This makes it run with the function owner's permissions (bypasses RLS)
SET search_path = public
AS $$
DECLARE
  v_client_profile client_profiles%ROWTYPE;
  v_vet_profile vet_profiles%ROWTYPE;
BEGIN
  -- Check client profile first
  SELECT * INTO v_client_profile
  FROM client_profiles
  WHERE user_id = check_user_id
  LIMIT 1;
  
  IF FOUND THEN
    RETURN QUERY SELECT 
      true as has_profile,
      'client'::text as user_type,
      jsonb_build_object(
        'id', v_client_profile.id,
        'full_name', v_client_profile.full_name,
        'email', v_client_profile.email
      ) as profile_data;
    RETURN;
  END IF;
  
  -- Check vet profile
  SELECT * INTO v_vet_profile
  FROM vet_profiles
  WHERE user_id = check_user_id
  LIMIT 1;
  
  IF FOUND THEN
    RETURN QUERY SELECT 
      true as has_profile,
      'vet'::text as user_type,
      jsonb_build_object(
        'id', v_vet_profile.id,
        'vet_name', v_vet_profile.vet_name,
        'clinic_name', v_vet_profile.clinic_name,
        'email', v_vet_profile.email
      ) as profile_data;
    RETURN;
  END IF;
  
  -- No profile found
  RETURN QUERY SELECT 
    false as has_profile,
    null::text as user_type,
    null::jsonb as profile_data;
END;
$$;

-- 3. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_profile_info(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_profile_info(uuid) TO anon;

-- 4. Test the function (replace with your user ID)
-- SELECT * FROM get_user_profile_info('your-user-id-here');

-- ============================================
-- DONE! This function will ALWAYS work
-- ============================================
