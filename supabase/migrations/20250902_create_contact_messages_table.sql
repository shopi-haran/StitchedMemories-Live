-- Migration: Create contact_messages table and setup RLS and Webhooks
-- Table to store inquiries submitted from the website Contact Form

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  inquiry_type TEXT NOT NULL DEFAULT 'General Inquiry',
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new', -- 'new' | 'read' | 'replied'
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indices for fast searching and sorting
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON public.contact_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON public.contact_messages (status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_email ON public.contact_messages (email);

-- Enable Row Level Security (RLS)
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow public visitors / anyone to INSERT their message
CREATE POLICY "Allow public insert on contact_messages"
ON public.contact_messages
FOR INSERT
TO public
WITH CHECK (true);

-- Policy 2: Allow authenticated admins or anon service to view messages
CREATE POLICY "Allow authenticated read on contact_messages"
ON public.contact_messages
FOR SELECT
TO authenticated, anon
USING (true);

-- Policy 3: Allow updating status (mark as read/replied)
CREATE POLICY "Allow update on contact_messages"
ON public.contact_messages
FOR UPDATE
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- Policy 4: Allow delete on contact_messages
CREATE POLICY "Allow delete on contact_messages"
ON public.contact_messages
FOR DELETE
TO authenticated, anon
USING (true);

-- =========================================================================
-- Instructions for setting up Supabase Database Webhook to Edge Function:
-- 1. In Supabase Dashboard -> Database -> Webhooks -> "Create a new hook"
-- 2. Name: "notify_on_contact_message"
-- 3. Table: "contact_messages"
-- 4. Events: Check "Insert"
-- 5. Type: "Supabase Edge Functions"
-- 6. Method: "POST"
-- 7. Edge Function: select "notify-contact-message"
-- =========================================================================
