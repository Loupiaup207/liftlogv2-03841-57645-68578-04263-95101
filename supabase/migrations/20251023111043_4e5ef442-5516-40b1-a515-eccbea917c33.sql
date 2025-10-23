-- Add current_bodyweight to user_preferences
ALTER TABLE user_preferences 
ADD COLUMN current_bodyweight numeric;

-- Add bodyweight_logs table to track weight history
CREATE TABLE public.bodyweight_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  weight numeric NOT NULL,
  logged_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bodyweight_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for bodyweight_logs
CREATE POLICY "Users can view their own bodyweight logs"
ON public.bodyweight_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bodyweight logs"
ON public.bodyweight_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bodyweight logs"
ON public.bodyweight_logs
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bodyweight logs"
ON public.bodyweight_logs
FOR DELETE
USING (auth.uid() = user_id);