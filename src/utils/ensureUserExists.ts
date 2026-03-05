import { supabase } from "./supabaseClient";

/**
 * Ensures a row exists in the `users` table for the given user ID.
 * This is required because several tables (comments, saved_posts, notifications, etc.)
 * have FK constraints pointing to `users`, not `profiles`.
 *
 * If the user row already exists, this is a no-op.
 */
export async function ensureUserExists(uid: string): Promise<void> {
    const { data } = await supabase
        .from("users")
        .select("id")
        .eq("id", uid)
        .maybeSingle();

    if (!data) {
        const { data: profile } = await supabase
            .from("profiles")
            .select("username, full_name")
            .eq("id", uid)
            .maybeSingle();

        await supabase.from("users").insert({
            id: uid,
            username: profile?.username || "user",
            name: profile?.full_name || profile?.username || "user",
            full_name: profile?.full_name || profile?.username || "user",
        });
    }
}
