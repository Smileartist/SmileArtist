import { useState, useEffect, useMemo } from "react";
import { useUserData } from "../App";
import { MapPin, Calendar, Edit2, Users, BookOpen, Award, Save, X, Image as ImageIcon, Trash2, Camera, Upload } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Button } from "./ui/button";
import { PostCard } from "./PostCard";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { supabase } from "../utils/supabaseClient";
import { toast } from "sonner";
import { Checkbox } from "./ui/checkbox";

interface ProfilePageProps {
  onViewChange?: (view: string, userId?: string | null) => void;
  userId: string;
}

export function ProfilePage({ onViewChange, userId }: ProfilePageProps) {
  const { refreshAvatar } = useUserData();
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  
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

  const fetchProfileData = async () => {
    try {
      if (userId) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
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
          setEditFullName("");
          setEditBio("");
          setEditLocation("");
          setEditAvatarUrl("");
          setEditCoverUrl("");
          setEditIsMotivator(false);
          setEditInterests([]);
          setEditMotivatorTitle("");
          setEditMotivatorBio("");
        }
        
        const { data: posts, error: postsError } = await supabase
          .from("posts")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });

        const formattedPosts = (posts || []).map((post: any) => ({
          postId: post.id,
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
      }
    } catch (error) {
      console.error("Error fetching profile data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [userId]);

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

      console.log("Attempting to update profile for user ID:", authUser.id);
      console.log("Data being sent:", updateData);

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
      
      console.log("Supabase update successful, received data:", data);

      setAvatarFile(null);
      setCoverFile(null);
      toast.success("Profile updated successfully!");
      setIsEditing(false);
      await fetchProfileData(); 
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
      followers: 0,
      following: 0,
    },
    interests: profileData?.interests || [],
  }), [profileData, userPosts]); // Depend on profileData and userPosts

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
        {isEditing && (
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
                  <Trash2 className="w-4 h-4 mr-2"/> DELETE COVER
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

            {isEditing && (
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
                </div>
                <p className="mb-4 max-w-2xl" style={{ color: 'var(--theme-text)', opacity: 0.8 }}>{profileUser.bio}</p>
                <div className="flex flex-wrap gap-4 text-sm mb-4 justify-center md:justify-start">
                  <div className="flex items-center gap-1" style={{ color: 'var(--theme-text)', opacity: 0.7 }}><MapPin className="w-4 h-4" />{profileUser.location}</div>
                  <div className="flex items-center gap-1" style={{ color: 'var(--theme-text)', opacity: 0.7 }}><Calendar className="w-4 h-4" />Joined {profileUser.joinDate}</div>
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
          <TabsList className="grid w-full grid-cols-3 mb-6 rounded-xl shadow-md" style={{ backgroundColor: 'var(--theme-accent)' }}>
            <TabsTrigger value="posts" className="rounded-xl"><BookOpen className="w-4 h-4 mr-2" />Posts</TabsTrigger>
            <TabsTrigger value="saved" className="rounded-xl"><Users className="w-4 h-4 mr-2" />Buddies</TabsTrigger>
            <TabsTrigger value="about" className="rounded-xl"><Users className="w-4 h-4 mr-2" />About</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="space-y-4">
            {userPosts.length > 0 ? (
              userPosts.map((post, index) => <PostCard key={index} post={post} />)
            ) : (
              <div className="text-center py-12 bg-[var(--theme-accent)]/10 rounded-3xl">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-20" style={{ color: 'var(--theme-primary)' }} />
                <p style={{ color: 'var(--theme-text)', opacity: 0.6 }}>No posts yet.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="saved">
            <div className="text-center py-12 bg-[var(--theme-accent)]/10 rounded-3xl">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-20" style={{ color: 'var(--theme-primary)' }} />
              <p style={{ color: 'var(--theme-text)', opacity: 0.6 }}>No buddies yet.</p>
            </div>
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
    </div>
  );
}
