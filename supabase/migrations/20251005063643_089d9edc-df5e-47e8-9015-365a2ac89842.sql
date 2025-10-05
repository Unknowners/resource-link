-- Add onboarding settings columns to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS onboarding_video_url TEXT,
ADD COLUMN IF NOT EXISTS onboarding_welcome_text TEXT DEFAULT 'Вітаємо, {first_name}!

Раді бачити вас в нашій команді на посаді {position}.

Для початку роботи перегляньте це відео:';