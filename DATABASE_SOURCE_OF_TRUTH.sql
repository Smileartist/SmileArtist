-- =========================================
-- DATABASE SOURCE OF TRUTH
-- Smile Artist Schema
-- =========================================

-- USER PROFILES
CREATE TABLE profiles (
  id uuid PRIMARY KEY,
  full_name text,
  username text UNIQUE,
  avatar_url text,
  cover_url text,
  bio text,
  location text,
  is_motivator boolean,
  interests text[],
  created_at timestamptz,
  updated_at timestamptz,
  motivator_title text,
  motivator_bio text
);

-- POSTS
CREATE TABLE posts (
  id uuid PRIMARY KEY,
  title text,
  content text,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz,
  likes integer DEFAULT 0,
  comments integer DEFAULT 0,
  category text,
  categories text[]
);

-- COMMENTS
CREATE TABLE comments (
  id uuid PRIMARY KEY,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  content text,
  created_at timestamptz
);

-- POST LIKES
CREATE TABLE post_likes (
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  created_at timestamptz,
  PRIMARY KEY (user_id, post_id)
);

-- SAVED POSTS
CREATE TABLE saved_posts (
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  saved_at timestamptz,
  PRIMARY KEY (user_id, post_id)
);

-- READING HISTORY
CREATE TABLE reading_history (
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  read_at timestamptz,
  PRIMARY KEY (user_id, post_id)
);

-- FOLLOWS
CREATE TABLE follows (
  follower_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  following_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz,
  PRIMARY KEY (follower_id, following_id)
);

-- COLLECTIONS
CREATE TABLE collections (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  name text,
  description text,
  cover_color text,
  post_count integer DEFAULT 0,
  updated_at timestamptz
);

-- CHATS
CREATE TABLE chats (
  id uuid PRIMARY KEY,
  created_at timestamptz,
  last_message_at timestamptz
);

-- CHAT PARTICIPANTS
CREATE TABLE chat_participants (
  chat_id uuid REFERENCES chats(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (chat_id, user_id)
);

-- MESSAGES
CREATE TABLE messages (
  id uuid PRIMARY KEY,
  chat_id uuid REFERENCES chats(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  content text,
  created_at timestamptz,
  is_read boolean DEFAULT false
);

-- BUDDIES
CREATE TABLE buddies (
  id uuid PRIMARY KEY,
  user1_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  status text,
  initiated_at timestamptz
);

-- NOTIFICATIONS
CREATE TABLE notifications (
  id uuid PRIMARY KEY,
  recipient_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  type text,
  content text,
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  is_read boolean DEFAULT false,
  created_at timestamptz
);

-- =========================================
-- RELATIONSHIP MAP (for AI + docs)
-- =========================================

-- profiles.id → posts.user_id
-- profiles.id → comments.user_id
-- posts.id → comments.post_id
-- profiles.id → post_likes.user_id
-- posts.id → post_likes.post_id
-- profiles.id → saved_posts.user_id
-- posts.id → saved_posts.post_id
-- profiles.id → reading_history.user_id
-- posts.id → reading_history.post_id
-- profiles.id → follows.follower_id
-- profiles.id → follows.following_id
-- profiles.id → collections.user_id
-- profiles.id → chat_participants.user_id
-- chats.id → chat_participants.chat_id
-- profiles.id → messages.sender_id
-- chats.id → messages.chat_id
-- profiles.id → buddies.user1_id
-- profiles.id → buddies.user2_id
-- profiles.id → notifications.recipient_id
-- profiles.id → notifications.sender_id
-- posts.id → notifications.post_id

-- =========================================
-- INDEXES (performance)
-- =========================================

CREATE INDEX idx_posts_user ON posts(user_id);
CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_post_likes_post ON post_likes(post_id);
CREATE INDEX idx_saved_posts_post ON saved_posts(post_id);
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);
