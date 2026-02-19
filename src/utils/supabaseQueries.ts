import { supabase } from "./supabaseClient";

// =========================================
// TYPES
// =========================================

export interface Post {
  postId: string;
  title: string;
  content: string;
  user_id: string;
  created_at: string;
  likes: number;
  comments: number;
  category: string;
  author: {
    full_name: string;
    username: string;
    avatar_url: string;
  };
}

interface TrendingAuthor {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string;
  followers: string;
  posts_count: number;
  total_likes: number;
}

interface TrendingTopic {
  name: string;
  count: string;
  trending: string;
}

export interface User {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string;
}

// =========================================
// HELPER FUNCTIONS
// =========================================

const getTimeFilterDate = (timeFilter: "today" | "week" | "month" | "all"): Date | null => {
  const now = new Date();
  switch (timeFilter) {
    case "today":
      now.setHours(0, 0, 0, 0);
      return now;
    case "week":
      const dayOfWeek = now.getDay(); // Sunday - Saturday : 0 - 6
      const diffToMonday = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diffToMonday));
      monday.setHours(0, 0, 0, 0);
      return monday;
    case "month":
      now.setDate(1);
      now.setHours(0, 0, 0, 0);
      return now;
    case "all":
      return null;
    default:
      return null;
  }
};

// =========================================
// EXISTING TRENDING QUERIES
// =========================================

export const getTrendingPosts = async (timeFilter: "today" | "week" | "month" | "all"): Promise<Post[]> => {
  let query = supabase
    .from("posts")
    .select(
      `
      id,
      title,
      content,
      likes,
      comments,
      created_at,
      category,
      user_id,
      author:user_id (
        full_name,
        username,
        avatar_url
      )
    `
    )
    .order("likes", { ascending: false })
    .order("comments", { ascending: false })
    .limit(10);

  const filterDate = getTimeFilterDate(timeFilter);
  if (filterDate) {
    query = query.gte("created_at", filterDate.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching trending posts desarialise:", error);
    return [];
  }

  return (data as any[]).map(rawPost => {
    const author = Array.isArray(rawPost.author) ? rawPost.author[0] : rawPost.author;
    
    return {
      postId: rawPost.id,
      title: rawPost.title || "Untitled",
      content: rawPost.content,
      user_id: rawPost.user_id || "", 
      created_at: rawPost.created_at,
      likes: rawPost.likes,
      comments: rawPost.comments,
      category: rawPost.category || "",
      author: {
        full_name: author?.full_name || "Unknown",
        username: author?.username || "unknown",
        avatar_url: author?.avatar_url || "",
      },
    };
  }) as Post[];
};

export const getTrendingAuthors = async (timeFilter: "today" | "week" | "month" | "all"): Promise<TrendingAuthor[]> => {
  const filterDate = getTimeFilterDate(timeFilter);

  let query = supabase
    .from("posts")
    .select(
      `
      likes,
      user_id,
      author:user_id (
        full_name,
        username,
        avatar_url
      )
      `
    );

  if (filterDate) {
    query = query.gte("created_at", filterDate.toISOString());
  }

  const { data: postsDataRaw, error: postsError } = await query;

  if (postsError) {
    console.error("Error fetching posts for trending authors desarialise:", postsError);
    return [];
  }

  const authorStats: { [key: string]: { id: string; full_name: string; username: string; avatar_url: string; posts_count: number; total_likes: number } } = {};

  (postsDataRaw as any[]).forEach(post => {
    const author = Array.isArray(post.author) ? post.author[0] : post.author;
    
    if (post.user_id && author && author.full_name && author.username && author.avatar_url) {
      const authorId = post.user_id;
      if (!authorStats[authorId]) {
        authorStats[authorId] = {
          id: authorId,
          full_name: author.full_name,
          username: author.username,
          avatar_url: author.avatar_url,
          posts_count: 0,
          total_likes: 0,
        };
      }
      authorStats[authorId].posts_count++;
      authorStats[authorId].total_likes += post.likes;
    }
  });

  const sortedAuthors = Object.values(authorStats).sort((a, b) => b.total_likes - a.total_likes).slice(0, 5);

  return sortedAuthors.map(author => ({
    ...author,
    followers: "N/A", // Placeholder for now
  }));
};

export const getTrendingTopics = async (timeFilter: "today" | "week" | "month" | "all"): Promise<TrendingTopic[]> => {
  let query = supabase
    .from("posts")
    .select(`category, id`);
  
  const filterDate = getTimeFilterDate(timeFilter);
  if (filterDate) {
    query = query.gte("created_at", filterDate.toISOString());
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching trending topics desarialise:", error);
    return [];
  }

  interface RawSupabaseTopicData {
    category: string | null;
    id: string;
  }

  const typedData: RawSupabaseTopicData[] = data as RawSupabaseTopicData[];

  const topicCounts: { [key: string]: number } = {};
  typedData.forEach(post => {
    if (post.category) {
      topicCounts[post.category] = (topicCounts[post.category] || 0) + 1;
    }
  });

  const sortedTopics = Object.entries(topicCounts)
    .sort(([, countA], [, countB]) => countB - countA)
    .slice(0, 5) 
    .map(([name, count]) => ({
      name,
      count: `${count} posts`, 
      trending: "N/A", 
    }));

  return sortedTopics;
};

// =====================================================
// TALKING BUDDY QUERIES (ADDED MISSING EXPORTS)
// =====================================================

export const findBuddyMatch = async (userId: string, role: "listener" | "seeker") => {
  const { data, error } = await supabase.rpc("find_buddy_match", {
    p_user: userId,
    p_role: role,
  });

  if (error) {
    console.error("Matchmaking error desarialise:", error);
    throw error;
  }
  return data; 
};

export const sendBuddyMessage = async (chatId: string, userId: string, content: string, id?: string) => {
  const { error } = await supabase.from("messages").insert({
    ...(id ? { id } : {}), // use caller-supplied UUID so Broadcast + postgres_changes share the same ID
    chat_id: chatId,
    sender_id: userId,
    content,
  });

  if (error) {
    console.error("Send message error desarialise:", error);
    throw error;
  }
};

// sendBuddyMessageRpc: calls the SECURITY DEFINER RPC 'send_buddy_message'
// which bypasses RLS on the messages table.
// Run the SQL in DATABASE_SOURCE_OF_TRUTH.sql in Supabase SQL Editor first.
export const sendBuddyMessageRpc = async (chatId: string, userId: string, content: string) => {
  const { error } = await supabase.rpc("send_buddy_message", {
    p_chat_id: chatId,
    p_user_id: userId,
    p_content: content,
  });

  if (error) {
    console.error("sendBuddyMessageRpc error:", error);
    throw error;
  }
};

export const getChatMessages = async (chatId: string) => {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Fetch messages error desarialise:", error);
    throw error;
  }
  return data;
};

