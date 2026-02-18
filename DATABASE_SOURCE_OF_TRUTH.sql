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
foreign key (from_user) references profiles(id);

alter table buddy_requests
add constraint fk_buddy_requests_to
foreign key (to_user) references profiles(id);
