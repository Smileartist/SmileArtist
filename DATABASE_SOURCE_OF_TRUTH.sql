create extension if not exists "pgcrypto";

-- ========================
-- PROFILES
-- ========================
create table profiles (
  id uuid primary key,
  full_name text,
  username text unique,
  avatar_url text,
  cover_url text,
  bio text,
  location text,
  is_motivator boolean default false,
  interests text[],
  motivator_title text,
  motivator_bio text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles
add constraint fk_profiles_auth
foreign key (id) references auth.users(id) on delete cascade;


-- ========================
-- USERS
-- ========================
create table users (
  id uuid primary key,
  name text,
  username text unique,
  avatar text,
  full_name text,
  created_at timestamptz default now()
);

alter table users
add constraint fk_users_auth
foreign key (id) references auth.users(id) on delete cascade;


-- ========================
-- POSTS
-- ========================
create table posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  user_id uuid not null,
  likes integer default 0,
  comments integer default 0,
  category text,
  categories text[],
  type text default 'poem',
  created_at timestamptz default now()
);

alter table posts
add constraint fk_posts_profiles
foreign key (user_id) references profiles(id) on delete cascade;


-- ========================
-- COMMENTS
-- ========================
create table comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null,
  user_id uuid not null,
  content text not null,
  likes integer default 0,
  created_at timestamptz default now()
);

alter table comments
add constraint fk_comments_posts
foreign key (post_id) references posts(id) on delete cascade;

alter table comments
add constraint fk_comments_users
foreign key (user_id) references users(id) on delete cascade;


-- ========================
-- SAVED POSTS
-- ========================
create table saved_posts (
  user_id uuid,
  post_id uuid,
  saved_at timestamptz default now(),
  primary key (user_id, post_id)
);

alter table saved_posts
add constraint fk_saved_users
foreign key (user_id) references users(id) on delete cascade;

alter table saved_posts
add constraint fk_saved_posts
foreign key (post_id) references posts(id) on delete cascade;


-- ========================
-- POST LIKES
-- ========================
create table post_likes (
  user_id uuid,
  post_id uuid,
  created_at timestamptz default now(),
  primary key (user_id, post_id)
);

alter table post_likes
add constraint fk_likes_profiles
foreign key (user_id) references profiles(id) on delete cascade;

alter table post_likes
add constraint fk_likes_posts
foreign key (post_id) references posts(id) on delete cascade;


-- ========================
-- FOLLOWS
-- ========================
create table follows (
  follower_id uuid,
  following_id uuid,
  created_at timestamptz default now(),
  primary key (follower_id, following_id)
);

alter table follows
add constraint fk_follows_follower
foreign key (follower_id) references profiles(id) on delete cascade;

alter table follows
add constraint fk_follows_following
foreign key (following_id) references profiles(id) on delete cascade;


-- ========================
-- COLLECTIONS
-- ========================
create table collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  description text,
  cover_color text,
  post_count integer default 0,
  updated_at timestamptz default now()
);

alter table collections
add constraint fk_collections_users
foreign key (user_id) references users(id) on delete cascade;


-- ========================
-- READING HISTORY
-- ========================
create table reading_history (
  user_id uuid,
  post_id uuid,
  read_at timestamptz default now(),
  primary key (user_id, post_id)
);

alter table reading_history
add constraint fk_history_users
foreign key (user_id) references users(id) on delete cascade;

alter table reading_history
add constraint fk_history_posts
foreign key (post_id) references posts(id) on delete cascade;


-- ========================
-- NOTIFICATIONS
-- ========================
create table notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null,
  sender_id uuid,
  post_id uuid,
  type text not null,
  content text,
  is_read boolean default false,
  created_at timestamptz default now()
);

alter table notifications
add constraint fk_notifications_recipient
foreign key (recipient_id) references users(id) on delete cascade;

alter table notifications
add constraint fk_notifications_sender
foreign key (sender_id) references users(id) on delete set null;

alter table notifications
add constraint fk_notifications_post
foreign key (post_id) references posts(id) on delete set null;


-- ========================
-- MATCHMAKING
-- ========================
create table matchmaking_queue (
  user_id uuid primary key,
  role text check (role in ('listener','seeker')),
  created_at timestamptz default now()
);

alter table matchmaking_queue
add constraint fk_queue_profiles
foreign key (user_id) references profiles(id) on delete cascade;


