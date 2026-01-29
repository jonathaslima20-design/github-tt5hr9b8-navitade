/*
  # Create Clone Jobs Tracking Table

  1. New Tables
    - `clone_jobs`
      - `id` (uuid, primary key)
      - `source_user_id` (uuid, references users)
      - `target_user_id` (uuid, references users)
      - `status` (text: pending, processing, completed, failed)
      - `total_products` (integer)
      - `processed_count` (integer)
      - `error_message` (text, nullable)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `completed_at` (timestamp, nullable)

  2. Indexes
    - On source_user_id, target_user_id, status for efficient queries

  3. Security
    - Enable RLS on `clone_jobs` table
    - Only admins can view clone job status

  4. Purpose
    - Track asynchronous user cloning operations
    - Store progress and error information
    - Enable polling UI to track cloning progress
*/

CREATE TABLE IF NOT EXISTS public.clone_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  total_products integer NOT NULL DEFAULT 0,
  processed_count integer NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_clone_jobs_source_user_id ON public.clone_jobs(source_user_id);
CREATE INDEX IF NOT EXISTS idx_clone_jobs_target_user_id ON public.clone_jobs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_clone_jobs_status ON public.clone_jobs(status);
CREATE INDEX IF NOT EXISTS idx_clone_jobs_created_at ON public.clone_jobs(created_at DESC);

ALTER TABLE public.clone_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all clone jobs"
  ON public.clone_jobs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );
