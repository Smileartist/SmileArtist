import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useUserData } from "../App";
import { MapPin, Calendar, Edit2, Users, BookOpen, Award, Save, X, Image as ImageIcon, Trash2, Camera, Upload, UserPlus, UserCheck, Clock, Share2, Smile } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Button } from "./ui/button";
import { PostCard } from "./PostCard";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { supabase } from "../utils/supabaseClient";
import { ensureUserExists } from "../utils/ensureUserExists";
import { toast } from "sonner";
import { Checkbox } from "./ui/checkbox";

interface ProfilePageProps {
  onViewChange?: (view: string, userId?: string | null) => void;
  userId: string;
}

export function ProfilePage({ onViewChange, userId }: ProfilePageProps) {
  const { refreshAvatar } = useUserData();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  
  // Follower list for the Followers tab
  const [followersList, setFollowersList] = useState<any[]>([]);

  // Edit form state
  const [editFullName, setEditFullName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [editCoverUrl, setEditCoverUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [editIsMotivator, setEditIsMotivator] = useState(false);
  const [editInterests, setEditInterests] = useState<string[]>([]);
  const [newInterest, setNewInterest] = useState("");
  const [editMotivatorTitle, setEditMotivatorTitle] = useState("");
  const [editMotivatorBio, setEditMotivatorBio] = useState("");

  const fetchFollowData = async (currId: string | null, targetIdInput?: string) => {
    const activeTargetId = targetIdInput || targetUuid;
    if (!activeTargetId) return;
    const { count: followers } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", activeTargetId);
    setFollowerCount(followers ?? 0);

    // Fetch following count
    const { count: following } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", activeTargetId);
    setFollowingCount(following ?? 0);

    // Fetch the actual followers list for the tab
    const { data: followersData } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("following_id", activeTargetId);
      
    if (followersData && followersData.length > 0) {
      const followerIds = followersData.map(f => f.follower_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url")
        .in("id", followerIds);
      setFollowersList(profiles || []);
    } else {
      setFollowersList([]);
    }

    if (!currId || currId === activeTargetId) {
      setIsFollowing(false);
      return;
    }
    
    if (currId && currId !== activeTargetId) {
      const { data } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", currId)
        .eq("following_id", activeTargetId)
        .maybeSingle();
      setIsFollowing(!!data);
    }
  };

  const handleFollow = async () => {
    if (!currentUserId) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await supabase.from("follows").delete()
          .eq("follower_id", currentUserId)
          .eq("following_id", targetUuid);
        setIsFollowing(false);
        setFollowerCount(c => Math.max(0, c - 1));
        toast.success("Unfollowed");
      } else {
        await supabase.from("follows").insert({
          follower_id: currentUserId,
          following_id: targetUuid,
        });
        setIsFollowing(true);
        setFollowerCount(c => c + 1);
        // Send follow notification
        await ensureUserExists(currentUserId);
        if (targetUuid) await ensureUserExists(targetUuid);
        await supabase.from("notifications").insert({
          recipient_id: targetUuid,
          sender_id: currentUserId,
          type: "follow",
          content: "started following you",
          is_read: false,
        });
        toast.success("Following! 🎉");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update follow status");
    } finally {
      setFollowLoading(false);
    }
  };

  const handleRemoveFollower = async (followerIdToRemove: string) => {
    if (!currentUserId || !isOwnProfile) return; // Only allow removing your own followers
    try {
      await supabase.from("follows").delete()
        .eq("follower_id", followerIdToRemove)
        .eq("following_id", currentUserId); // currentUserId is the following_id here because it's YOUR profile
      
      setFollowerCount(c => Math.max(0, c - 1));
      setFollowersList(prev => prev.filter(f => f.id !== followerIdToRemove));
      toast.success("Follower removed");
    } catch (err: any) {
      toast.error(err.message || "Failed to remove follower");
    }
  };

  const [targetUuid, setTargetUuid] = useState<string | null>(null);

  useEffect(() => {
    const resolveAndFetch = async () => {
      setLoading(true);
      try {
        let resolvedId = userId;
        // If it's a username (e.g., '@dhruvv' or just 'dhruvv' without dashes)
        if (userId && (userId.includes('@') || !userId.includes('-'))) {
          const cleanUsername = userId.replace('@', '');
          const { data, error } = await supabase
            .from("profiles")
            .select("id")
            .eq("username", cleanUsername)
            .maybeSingle();
          if (data) {
            resolvedId = data.id;
          }
        }
        
        setTargetUuid(resolvedId);
        if (resolvedId && currentUserId) {
          checkBuddyStatus(resolvedId);
          fetchFollowData(currentUserId, resolvedId);
        }

        // Now fetch full profile data using resolvedId
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", resolvedId)
          .maybeSingle();

        if (profileError) throw profileError;
        if (profile) {
          setProfileData(profile);
          setEditFullName(profile.full_name || "");
          setEditBio(profile.bio || "");
          setEditLocation(profile.location || "");
          setEditAvatarUrl(profile.avatar_url || "");
          setEditCoverUrl(profile.cover_url || "");
          setEditIsMotivator(profile.is_motivator || false);
          setEditInterests(profile.interests || []);
          setEditMotivatorTitle(profile.motivator_title || "");
          setEditMotivatorBio(profile.motivator_bio || "");
        } else {
          setProfileData({});
        }

        const { data: posts } = await supabase
          .from("posts")
          .select("*")
          .eq("user_id", resolvedId)
          .order("created_at", { ascending: false });

        const formattedPosts = (posts || []).map((post: any) => ({
          postId: post.id,
          user_id: post.user_id,
          author: {
            full_name: profile?.full_name || profile?.username || "User",
            username: profile?.username || "user",
            avatar_url: profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || profile?.username || "user")}&background=random`,
          },
          title: post.title,
          content: post.content,
          likes: post.likes || 0,
          comments: post.comments || 0,
          created_at: post.created_at ? new Date(post.created_at).toLocaleDateString() : "Just now",
          category: post.category || "General",
        }));

        setUserPosts(formattedPosts);
      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) resolveAndFetch();
  }, [userId]);

  // Determine if this profile belongs to the logged-in user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (targetUuid) {
      // Realtime subscription for follow count
      const subscription = supabase
        .channel(`profile_followers:${targetUuid}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "follows", filter: `following_id=eq.${targetUuid}` },
          () => {
            fetchFollowData(currentUserId);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [targetUuid, currentUserId]);

  // Removed redundant buddy/follow effect as it is now handled in resolveAndFetch and on login
  
  useEffect(() => {
    if (currentUserId && targetUuid && currentUserId !== targetUuid) {
      checkBuddyStatus();
      fetchFollowData(currentUserId);
    } else if (targetUuid && currentUserId === targetUuid) {
      setBuddyStatus(null);
    }
  }, [currentUserId, targetUuid]); // re-run if target user or current user changes

  const isOwnProfile = currentUserId === targetUuid;

  // ── Buddy system ──────────────────────────────────────────────
  // Grid post modal
  const [selectedPost, setSelectedPost] = useState<any>(null);

  // Buddies list for the Buddies tab
  const [buddiesList, setBuddiesList] = useState<any[]>([]);
  const [buddyCount, setBuddyCount] = useState(0);

  const fetchBuddies = async () => {
    if (!userId || !targetUuid) return;
    const { data, error } = await supabase
      .from('buddy_requests')
      .select('from_user, to_user')
      .eq('status', 'accepted')
      .or(`from_user.eq.${targetUuid},to_user.eq.${targetUuid}`);

    if (error || !data) return;

    // Use a Set to deduplicate buddy IDs
    const uniqueBuddyIds = new Set<string>();
    data.forEach((req: any) => {
      const otherId = req.from_user === targetUuid ? req.to_user : req.from_user;
      if (otherId) uniqueBuddyIds.add(otherId);
    });

    // Set buddy count to the number of unique buddies
    setBuddyCount(uniqueBuddyIds.size);

    // Batch-fetch all buddy profiles in one query instead of N+1
    const buddyIds = Array.from(uniqueBuddyIds);
    if (buddyIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .in('id', buddyIds);
      setBuddiesList(profiles || []);
    } else {
      setBuddiesList([]);
    }
  };

  const [buddyStatus, setBuddyStatus] = useState<null | 'pending_sent' | 'pending_received' | 'accepted'>(null);
  const [buddyRequestId, setBuddyRequestId] = useState<string | null>(null);
  const [buddyLoading, setBuddyLoading] = useState(false);

  const checkBuddyStatus = async (targetIdInput?: string) => {
    const activeTargetId = targetIdInput || targetUuid;
    if (!currentUserId || !activeTargetId || currentUserId === activeTargetId) return;
    const { data: results } = await supabase
      .from('buddy_requests')
      .select('id, status, from_user, to_user')
      .or(`and(from_user.eq.${currentUserId},to_user.eq.${activeTargetId}),and(from_user.eq.${activeTargetId},to_user.eq.${currentUserId})`);

    if (!results || results.length === 0) { 
      setBuddyStatus(null); 
      setBuddyRequestId(null); 
      return; 
    }

    // Prioritize 'accepted' status if multiple exist
    const acceptedRequest = results.find(r => r.status === 'accepted');
    const data = acceptedRequest || results[0];

    setBuddyRequestId(data.id);
    if (data.status === 'accepted') setBuddyStatus('accepted');
    else if (data.from_user === currentUserId) setBuddyStatus('pending_sent');
    else setBuddyStatus('pending_received');
  };

  useEffect(() => {
    fetchBuddies();
  }, [targetUuid]);

  // ensureUserExists is now imported from ../utils/ensureUserExists

  const sendBuddyRequest = async () => {
    if (!currentUserId) return;
    setBuddyLoading(true);
    try {
      const { data, error } = await supabase
        .from('buddy_requests')
        .insert({ from_user: currentUserId, to_user: targetUuid, status: 'pending' })
        .select()
        .single();
      if (error) throw error;
      setBuddyStatus('pending_sent');
      setBuddyRequestId(data.id);

      // Notify receiver
      await ensureUserExists(currentUserId);
      if (targetUuid) await ensureUserExists(targetUuid);
      await supabase.from('notifications').insert({
        recipient_id: targetUuid,
        sender_id: currentUserId,
        type: 'buddy_request',
        content: 'sent you a buddy request',
        is_read: false,
      });
      toast.success('Buddy request sent!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send buddy request');
    } finally {
      setBuddyLoading(false);
    }
  };

  const acceptBuddyRequest = async () => {
    if (!buddyRequestId || !currentUserId) return;
    setBuddyLoading(true);
    try {
      await supabase.from('buddy_requests').update({ status: 'accepted' }).eq('id', buddyRequestId);

      // Create or Upgrade a permanent buddy chat using the RPC to prevent duplicates
      const { data: chatId, error: chatError } = await supabase.rpc("get_or_create_buddy_chat", {
        p_user_id: currentUserId,
        p_buddy_id: targetUuid
      });
      if (chatError) throw chatError;

      // Update the buddy request with the chat_id for reference
      await supabase.from('buddy_requests').update({ chat_id: chatId }).eq('id', buddyRequestId);

      // Notify the sender
      await ensureUserExists(currentUserId);
      await supabase.from('notifications').insert({
        recipient_id: targetUuid,
        sender_id: currentUserId,
        type: 'buddy_accepted',
        content: 'accepted your buddy request',
        is_read: false,
      });

      setBuddyStatus('accepted');
      toast.success('You are now buddies! Start chatting 💬');
    } catch (err: any) {
      toast.error(err.message || 'Failed to accept request');
    } finally {
      setBuddyLoading(false);
    }
  };

  const removeBuddy = async (buddyIdToRemove: string) => {
    if (!currentUserId) return;
    try {
      // Find the buddy request connecting these two
      const { data: request } = await supabase
        .from('buddy_requests')
        .select('id, chat_id')
        .eq('status', 'accepted')
        .or(`and(from_user.eq.${currentUserId},to_user.eq.${buddyIdToRemove}),and(from_user.eq.${buddyIdToRemove},to_user.eq.${currentUserId})`)
        .maybeSingle();

      if (request) {
        // Delete the buddy request
        await supabase.from('buddy_requests').delete().eq('id', request.id);
        
        // Ensure chat status gets downgraded or deleted. We'll simply let their connection break.
        // If they had a buddy chat, we can optionally downgrade it or drop them as participants,
        // but physically removing the buddy request record breaks the buddy bond.
      }

      setBuddiesList(prev => prev.filter(b => b.id !== buddyIdToRemove));
      setBuddyCount(c => Math.max(0, c - 1));
      
      // If we are currently on the removed buddy's profile, reset buddyStatus
      if (buddyIdToRemove === targetUuid || buddyIdToRemove === userId) {
        setBuddyStatus(null);
        setBuddyRequestId(null);
      }
      
      toast.success("Buddy removed");
    } catch (err: any) {
      toast.error(err.message || "Failed to remove buddy");
    }
  };

  // ──────────────────────────────────────────────────────────────

  // Share this profile's link
  const handleShareProfile = () => {
    const url = `${window.location.origin}?profile=${profileData?.username || targetUuid || userId}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Profile link copied to clipboard! 🔗");
    });
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("No authenticated user");

      let newAvatarUrl = editAvatarUrl;
      let newCoverUrl = editCoverUrl;

      // Handle avatar upload
      if (avatarFile) {
        const fileExt = avatarFile.name.split(".").pop();
        const fileName = `${authUser.id}/avatar-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, avatarFile, { cacheControl: "3600", upsert: true });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(fileName);
        newAvatarUrl = publicUrl;
      } else if (editAvatarUrl === "" && profileData?.avatar_url) {
        // If avatar was cleared and there was a previous avatar, delete from storage
        const previousAvatarFileName = profileData.avatar_url.split("/").pop();
        if (previousAvatarFileName) {
          const { error: deleteError } = await supabase.storage.from("avatars").remove([`${authUser.id}/${previousAvatarFileName}`]);
          if (deleteError) console.error("Error deleting previous avatar:", deleteError);
        }
      }

      // Handle cover upload
      if (coverFile) {
        const fileExt = coverFile.name.split(".").pop();
        const fileName = `${authUser.id}/cover-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("covers").upload(fileName, coverFile, { cacheControl: "3600", upsert: true });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from("covers").getPublicUrl(fileName);
        newCoverUrl = publicUrl;
      } else if (editCoverUrl === "" && profileData?.cover_url) {
        // If cover was cleared and there was a previous cover, delete from storage
        const previousCoverFileName = profileData.cover_url.split("/").pop();
        if (previousCoverFileName) {
          const { error: deleteError } = await supabase.storage.from("covers").remove([`${authUser.id}/${previousCoverFileName}`]);
          if (deleteError) console.error("Error deleting previous cover:", deleteError);
        }
      }

      const updateData = {
        full_name: editFullName,
        bio: editBio,
        location: editLocation,
        avatar_url: newAvatarUrl,
        cover_url: newCoverUrl,
        is_motivator: editIsMotivator,
        motivator_title: editMotivatorTitle,
        motivator_bio: editMotivatorBio,
        interests: editInterests,
        updated_at: new Date().toISOString(),
      };

      // Explicitly use .update() since ProfilePage is for existing profiles
      const { data, error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", authUser.id)
        .select();

      if (error) {
        console.error("Supabase update error:", error);
        if (error.details) console.error("Error details:", error.details);
        if (error.hint) console.error("Error hint:", error.hint);
        throw error;
      }

      setAvatarFile(null);
      setCoverFile(null);
      toast.success("Profile updated successfully!");
      setIsEditing(false);
      
      // Update local profileData without refetching since fetchProfileData is not in scope here
      if (data && data.length > 0) {
        setProfileData(data[0]);
      } else {
        setProfileData((prev: any) => ({ ...prev, ...updateData }));
      }
      
      await refreshAvatar();
    } catch (error: any) {
      console.error("Final error during profile update:", error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  // Use useMemo to re-evaluate profileUser whenever profileData changes
  const profileUser = useMemo(() => ({
    name: profileData?.full_name || profileData?.username || "User",
    username: `@${profileData?.username || "user"}`,
    avatar: profileData?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profileData?.full_name || profileData?.username || "user")}&background=random`,
    coverImage: profileData?.cover_url || "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&h=400&fit=crop",
    avatar_url: profileData?.avatar_url || "",
    cover_url: profileData?.cover_url || "",
    bio: profileData?.bio || "No bio yet.",
    location: profileData?.location || "Unknown",
    joinDate: profileData?.created_at ? new Date(profileData.created_at).toLocaleDateString() : "January 2024",
    isMotivator: profileData?.is_motivator || false,
    motivatorTitle: profileData?.motivator_title || "",
    motivatorBio: profileData?.motivator_bio || "",
    stats: {
      posts: userPosts.length,
      followers: followerCount,
      following: followingCount,
    },
    interests: profileData?.interests || [],
  }), [profileData, userPosts, followerCount, followingCount]);

  if (loading && !profileData) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <p style={{ color: "var(--theme-text)", opacity: 0.6 }}>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* Cover Section */}
      <div
        className="w-full h-48 md:h-64 rounded-3xl overflow-hidden mb-6 shadow-lg relative group"
        style={{
          backgroundImage: `url(${coverFile ? URL.createObjectURL(coverFile) : profileUser.coverImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {isEditing && isOwnProfile && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity gap-3">
            <div className="flex gap-4">
              <label
                htmlFor="cover-upload"
                className="cursor-pointer bg-white px-6 py-2.5 rounded-2xl text-sm font-bold flex items-center shadow-xl hover:bg-gray-100 transition-all"
                style={{ color: '#000000' }}
              >
                <Upload className="w-4 h-4 mr-2" style={{ color: '#000000' }} /> UPLOAD COVER
              </label>
              <input id="cover-upload" type="file" accept="image/*" className="hidden" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />

              {(editCoverUrl || coverFile) && (
                <Button variant="destructive" size="default" onClick={() => { setEditCoverUrl(""); setCoverFile(null); }} className="rounded-2xl px-6 font-bold shadow-xl">
                  <Trash2 className="w-4 h-4 mr-2" /> DELETE COVER
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="px-4 md:px-0">
        <div className="flex flex-col md:flex-row gap-6 mb-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center md:items-start -mt-16 md:-mt-20 relative gap-3">
            <div className="relative">
              <Avatar className="w-32 h-32 md:w-40 md:h-40 border-4 shadow-xl" style={{ borderColor: 'var(--theme-background)' }}>
                <AvatarImage src={avatarFile ? URL.createObjectURL(avatarFile) : profileUser.avatar} alt={profileUser.name} />
                <AvatarFallback>{profileUser.name.charAt(0)}</AvatarFallback>
              </Avatar>
            </div>

            {isEditing && isOwnProfile && (
              <div className="flex gap-2 w-full justify-center md:justify-start">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="rounded-xl flex-1 md:flex-none border-dashed"
                  style={{ borderColor: 'var(--theme-primary)', color: 'var(--theme-primary)' }}
                >
                  <label htmlFor="avatar-upload" className="cursor-pointer">
                    <Camera className="w-4 h-4 mr-2" />
                    Upload
                    <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} />
                  </label>
                </Button>

                {(editAvatarUrl || avatarFile) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl flex-1 md:flex-none text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
                    onClick={() => { setEditAvatarUrl(""); setAvatarFile(null); }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                )}
              </div>
            )}

            {profileUser.isMotivator && (
              <Badge
                className="px-4 py-1 shadow-md"
                style={{
                  backgroundColor: 'var(--theme-primary)',
                  color: 'white',
                }}
              >
                <Award className="w-3 h-3 mr-1" />
                Motivator
              </Badge>
            )}
          </div>

          <div className="flex-1 text-center md:text-left pt-4">
            {!isEditing ? (
              <>
                <div className="flex flex-col md:flex-row md:items-center gap-3 mb-3">
                  <h1 style={{ color: 'var(--theme-text)' }}>{profileUser.name}</h1>
                  <span className="opacity-60" style={{ color: 'var(--theme-text)' }}>{profileUser.username}</span>
                </div>
                {/* Follow + Buddy buttons — only on other people's profiles */}
                {!isOwnProfile && currentUserId && (
                  <div className="flex flex-wrap gap-2 mb-4 justify-center md:justify-start">
                    {/* Follow button */}
                    <Button
                      onClick={handleFollow}
                      disabled={followLoading}
                      variant={isFollowing ? "outline" : "default"}
                      className="rounded-xl shadow-md"
                      style={isFollowing
                        ? { borderColor: 'var(--theme-primary)', color: 'var(--theme-primary)' }
                        : { background: 'linear-gradient(to right, var(--theme-primary), var(--theme-secondary))', color: 'white' }
                      }
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      {followLoading ? '…' : isFollowing ? 'Following ✓' : 'Follow'}
                    </Button>
                    {buddyStatus === null && (
                      <Button
                        onClick={sendBuddyRequest}
                        disabled={buddyLoading}
                        className="rounded-xl text-white shadow-md"
                        style={{ background: 'linear-gradient(to right, var(--theme-primary), var(--theme-secondary))' }}
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        {buddyLoading ? 'Sending…' : 'Add Buddy'}
                      </Button>
                    )}
                    {buddyStatus === 'pending_sent' && (
                      <Button variant="outline" disabled className="rounded-xl" style={{ borderColor: 'var(--theme-primary)', color: 'var(--theme-primary)' }}>
                        <Clock className="w-4 h-4 mr-2" />
                        Request Sent
                      </Button>
                    )}
                    {buddyStatus === 'pending_received' && (
                      <Button
                        onClick={acceptBuddyRequest}
                        disabled={buddyLoading}
                        className="rounded-xl text-white shadow-md"
                        style={{ background: 'linear-gradient(to right, var(--theme-primary), var(--theme-secondary))' }}
                      >
                        <UserCheck className="w-4 h-4 mr-2" />
                        {buddyLoading ? 'Accepting…' : 'Accept Request'}
                      </Button>
                    )}
                    {buddyStatus === 'accepted' && (
                      <div className="flex items-center gap-2">
                        <Badge 
                          className="rounded-xl px-4 py-2 flex items-center gap-2 bg-[var(--theme-accent)] text-[var(--theme-primary)] border border-[var(--theme-primary)]/20 shadow-sm"
                        >
                          <Smile className="w-4 h-4" />
                          <span className="font-bold">YOUR BUDDY</span>
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="rounded-xl opacity-30 hover:opacity-100 hover:text-red-500 transition-opacity" 
                          onClick={() => targetUuid && removeBuddy(targetUuid)}
                          title="Remove Buddy"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    {/* Send Message Button — visible on other profiles */}
                    <Button
                      onClick={async () => {
                        if (!currentUserId) return;
                        // If they are buddies, get_or_create_buddy_chat will just return their existing chat.
                        // If not, we use the message request function.
                        const isAcceptedBuddy = buddyStatus === 'accepted';
                        const rpcName = isAcceptedBuddy ? "get_or_create_buddy_chat" : "get_or_create_message_request_chat";
                        
                        const { data: chatId, error } = await supabase.rpc(rpcName, {
                          p_user_id: currentUserId,
                          ...(isAcceptedBuddy ? { p_buddy_id: targetUuid } : { p_target_id: targetUuid })
                        });
                        if (error) {
                          toast.error("Failed to open chat");
                        } else {
                          onViewChange && onViewChange('chats', chatId);
                        }
                      }}
                      className="rounded-xl shadow-md text-white border-none"
                      style={{ background: '#0095f6' }}
                    >
                      💬 Message
                    </Button>
                    {/* Share Profile — always visible on other profiles */}
                    <Button
                      variant="outline"
                      onClick={handleShareProfile}
                      className="rounded-xl shadow-sm"
                      style={{ borderColor: 'var(--theme-primary)', color: 'var(--theme-primary)' }}
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Share Profile
                    </Button>
                  </div>
                )}

                {/* Only show Edit Profile button on your own profile */}
                {isOwnProfile && (
                  <div className="flex gap-2 mb-4 justify-center md:justify-start">
                    <Button variant="outline" onClick={() => {
                      setEditFullName(profileData.full_name || "");
                      setEditBio(profileData.bio || "");
                      setEditLocation(profileData.location || "");
                      setEditAvatarUrl(profileData.avatar_url || "");
                      setEditCoverUrl(profileData.cover_url || "");
                      setEditIsMotivator(profileData.is_motivator || false);
                      setEditInterests(profileData.interests || []);
                      setEditMotivatorTitle(profileData.motivator_title || "");
                      setEditMotivatorBio(profileData.motivator_bio || "");
                      setIsEditing(true);
                    }} className="rounded-xl shadow-sm" style={{ borderColor: 'var(--theme-primary)', color: 'var(--theme-primary)' }}>
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleShareProfile}
                      className="rounded-xl shadow-sm"
                      style={{ borderColor: 'var(--theme-primary)', color: 'var(--theme-primary)' }}
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Share Profile
                    </Button>
                  </div>
                )}
                <p className="mb-4 max-w-2xl" style={{ color: 'var(--theme-text)', opacity: 0.8 }}>{profileUser.bio}</p>
                {/* Meta row */}
                <div className="flex flex-wrap text-sm mb-4 justify-center md:justify-start" style={{ columnGap: '24px', rowGap: '4px' }}>
                  <div className="flex items-center" style={{ color: 'var(--theme-text)', opacity: 0.7, gap: '6px' }}>
                    <MapPin className="w-4 h-4" style={{ flexShrink: 0 }} />
                    <span>{profileUser.location}</span>
                  </div>
                  <div className="flex items-center" style={{ color: 'var(--theme-text)', opacity: 0.7, gap: '6px' }}>
                    <Calendar className="w-4 h-4" style={{ flexShrink: 0 }} />
                    <span>{"Joined " + profileUser.joinDate}</span>
                  </div>
                </div>
                {/* Stats row */}
                <div className="flex text-sm mb-4 justify-center md:justify-start" style={{ columnGap: '40px' }}>
                  <span style={{ color: 'var(--theme-text)' }}>
                    <strong>{profileUser.stats.posts}</strong>{" Posts"}
                  </span>
                  <span style={{ color: 'var(--theme-text)' }}>
                    <strong>{followerCount}</strong>{" "}
                    {followerCount === 1 ? "Follower" : "Followers"}
                  </span>
                  <span style={{ color: 'var(--theme-text)' }}>
                    <strong>{buddyCount}</strong>{" "}
                    {buddyCount === 1 ? "Buddy" : "Buddies"}
                  </span>
                </div>
              </>
            ) : (
              <div className="space-y-4 max-w-md mx-auto md:mx-0 text-left">
                <div>
                  <label className="text-xs font-bold opacity-70 mb-1 block" style={{ color: "var(--theme-text)" }}>Full Name</label>
                  <Input value={editFullName} onChange={(e) => setEditFullName(e.target.value)} className="bg-[var(--theme-card-bg)] rounded-xl border-[var(--theme-primary)]/20" />
                </div>
                <div>
                  <label className="text-xs font-bold opacity-70 mb-1 block" style={{ color: "var(--theme-text)" }}>Bio</label>
                  <Textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} className="bg-[var(--theme-card-bg)] rounded-xl border-[var(--theme-primary)]/20 resize-none h-24" />
                </div>
                <div>
                  <label className="text-xs font-bold opacity-70 mb-1 block" style={{ color: "var(--theme-text)" }}>Location</label>
                  <Input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} className="bg-[var(--theme-card-bg)] rounded-xl border-[var(--theme-primary)]/20" />
                </div>

                <div className="p-4 rounded-2xl bg-[var(--theme-accent)]/20 border border-[var(--theme-primary)]/10">
                  <div className="flex items-center space-x-2 mb-4">
                    <Checkbox id="editIsMotivator" checked={editIsMotivator} onCheckedChange={(checked: boolean) => setEditIsMotivator(checked === true)} />
                    <label htmlFor="editIsMotivator" className="text-sm font-bold" style={{ color: "var(--theme-text)" }}>I am a Motivator</label>
                  </div>

                  {editIsMotivator && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-1">
                      <div>
                        <label className="text-xs font-bold opacity-70 mb-1 block" style={{ color: "var(--theme-text)" }}>Motivator Title</label>
                        <Input value={editMotivatorTitle} onChange={(e) => setEditMotivatorTitle(e.target.value)} className="bg-[var(--theme-card-bg)] rounded-xl border-[var(--theme-primary)]/20" placeholder="e.g. Empathetic Listener" />
                      </div>
                      <div>
                        <label className="text-xs font-bold opacity-70 mb-1 block" style={{ color: "var(--theme-text)" }}>Motivator Bio</label>
                        <Textarea value={editMotivatorBio} onChange={(e) => setEditMotivatorBio(e.target.value)} className="bg-[var(--theme-card-bg)] rounded-xl border-[var(--theme-primary)]/20 resize-none h-24" placeholder="How you help others..." />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold opacity-70 mb-1 block" style={{ color: "var(--theme-text)" }}>Interests (Tags)</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {editInterests.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="px-3 py-1 rounded-full flex items-center gap-1 group" style={{ backgroundColor: 'var(--theme-accent)', color: 'var(--theme-primary)' }}>
                        {tag}
                        <X className="w-3 h-3 cursor-pointer hover:text-red-500 transition-colors" onClick={() => setEditInterests(editInterests.filter(t => t !== tag))} />
                      </Badge>
                    ))}
                  </div>
                  <Input
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === 'Enter' && newInterest.trim() !== '') {
                        e.preventDefault();
                        if (!editInterests.includes(newInterest.trim())) {
                          setEditInterests([...editInterests, newInterest.trim()]);
                        }
                        setNewInterest('');
                      }
                    }}
                    className="bg-[var(--theme-card-bg)] rounded-xl border-[var(--theme-primary)]/20"
                    placeholder="Type and press Enter to add tags..."
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleUpdateProfile}
                    disabled={loading}
                    className="rounded-xl flex-1 text-white font-bold h-12 shadow-lg"
                    style={{ background: "linear-gradient(to right, var(--theme-primary), var(--theme-secondary))" }}
                  >
                    {loading ? "SAVING..." : <><Save className="w-4 h-4 mr-2" /> SAVE PROFILE</>}
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)} disabled={loading} className="rounded-xl px-4 h-12">
                    CANCEL
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6 rounded-xl shadow-md" style={{ backgroundColor: 'var(--theme-accent)' }}>
            <TabsTrigger value="posts" className="rounded-xl px-1 text-xs sm:text-sm"><BookOpen className="w-4 h-4 sm:mr-2 flex-shrink-0" /><span className="hidden sm:inline">Posts</span></TabsTrigger>
            <TabsTrigger value="buddies" className="rounded-xl px-1 text-xs sm:text-sm"><Smile className="w-4 h-4 sm:mr-2 flex-shrink-0" /><span className="hidden sm:inline">Buddies</span></TabsTrigger>
            <TabsTrigger value="followers" className="rounded-xl px-1 text-xs sm:text-sm"><Users className="w-4 h-4 sm:mr-2 flex-shrink-0" /><span className="hidden sm:inline">Followers</span></TabsTrigger>
            <TabsTrigger value="about" className="rounded-xl px-1 text-xs sm:text-sm"><Award className="w-4 h-4 sm:mr-2 flex-shrink-0" /><span className="hidden sm:inline">About</span></TabsTrigger>
          </TabsList>

          <TabsContent value="posts">
            {userPosts.length > 0 ? (
              /* ── 3-column mini PostCard grid ── */
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {userPosts.map((post, index) => (
                  <div
                    key={index}
                    onClick={() => setSelectedPost(post)}
                    style={{
                      cursor: 'pointer',
                      borderRadius: '14px',
                      overflow: 'hidden',
                      backgroundColor: 'var(--theme-card-bg)',
                      border: '1px solid var(--theme-primary)22',
                      padding: '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                      (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.12)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                      (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                    }}
                  >
                    {/* Avatar + name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <img
                        src={post.author?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author?.full_name || 'U')}&background=random`}
                        alt=""
                        style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, objectFit: 'cover' }}
                      />
                      <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--theme-text)', opacity: 0.8, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {post.author?.full_name || 'User'}
                      </span>
                    </div>

                    {/* Title */}
                    {post.title && (
                      <p style={{
                        fontSize: '11px', fontWeight: 700,
                        color: 'var(--theme-text)',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        lineHeight: 1.3,
                        margin: 0,
                      }}>
                        {post.title}
                      </p>
                    )}

                    {/* Content snippet */}
                    <p style={{
                      fontSize: '10px',
                      color: 'var(--theme-text)',
                      opacity: 0.65,
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      lineHeight: 1.4,
                      margin: 0,
                      flexGrow: 1,
                    }}>
                      {post.content?.slice(0, 120)}
                    </p>

                    {/* Stats footer */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--theme-text)', opacity: 0.55 }}>❤️ {post.likes ?? 0}</span>
                      <span style={{ fontSize: '10px', color: 'var(--theme-text)', opacity: 0.55 }}>💬 {post.comments ?? 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-[var(--theme-accent)]/10 rounded-3xl">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-20" style={{ color: 'var(--theme-primary)' }} />
                <p style={{ color: 'var(--theme-text)', opacity: 0.6 }}>No posts yet.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="buddies">
            {buddiesList.length > 0 ? (
              <div className="space-y-3">
                {/* Header row */}
                <p className="text-sm font-semibold mb-4" style={{ color: 'var(--theme-text)', opacity: 0.6 }}>
                  {buddyCount} {buddyCount === 1 ? 'Buddy' : 'Buddies'}
                </p>
                {buddiesList.map((buddy: any) => (
                  <div
                    key={buddy.id}
                    className="flex items-center gap-4 p-4 rounded-2xl transition-shadow hover:shadow-md cursor-pointer"
                    style={{ backgroundColor: 'var(--theme-card-bg)', border: '1px solid var(--theme-primary)22' }}
                    onClick={() => onViewChange && onViewChange('profile', buddy.id)}
                  >
                    <Avatar className="w-12 h-12 flex-shrink-0">
                      <AvatarImage
                        src={buddy.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(buddy.full_name || 'B')}&background=random`}
                        alt={buddy.full_name}
                      />
                      <AvatarFallback style={{ backgroundColor: 'var(--theme-accent)', color: 'var(--theme-primary)' }}>
                        {(buddy.full_name || 'B').charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate" style={{ color: 'var(--theme-text)' }}>
                        {buddy.full_name || 'Unknown'}
                      </p>
                      <p className="text-sm truncate" style={{ color: 'var(--theme-text)', opacity: 0.6 }}>
                        @{buddy.username || 'user'}
                      </p>
                    </div>
                    {isOwnProfile ? (
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          className="rounded-xl flex-shrink-0"
                          style={{ background: '#0095f6', color: 'white', border: 'none' }}
                          onClick={async (e) => {
                            e.stopPropagation();
                            console.log("Buddy Chat Button clicked:", { currentUserId, buddyId: buddy.id });
                            try {
                              const { data: chatId, error } = await supabase.rpc("get_or_create_buddy_chat", {
                                p_user_id: currentUserId,
                                p_buddy_id: buddy.id,
                              });
                              console.log("Buddy Chat RPC Result:", { chatId, error });
                              if (error) {
                                toast.error("Failed to open chat");
                                console.error("Chat RPC Error:", error);
                                return;
                              }
                              console.log("Triggering onViewChange('chats', ...)", chatId);
                              if (onViewChange) {
                                onViewChange('chats', chatId);
                              } else {
                                console.error("onViewChange is UNDEFINED in ProfilePage");
                              }
                            } catch (err) {
                              console.error("Chat button click error:", err);
                              toast.error("An error occurred trying to open chat");
                            }
                          }}
                        >
                          💬 Chat
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl flex-shrink-0 border-red-200 text-red-500 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeBuddy(buddy.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <Badge
                        className="flex-shrink-0 text-xs px-3 py-1 rounded-full"
                        style={{ backgroundColor: 'var(--theme-accent)', color: 'var(--theme-primary)' }}
                      >
                        ❤️ Buddy
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-[var(--theme-accent)]/10 rounded-3xl">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-20" style={{ color: 'var(--theme-primary)' }} />
                <p style={{ color: 'var(--theme-text)', opacity: 0.6 }}>No buddies yet.</p>
                <p className="text-sm mt-2" style={{ color: 'var(--theme-text)', opacity: 0.4 }}>
                  Connect through Talking Buddy or send a buddy request.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="followers">
            {followersList.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm font-semibold mb-4" style={{ color: 'var(--theme-text)', opacity: 0.6 }}>
                  {followerCount} {followerCount === 1 ? 'Follower' : 'Followers'}
                </p>
                {followersList.map((follower: any) => (
                  <div
                    key={follower.id}
                    className="flex items-center gap-4 p-4 rounded-2xl transition-shadow hover:shadow-md cursor-pointer"
                    style={{ backgroundColor: 'var(--theme-card-bg)', border: '1px solid var(--theme-primary)22' }}
                    onClick={() => onViewChange && onViewChange('profile', follower.id)}
                  >
                    <Avatar className="w-12 h-12 flex-shrink-0">
                      <AvatarImage
                        src={follower.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(follower.full_name || 'U')}&background=random`}
                        alt={follower.full_name}
                      />
                      <AvatarFallback style={{ backgroundColor: 'var(--theme-accent)', color: 'var(--theme-primary)' }}>
                        {(follower.full_name || 'U').charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate" style={{ color: 'var(--theme-text)' }}>
                        {follower.full_name || 'Unknown'}
                      </p>
                      <p className="text-sm truncate" style={{ color: 'var(--theme-text)', opacity: 0.6 }}>
                        @{follower.username || 'user'}
                      </p>
                    </div>
                    {isOwnProfile && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-shrink-0 rounded-xl"
                        style={{ borderColor: 'rgba(128,128,128,0.3)', color: 'var(--theme-text)' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFollower(follower.id);
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-[var(--theme-accent)]/10 rounded-3xl">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-20" style={{ color: 'var(--theme-primary)' }} />
                <p style={{ color: 'var(--theme-text)', opacity: 0.6 }}>No followers yet.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="about">
            <div className="rounded-3xl p-6 shadow-md" style={{ backgroundColor: 'var(--theme-card-bg)', border: `1px solid var(--theme-primary)33` }}>
              <h3 className="mb-6 font-bold" style={{ color: 'var(--theme-text)' }}>About {profileUser.name.split(" ")[0]}</h3>
              <div className="space-y-8">
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--theme-primary)' }}>Bio</h4>
                  <p className="leading-relaxed" style={{ color: 'var(--theme-text)', opacity: 0.8 }}>{profileUser.bio}</p>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--theme-accent)]/20">
                  <h4 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--theme-primary)' }}>Motivator Status</h4>
                  <div className="flex items-center gap-2 mb-4">
                    {profileUser.isMotivator ? (
                      <Badge className="border-none shadow-sm" style={{ backgroundColor: 'var(--theme-primary)', color: 'white' }}>Active Motivator</Badge>
                    ) : (
                      <Badge variant="outline" className="opacity-50" style={{ color: 'var(--theme-text)', borderColor: 'var(--theme-text)40' }}>Standard Member</Badge>
                    )}
                  </div>
                  {profileUser.isMotivator && (
                    <div className="space-y-4 border-t border-[var(--theme-primary)]/10 pt-4 mt-2">
                      {profileUser.motivatorTitle && (
                        <div>
                          <h5 className="text-xs font-bold opacity-60 uppercase mb-1" style={{ color: 'var(--theme-text)' }}>Title</h5>
                          <p className="font-medium" style={{ color: 'var(--theme-text)' }}>{profileUser.motivatorTitle}</p>
                        </div>
                      )}
                      {profileUser.motivatorBio && (
                        <div>
                          <h5 className="text-xs font-bold opacity-60 uppercase mb-1" style={{ color: 'var(--theme-text)' }}>Specialized Support</h5>
                          <p style={{ color: 'var(--theme-text)', opacity: 0.8 }}>{profileUser.motivatorBio}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--theme-primary)' }}>Interests & Expertise</h4>
                  <div className="flex flex-wrap gap-2">
                    {profileUser.interests.length > 0 ? (
                      profileUser.interests.map((interest: string, index: number) => (
                        <Badge key={index} variant="outline" className="px-4 py-1.5 rounded-full border-[var(--theme-primary)]/30" style={{ color: 'var(--theme-primary)' }}>{interest}</Badge>
                      ))
                    ) : (
                      <p className="text-sm italic opacity-50" style={{ color: 'var(--theme-text)' }}>No interests added yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Full-post modal rendered via portal so fixed positioning is always relative to viewport ── */}
      {selectedPost && createPortal(
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
            backgroundColor: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setSelectedPost(null)}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '560px',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: '24px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
              backgroundColor: 'var(--theme-card-bg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedPost(null)}
              style={{
                position: 'absolute', top: '12px', right: '12px', zIndex: 10,
                width: '32px', height: '32px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '50%', border: 'none', cursor: 'pointer',
                backgroundColor: 'var(--theme-accent)', color: 'var(--theme-primary)',
              }}
              aria-label="Close"
            >
              <X size={16} />
            </button>

            <div style={{ padding: '8px' }}>
              <PostCard
                post={selectedPost}
                onDelete={(deletedId) => {
                  setUserPosts(prev => prev.filter(p => p.postId !== deletedId));
                  setSelectedPost(null);
                }}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}