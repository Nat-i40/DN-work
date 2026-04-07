-- Run this in your Supabase SQL Editor to set a default expiration period for new jobs (e.g., 30 days)
-- and add the necessary columns for analytics.

-- 1. Add analytics columns if they don't exist
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS applications_count INTEGER DEFAULT 0;

-- 2. Add expires_at column if it doesn't exist
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- 3. Set default expiration to 30 days from creation for new jobs
ALTER TABLE jobs ALTER COLUMN expires_at SET DEFAULT (now() + interval '30 days');

-- 4. Update existing jobs that don't have an expiration date to expire in 30 days from now
UPDATE jobs SET expires_at = now() + interval '30 days' WHERE expires_at IS NULL;

-- 5. Add is_verified to users table for employer verification
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

-- 6. Create site_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. Create content_blocks table if it doesn't exist
CREATE TABLE IF NOT EXISTS content_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  title TEXT,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
