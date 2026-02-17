import { supabase } from "./supabaseClient";

export async function handleLike(postId: string, currentLikes: number, userId: string): Promise<{ newLikes: number, isLiked: boolean }> {
  try {
    // First, check if the user has already liked the post
    const { data: existingLike, error: checkError } = await supabase
      .from("post_likes")
      .select("user_id")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .maybeSingle();

    if (checkError) throw checkError;

    let newLikes = currentLikes;
    let isLiked = false;

    if (existingLike) {
      // User has already liked, so unlike the post
      const { error: deleteError } = await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", userId);

      if (deleteError) throw deleteError;
      newLikes = Math.max(0, currentLikes - 1);
      isLiked = false;
    } else {
      // User has not liked, so like the post
      const { error: insertError } = await supabase
        .from("post_likes")
        .insert([{ post_id: postId, user_id: userId, created_at: new Date().toISOString() }]);

      if (insertError) throw insertError;
      newLikes = currentLikes + 1;
      isLiked = true;
    }

    // Update the likes count in the posts table
    const { error: updateError } = await supabase
      .from("posts")
      .update({ likes: newLikes })
      .eq("id", postId);

    if (updateError) throw updateError;

    return { newLikes, isLiked };
  } catch (error) {
    console.error("Error handling like:", error);
    throw error;
  }
}

export async function handleSave(postId: string, userId: string): Promise<boolean> {
  try {
    // Check if the post is already saved by the user
    const { data: existingSave, error: checkError } = await supabase
      .from("saved_posts")
      .select("user_id")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means no rows found
      throw checkError;
    }

    let isSaved = false;

    if (existingSave) {
      // Post is already saved, so unsave it
      const { error: deleteError } = await supabase
        .from("saved_posts")
        .delete()
        .eq("user_id", userId)
        .eq("post_id", postId);

      if (deleteError) throw deleteError;
      isSaved = false;
    } else {
      // Post is not saved, so save it
      const { error: insertError } = await supabase
        .from("saved_posts")
        .insert([{ post_id: postId, user_id: userId, saved_at: new Date().toISOString() }]);

      if (insertError) throw insertError;
      isSaved = true;
    }
    return isSaved;
  } catch (error) {
    console.error("Error handling save:", error);
    throw error;
  }
}

export async function handleComment(postId: string, userId: string, commentContent: string): Promise<void> {
  try {
    if (!commentContent.trim()) {
      console.warn("Comment content cannot be empty.");
      return;
    }

    // Generate a UUID for the comment (assuming it needs one for PRIMARY KEY)
    // Supabase can also handle this if the table has a default gen_random_uuid()
    const { error: insertError } = await supabase
      .from("comments")
      .insert([{ 
        id: crypto.randomUUID(), 
        post_id: postId, 
        user_id: userId, 
        content: commentContent,
        created_at: new Date().toISOString()
      }]);

    if (insertError) throw insertError;

    // Update the comments count in the posts table - fetching current and incrementing 
    // (Alternative to RPC if RPC doesn't exist yet)
    const { data: postData } = await supabase.from('posts').select('comments').eq('id', postId).single();
    const newCommentsCount = (postData?.comments || 0) + 1;

    const { error: updateError } = await supabase
      .from('posts')
      .update({ comments: newCommentsCount })
      .eq('id', postId);

    if (updateError) throw updateError;

    console.log("Comment added successfully!");
  } catch (error) {
    console.error("Error handling comment:", error);
    throw error;
  }
}
