--- Create the 'public' schema if it doesn't exist (Supabase usually handles this)
-- CREATE SCHEMA IF NOT EXISTS public;

--- 1. Users Table (Assuming it's extended from auth.users or a separate profile table)
-- If you have a separate profiles table, adjust this. For now, assuming relevant columns
-- are either directly in auth.users or joined. This schema focuses on data used in the app.
-- You might already have a 'profiles' table linked to 'auth.users'.
-- For this task, we will assume a 'users' table that stores additional profile information.
CREATE TABLE IF NOT EXISTS public.users (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    name text,
    username text UNIQUE,
    avatar text,
    created_at timestamp with time zone DEFAULT now()
);

-- RLS for users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile." ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile." ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile." ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

--- 2. Posts Table
CREATE TABLE IF NOT EXISTS public.posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    content text NOT NULL,
    author_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    likes integer DEFAULT 0,
    comments integer DEFAULT 0,
    category text
);

-- RLS for posts table
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Posts are viewable by everyone." ON public.posts
  FOR SELECT USING (true);

CREATE POLICY "Users can create their own posts." ON public.posts
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own posts." ON public.posts
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own posts." ON public.posts
  FOR DELETE USING (auth.uid() = author_id);

--- 3. Saved Posts Table (junction table)
CREATE TABLE IF NOT EXISTS public.saved_posts (
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
    saved_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (user_id, post_id)
);

-- RLS for saved_posts table
ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved posts." ON public.saved_posts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can save posts." ON public.saved_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave posts." ON public.saved_posts
  FOR DELETE USING (auth.uid() = user_id);

--- 4. Collections Table
CREATE TABLE IF NOT EXISTS public.collections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    description text,
    cover_color text,
    post_count integer DEFAULT 0,
    updated_at timestamp with time zone DEFAULT now()
);

-- RLS for collections table
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own collections." ON public.collections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own collections." ON public.collections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collections." ON public.collections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collections." ON public.collections
  FOR DELETE USING (auth.uid() = user_id);

--- 5. Reading History Table
CREATE TABLE IF NOT EXISTS public.reading_history (
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
    read_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (user_id, post_id)
);

-- RLS for reading_history table
ALTER TABLE public.reading_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reading history." ON public.reading_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their reading history." ON public.reading_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete from their reading history." ON public.reading_history
  FOR DELETE USING (auth.uid() = user_id);

--- 6. Notifications Table
CREATE TYPE notification_type AS ENUM (
    'like',
    'comment',
    'follow',
    'mention',
    'buddy_request',
    'buddy_accepted',
    'milestone'
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    sender_id uuid REFERENCES public.users(id) ON DELETE SET NULL, -- Can be NULL for system notifications
    type notification_type NOT NULL,
    content text, -- e.g., comment text, mention context, milestone message, buddy accepted message
    post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL, -- Relevant for like, comment, mention
    is_read boolean DEFAULT FALSE,
    created_at timestamp with time zone DEFAULT now()
);

-- RLS for notifications table
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications." ON public.notifications
  FOR SELECT USING (auth.uid() = recipient_id);

CREATE POLICY "Users can update their own notifications (mark as read)." ON public.notifications
  FOR UPDATE USING (auth.uid() = recipient_id);

-- Policy for inserting notifications (e.g., from server-side functions or triggers)
-- This policy allows inserts by authenticated users, but a more robust system might use
-- a custom function or service role key for inserting notifications from your backend logic.
-- For a simple client-side driven scenario:
CREATE POLICY "Authenticated users can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- The frontend currently expects sender_name, sender_username, sender_avatar and post_title.
-- These would typically be fetched via JOINs in a Supabase query, not stored directly in the notifications table.
-- The SQL above reflects a normalized schema. The frontend query would look something like:
-- .select(`
--   id, type, content, is_read, created_at, post_id,
--   sender:users(name, username, avatar),
--   post:posts(title)
-- `)

-- You may also need to create indexes for performance on frequently queried columns,
-- for example, on user_id in saved_posts, reading_history, and recipient_id in notifications.
CREATE INDEX IF NOT EXISTS idx_saved_posts_user_id ON public.saved_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_history_user_id ON public.reading_history(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON public.posts(author_id);