-- ========================
-- CHATS
-- ========================
create table chats (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  last_message_at timestamptz default now(),
  type text default 'normal',
  status text default 'temporary',
  is_anonymous boolean default false,
  expires_at timestamptz default (now() + interval '24 hours')
);


-- ========================
-- CHAT PARTICIPANTS
-- ========================
create table chat_participants (
  chat_id uuid,
  user_id uuid,
  primary key (chat_id, user_id)
);

alter table chat_participants
add constraint fk_chat_participants_chat
foreign key (chat_id) references chats(id) on delete cascade;

alter table chat_participants
add constraint fk_chat_participants_user
foreign key (user_id) references auth.users(id) on delete cascade;


-- ========================
-- MESSAGES
-- ========================
create table messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null,
  sender_id uuid not null,
  content text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

alter table messages
add constraint fk_messages_chat
foreign key (chat_id) references chats(id) on delete cascade;

alter table messages
add constraint fk_messages_sender
foreign key (sender_id) references auth.users(id) on delete cascade;


-- ========================
-- BUDDIES
-- ========================
create table buddies (
  id uuid primary key default gen_random_uuid(),
  user1_id uuid,
  user2_id uuid,
  status text default 'pending',
  initiated_at timestamptz default now(),
  unique(user1_id, user2_id)
);

alter table buddies
add constraint fk_buddies_user1
foreign key (user1_id) references users(id) on delete cascade;

alter table buddies
add constraint fk_buddies_user2
foreign key (user2_id) references users(id) on delete cascade;


-- ========================
-- COMMENT LIKES
-- ========================
create table comment_likes (
  user_id uuid,
  comment_id uuid,
  created_at timestamptz default now(),
  primary key (user_id, comment_id)
);

alter table comment_likes
add constraint fk_comment_likes_user
foreign key (user_id) references profiles(id) on delete cascade;

alter table comment_likes
add constraint fk_comment_likes_comment
foreign key (comment_id) references comments(id) on delete cascade;

-- Run this migration on existing DB:
-- alter table comments add column if not exists likes integer default 0;


-- ========================
-- POSTGRES RPC FUNCTIONS
-- (Run these in Supabase SQL Editor)
-- ========================

-- find_buddy_match: finds a waiting user with the opposite role,
-- creates a chat, adds both as participants, removes both from queue.
-- Returns the new chat_id, or NULL if no match found.
CREATE OR REPLACE FUNCTION find_buddy_match(p_user uuid, p_role text)
RETURNS uuid AS $$
DECLARE
  v_opposite_role text;
  v_other_user uuid;
  v_chat_id uuid;
BEGIN
  IF p_role = 'seeker' THEN
    v_opposite_role := 'listener';
  ELSE
    v_opposite_role := 'seeker';
  END IF;

  -- Find the earliest-queued user with the opposite role
  SELECT user_id INTO v_other_user
  FROM matchmaking_queue
  WHERE role = v_opposite_role AND user_id != p_user
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_other_user IS NULL THEN
    RETURN NULL;
  END IF;

  -- Create a new temporary buddy chat
  INSERT INTO chats (type, status, expires_at)
  VALUES ('buddy', 'temporary', now() + interval '24 hours')
  RETURNING id INTO v_chat_id;

  -- Add both users as participants
  INSERT INTO chat_participants (chat_id, user_id) VALUES (v_chat_id, p_user);
  INSERT INTO chat_participants (chat_id, user_id) VALUES (v_chat_id, v_other_user);

  -- Remove both from the queue
  DELETE FROM matchmaking_queue WHERE user_id IN (p_user, v_other_user);

  RETURN v_chat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ========================
-- RLS POLICIES FOR MESSAGES
-- (Run these in Supabase SQL Editor — simpler than the SECURITY DEFINER RPCs)
-- ========================

-- Allow authenticated users to INSERT their own messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can insert own messages" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());

-- Allow chat participants to SELECT messages in their chats
CREATE POLICY "chat participants can view messages" ON messages
  FOR SELECT TO authenticated
  USING (
    chat_id IN (
      SELECT chat_id FROM chat_participants WHERE user_id = auth.uid()
    )
  );


