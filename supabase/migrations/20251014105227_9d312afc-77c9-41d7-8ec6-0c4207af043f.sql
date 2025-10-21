-- Create table for user weekly programs
CREATE TABLE public.user_weekly_programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  muscle_group TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, day_of_week)
);

-- Enable Row Level Security
ALTER TABLE public.user_weekly_programs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own weekly programs"
ON public.user_weekly_programs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own weekly programs"
ON public.user_weekly_programs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly programs"
ON public.user_weekly_programs
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weekly programs"
ON public.user_weekly_programs
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_weekly_programs_updated_at
BEFORE UPDATE ON public.user_weekly_programs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();