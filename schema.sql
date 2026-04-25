-- ============================================================
-- PEAK '25 MEETUP — Registration & Ticketing System
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- 1. Registrations table
CREATE TABLE IF NOT EXISTS registrations (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name        TEXT NOT NULL,
  email            TEXT NOT NULL,
  phone            TEXT NOT NULL,
  nic              TEXT NOT NULL UNIQUE,
  school           TEXT NOT NULL,
  food_preference  TEXT NOT NULL CHECK (food_preference IN ('vegetarian', 'non-vegetarian', 'vegan')),
  payment_slip_url TEXT,
  status           TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  ticket_id        UUID DEFAULT gen_random_uuid() UNIQUE,
  checked_in       BOOLEAN DEFAULT FALSE,
  checked_in_at    TIMESTAMPTZ,
  admin_note       TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable Row Level Security
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Anyone can register (INSERT)
CREATE POLICY "public_insert" ON registrations
  FOR INSERT WITH CHECK (true);

-- Anyone can read (needed for status check by email & QR scan validation)
CREATE POLICY "public_read" ON registrations
  FOR SELECT USING (true);

-- Only authenticated admin can approve / reject (UPDATE)
CREATE POLICY "admin_update" ON registrations
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Only authenticated admin can delete
CREATE POLICY "admin_delete" ON registrations
  FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================
-- 4. Storage bucket for payment slips
-- Run separately if needed
-- ============================================================

-- Create a public bucket (URLs are UUID-based so effectively private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-slips', 'payment-slips', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to upload payment slips
CREATE POLICY "public_upload_slip" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'payment-slips');

-- Allow public to read (admin uses same anon key to view slips)
CREATE POLICY "public_read_slip" ON storage.objects
  FOR SELECT USING (bucket_id = 'payment-slips');
