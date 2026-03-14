-- Run this in your Supabase SQL Editor to fix the Image Upload RLS Error

-- 1. Create the "chat-images" bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-images', 'chat-images', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Drop any prior generic policies that might conflict
DROP POLICY IF EXISTS "Public select for chat-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to chat-images" ON storage.objects;

-- 3. Create the SELECT public policy
CREATE POLICY "Public select for chat-images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'chat-images');

-- 4. Create the INSERT policy for authenticated users
CREATE POLICY "Authenticated users can upload to chat-images" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'chat-images');
