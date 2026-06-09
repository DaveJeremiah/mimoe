-- Add category column to collections table
-- Run this in your Supabase SQL editor: https://supabase.com/dashboard → SQL editor
ALTER TABLE collections ADD COLUMN IF NOT EXISTS category text;