// getBuddyMessages: calls the SECURITY DEFINER RPC 'get_buddy_messages'
// which bypasses RLS and returns all messages for a chat the user participates in.
// Run the SQL in DATABASE_SOURCE_OF_TRUTH.sql in Supabase SQL Editor first.
export const getBuddyMessages = async (chatId: string, userId: string) => {
  const { data, error } = await supabase.rpc("get_buddy_messages", {
    p_chat_id: chatId,
    p_user_id: userId,
  });

  if (error) {
    console.error("getBuddyMessages RPC error:", error);
    throw error;
  }
  return data as Array<{
    id: string;
    chat_id: string;
    sender_id: string;
    content: string;
    is_read: boolean;
    created_at: string;
  }>;
};

export const sendBuddyRequest = async (chatId: string, fromUser: string, toUser: string) => {
  const { error } = await supabase.from("buddy_requests").insert({
    chat_id: chatId,
    from_user: fromUser,
    to_user: toUser,
  });

  if (error) {
    console.error("Buddy request error desarialise:", error);
    throw error;
  }
};

export const acceptBuddyRequest = async (chatId: string, userA: string, userB: string) => {
  const { error } = await supabase.rpc("accept_buddy_request", {
    p_chat_id: chatId,
    p_user_a: userA,
    p_user_b: userB,
  });

  if (error) {
    console.error("Accept buddy error desarialise:", error);
    throw error;
  }
};

export const cancelMatchmaking = async (userId: string) => {
  const { error } = await supabase
    .from("matchmaking_queue")
    .delete()
    .eq("user_id", userId);

  if (error) {
    console.error("Cancel matchmaking error desarialise:", error);
    throw error;
  }
};

// =========================================
// SEARCH QUERIES
// =========================================

export const searchPosts = async (query: string): Promise<Post[]> => {
  if (!query) return [];

  const { data, error } = await supabase
    .from("posts")
    .select(
      `
      id,
      title,
      content,
      likes,
      comments,
      created_at,
      category,
      user_id,
      author:user_id (
        full_name,
        username,
        avatar_url
      )
    `
    )
    .or(`title.ilike.%${query}%,content.ilike.%${query}%,category.ilike.%${query}%`);

  if (error) {
    console.error("Error searching posts desarialise:", error);
    return [];
  }

  return (data as any[]).map(rawPost => {
    const author = Array.isArray(rawPost.author) ? rawPost.author[0] : rawPost.author;
    
    return {
      postId: rawPost.id,
      title: rawPost.title || "Untitled",
      content: rawPost.content,
      user_id: rawPost.user_id || "", 
      created_at: rawPost.created_at, 
      likes: rawPost.likes,
      comments: rawPost.comments,
      category: rawPost.category || "",
      author: {
        full_name: author?.full_name || "Unknown",
        username: author?.username || "unknown",
        avatar_url: author?.avatar_url || "",
      },
    };
  }) as Post[];
};

export const searchUsers = async (query: string): Promise<User[]> => {
  if (!query) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
      id,
      full_name,
      username,
      avatar_url
    `
    )
    .or(`full_name.ilike.%${query}%,username.ilike.%${query}%`);

  if (error) {
    console.error("Error searching users desarialise:", error);
    return [];
  }

  return (data as any[]).map(rawUser => ({
    id: rawUser.id,
    full_name: rawUser.full_name || "",
    username: rawUser.username || "",
    avatar_url: rawUser.avatar_url || "",
  })) as User[];
};
