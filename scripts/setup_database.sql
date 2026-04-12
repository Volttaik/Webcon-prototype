-- ============================================
-- WEBCON DATABASE SETUP
-- Run this script once to set up all tables
-- ============================================

-- Create profiles table that extends auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  institution TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create agents table
CREATE TABLE IF NOT EXISTS public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT,
  connected_platforms TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  preview TEXT,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  think_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create credit_balances table
CREATE TABLE IF NOT EXISTS public.credit_balances (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 50,
  lifetime_earned INTEGER NOT NULL DEFAULT 50,
  lifetime_spent INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create credit_transactions table
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bonus', 'purchase', 'usage', 'refund')),
  description TEXT NOT NULL,
  reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON public.agents(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_agent_id ON public.conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "agents_select_own" ON public.agents;
DROP POLICY IF EXISTS "agents_insert_own" ON public.agents;
DROP POLICY IF EXISTS "agents_update_own" ON public.agents;
DROP POLICY IF EXISTS "agents_delete_own" ON public.agents;
DROP POLICY IF EXISTS "conversations_select_own" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert_own" ON public.conversations;
DROP POLICY IF EXISTS "conversations_update_own" ON public.conversations;
DROP POLICY IF EXISTS "conversations_delete_own" ON public.conversations;
DROP POLICY IF EXISTS "messages_select_own" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_own" ON public.messages;
DROP POLICY IF EXISTS "credit_balances_select_own" ON public.credit_balances;
DROP POLICY IF EXISTS "credit_balances_update_own" ON public.credit_balances;
DROP POLICY IF EXISTS "credit_transactions_select_own" ON public.credit_transactions;

-- Profiles policies
CREATE POLICY "profiles_select_own" ON public.profiles 
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles 
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles 
  FOR UPDATE USING (auth.uid() = id);

-- Agents policies
CREATE POLICY "agents_select_own" ON public.agents 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "agents_insert_own" ON public.agents 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "agents_update_own" ON public.agents 
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "agents_delete_own" ON public.agents 
  FOR DELETE USING (auth.uid() = user_id);

-- Conversations policies
CREATE POLICY "conversations_select_own" ON public.conversations 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "conversations_insert_own" ON public.conversations 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "conversations_update_own" ON public.conversations 
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "conversations_delete_own" ON public.conversations 
  FOR DELETE USING (auth.uid() = user_id);

-- Messages policies (access through conversation ownership)
CREATE POLICY "messages_select_own" ON public.messages 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations c 
      WHERE c.id = conversation_id AND c.user_id = auth.uid()
    )
  );
CREATE POLICY "messages_insert_own" ON public.messages 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c 
      WHERE c.id = conversation_id AND c.user_id = auth.uid()
    )
  );

-- Credit balances policies
CREATE POLICY "credit_balances_select_own" ON public.credit_balances 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "credit_balances_update_own" ON public.credit_balances 
  FOR UPDATE USING (auth.uid() = user_id);

-- Credit transactions policies
CREATE POLICY "credit_transactions_select_own" ON public.credit_transactions 
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- TRIGGERS AND FUNCTIONS
-- ============================================

-- Create a trigger function to auto-create profiles and credit balances on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile with metadata from signup
  INSERT INTO public.profiles (id, first_name, last_name, institution, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'institution', NULL),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NULL)
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create initial credit balance with 50 free credits
  INSERT INTO public.credit_balances (user_id, balance, lifetime_earned)
  VALUES (NEW.id, 50, 50)
  ON CONFLICT (user_id) DO NOTHING;

  -- Record the initial credit transaction
  INSERT INTO public.credit_transactions (user_id, amount, type, description)
  VALUES (NEW.id, 50, 'bonus', 'Welcome bonus - 50 free credits');

  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to run on new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STORAGE BUCKET FOR AVATARS
-- ============================================

-- Create storage bucket for avatars (only if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies to avoid conflicts
DROP POLICY IF EXISTS "avatar_images_are_publicly_viewable" ON storage.objects;
DROP POLICY IF EXISTS "users_can_upload_avatars" ON storage.objects;
DROP POLICY IF EXISTS "users_can_update_avatars" ON storage.objects;
DROP POLICY IF EXISTS "users_can_delete_avatars" ON storage.objects;

-- Storage policies for avatars
CREATE POLICY "avatar_images_are_publicly_viewable" ON storage.objects 
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "users_can_upload_avatars" ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "users_can_update_avatars" ON storage.objects 
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "users_can_delete_avatars" ON storage.objects 
  FOR DELETE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
