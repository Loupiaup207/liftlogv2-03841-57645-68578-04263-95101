-- Create nutrition_goals table to store user nutrition objectives
CREATE TABLE public.nutrition_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  daily_calories INTEGER NOT NULL DEFAULT 2500,
  daily_protein INTEGER NOT NULL DEFAULT 150,
  daily_carbs INTEGER NOT NULL DEFAULT 250,
  daily_fat INTEGER NOT NULL DEFAULT 70,
  target_weight NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.nutrition_goals ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own nutrition goals" 
ON public.nutrition_goals 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own nutrition goals" 
ON public.nutrition_goals 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own nutrition goals" 
ON public.nutrition_goals 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own nutrition goals" 
ON public.nutrition_goals 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_nutrition_goals_updated_at
BEFORE UPDATE ON public.nutrition_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();