-- send_buddy_message: inserts a message into a chat the user participates in.
-- Uses SECURITY DEFINER to bypass RLS on the messages table.
CREATE OR REPLACE FUNCTION send_buddy_message(p_chat_id uuid, p_user_id uuid, p_content text)
RETURNS void AS $$
BEGIN
  -- Security check: user must be a participant in this chat
  IF NOT EXISTS (
    SELECT 1 FROM chat_participants
    WHERE chat_participants.chat_id = p_chat_id
      AND chat_participants.user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'User is not a participant in this chat';
  END IF;

  INSERT INTO messages (chat_id, sender_id, content)
  VALUES (p_chat_id, p_user_id, p_content);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- get_buddy_messages: returns all messages for a chat if the requesting user is a participant.
-- Uses SECURITY DEFINER to bypass RLS on the messages table.
CREATE OR REPLACE FUNCTION get_buddy_messages(p_chat_id uuid, p_user_id uuid)
RETURNS TABLE(
  id uuid,
  chat_id uuid,
  sender_id uuid,
  content text,
  is_read boolean,
  created_at timestamptz
) AS $$
BEGIN
  -- Security check: user must be a participant in this chat
  IF NOT EXISTS (
    SELECT 1 FROM chat_participants
    WHERE chat_participants.chat_id = p_chat_id
      AND chat_participants.user_id = p_user_id
  ) THEN
    RETURN; -- Return empty set if not a participant
  END IF;

  RETURN QUERY
  SELECT m.id, m.chat_id, m.sender_id, m.content, m.is_read, m.created_at
  FROM messages m
  WHERE m.chat_id = p_chat_id
  ORDER BY m.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- accept_buddy_request: marks the buddy_request as accepted
-- and makes the chat permanent (removes expiry).
CREATE OR REPLACE FUNCTION accept_buddy_request(p_chat_id uuid, p_user_a uuid, p_user_b uuid)
RETURNS void AS $$
BEGIN
  UPDATE buddy_requests
  SET status = 'accepted'
  WHERE chat_id = p_chat_id
    AND (
      (from_user = p_user_a AND to_user = p_user_b) OR
      (from_user = p_user_b AND to_user = p_user_a)
    );

  UPDATE chats
  SET status = 'permanent', expires_at = NULL
  WHERE id = p_chat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ========================
-- BUDDY REQUESTS
-- ========================
create table buddy_requests (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid,
  from_user uuid,
  to_user uuid,
  status text default 'pending',
  created_at timestamptz default now()
);

alter table buddy_requests
add constraint fk_buddy_requests_chat
foreign key (chat_id) references chats(id) on delete cascade;

alter table buddy_requests
add constraint fk_buddy_requests_from
foreign key (from_user) references profiles(id) on delete cascade;

alter table buddy_requests
add constraint fk_buddy_requests_to
foreign key (to_user) references profiles(id) on delete cascade;


-- ========================
-- ATOMIC COMMENT COUNT INCREMENT
-- (Prevents race conditions when multiple users comment simultaneously)
-- ========================
CREATE OR REPLACE FUNCTION increment_comment_count(p_post_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE posts SET comments = comments + 1 WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ========================
-- MIGRATION: Add type column to existing posts table
-- (Run this if the posts table already exists)
-- ========================
-- ALTER TABLE posts ADD COLUMN IF NOT EXISTS type text DEFAULT 'poem';


-- ========================
-- GET OR CREATE BUDDY CHAT
-- (Finds existing chat between two users, or creates a new one. 
-- Upgrades message_request chats to buddy chats if found.)
-- ========================
CREATE OR REPLACE FUNCTION get_or_create_buddy_chat(p_user_id uuid, p_buddy_id uuid)
RETURNS uuid AS $$
DECLARE
  v_chat_id uuid;
BEGIN
  -- Look for ANY chat between these two.
  -- ORDER BY:
  -- 1. Most recent activity (last_message_at DESC NULLS LAST)
  -- 2. Number of messages
  -- 3. Status 'permanent' or 'active' (Prefer settled chats)
  -- 4. Type 'buddy'
  -- 5. Most recent creation
  SELECT c.id INTO v_chat_id
  FROM chats c
  JOIN chat_participants cp1 ON c.id = cp1.chat_id
  JOIN chat_participants cp2 ON c.id = cp2.chat_id
  WHERE cp1.user_id = p_user_id
    AND cp2.user_id = p_buddy_id
  ORDER BY 
    c.last_message_at DESC NULLS LAST,
    (SELECT count(*) FROM messages m WHERE m.chat_id = c.id) DESC,
    (c.status IN ('permanent', 'active')) DESC,
    (c.type = 'buddy') DESC,
    c.created_at DESC
  LIMIT 1;

  IF v_chat_id IS NULL THEN
    -- Create new permanent buddy chat
    INSERT INTO chats (type, status, last_message_at, is_anonymous)
    VALUES ('buddy', 'permanent', now(), false)
    RETURNING id INTO v_chat_id;

    -- Add both participants
    INSERT INTO chat_participants (chat_id, user_id)
    VALUES (v_chat_id, p_user_id), (v_chat_id, p_buddy_id);
  ELSE
    -- If it's a message_request or temporary, upgrade it to buddy
    UPDATE chats 
    SET type = 'buddy', status = 'permanent', is_anonymous = false 
    WHERE id = v_chat_id 
    AND (type = 'message_request' OR status = 'temporary' OR is_anonymous = true);
  END IF;

  RETURN v_chat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ========================
-- GET OR CREATE MESSAGE REQUEST CHAT
-- (Finds existing chat or creates a new one marked as 'message_request')
-- ========================
CREATE OR REPLACE FUNCTION get_or_create_message_request_chat(p_user_id uuid, p_target_id uuid)
RETURNS uuid AS $$
DECLARE
  v_chat_id uuid;
BEGIN
  -- Look for ANY chat between these two
  -- ORDER BY:
  -- 1. Most recent activity
  -- 2. Number of messages
  -- 3. Status 'permanent' or 'active'
  -- 4. Most recent creation
  SELECT c.id INTO v_chat_id
  FROM chats c
  JOIN chat_participants cp1 ON c.id = cp1.chat_id
  JOIN chat_participants cp2 ON c.id = cp2.chat_id
  WHERE cp1.user_id = p_user_id
    AND cp2.user_id = p_target_id
  ORDER BY 
    c.last_message_at DESC NULLS LAST,
    (SELECT count(*) FROM messages m WHERE m.chat_id = c.id) DESC,
    (c.status IN ('permanent', 'active')) DESC,
    c.created_at DESC
  LIMIT 1;

  IF v_chat_id IS NOT NULL THEN
    RETURN v_chat_id;
  END IF;

  -- Create new message request chat
  INSERT INTO chats (type, status, last_message_at)
  VALUES ('message_request', 'temporary', now())
  RETURNING id INTO v_chat_id;

  -- Add both participants
  INSERT INTO chat_participants (chat_id, user_id)
  VALUES (v_chat_id, p_user_id), (v_chat_id, p_target_id);

  RETURN v_chat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



-- ========================
-- HELPER FUNCTION FOR CHAT RLS
-- (Bypasses RLS to avoid infinite recursion when policies query themselves)
-- ========================
CREATE OR REPLACE FUNCTION is_chat_participant(check_chat_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM chat_participants 
    WHERE chat_id = check_chat_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ========================
-- RLS POLICIES FOR CHATS
-- (Allow participants to view/update their own chats)
-- ========================
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat participants can view chats" ON chats
  FOR SELECT TO authenticated
  USING (is_chat_participant(id));

CREATE POLICY "chat participants can update chats" ON chats
  FOR UPDATE TO authenticated
  USING (is_chat_participant(id));


-- ========================
-- RLS POLICIES FOR CHAT_PARTICIPANTS
-- (Allow participants to view participants of their chats)
-- ========================
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can view their chat participants" ON chat_participants
  FOR SELECT TO authenticated
  USING (is_chat_participant(chat_id));

-- ========================
-- ATOMIC LIKE COUNT INCREMENT/DECREMENT
-- (Bypasses RLS to allow any authenticated user to update the post's like count)
-- ========================

CREATE OR REPLACE FUNCTION increment_like_count(p_post_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE posts SET likes = likes + 1 WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_like_count(p_post_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE posts SET likes = GREATEST(0, likes - 1) WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Run this in your Supabase SQL Editor to fix the Image Upload RLS Error

-- 1. Create the "chat-images" bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-images', 'chat-images', true) 
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Drop any prior generic policies that might conflict
DROP POLICY IF EXISTS "Public select for chat-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to chat-images" ON storage.objects;

-- 3. Create the SELECT public policy
CREATE POLICY "Public select for chat-images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'chat-images');

-- 4. Create the INSERT policy for authenticated users
CREATE POLICY "Authenticated users can upload to chat-images" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'chat-images');
