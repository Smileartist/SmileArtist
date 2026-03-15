import { useState, useEffect, createContext, useContext } from "react";
import { ThemeProvider } from "./utils/ThemeContext";
import { Navigation } from "./components/Navigation";
import { MobileNavigation } from "./components/MobileNavigation";
import { MobileHeader } from "./components/MobileHeader";
import { HomePage } from "./components/HomePage";
import { SearchPanel } from "./components/SearchPanel";
import { TalkingBuddy } from "./components/TalkingBuddy";
import { ChatsPage } from "./components/ChatsPage";
import { ThemeCustomizer } from "./components/ThemeCustomizer";
import { ProfilePage } from "./components/ProfilePage";
import { NotificationPage } from "./components/NotificationPage";
import { TrendingPage } from "./components/TrendingPage";
import { LibraryPage } from "./components/LibraryPage";
import { WritePost } from "./components/WritePost";
import { Login } from "./components/Login";
import { Settings } from "./components/Settings";
import { PostModal } from "./components/PostModal";
import { PostDetail } from "./components/PostDetail";


import { supabase } from "./utils/supabaseClient";
import { LanguageProvider } from "./utils/LanguageContext";

export const UserDataContext = createContext<{
  avatarUrl: string | null;
  username: string;
  userId: string;
  isInstallable: boolean;
  likedPostIds: Set<string>;
  savedPostIds: Set<string>;
  refreshAvatar: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  refreshInteractions: () => Promise<void>;
  toggleLikedPost: (postId: string, isLiked: boolean) => void;
  toggleSavedPost: (postId: string, isSaved: boolean) => void;
  onViewChange: (view: string, targetId?: string | null, showComments?: boolean) => void;
  showInstallPrompt: () => Promise<void>;
}>({
  avatarUrl: null,
  username: "",
  userId: "",
  isInstallable: false,
  likedPostIds: new Set(),
  savedPostIds: new Set(),
  refreshAvatar: async () => { },
  refreshUserData: async () => { },
  refreshInteractions: async () => { },
  toggleLikedPost: () => { },
  toggleSavedPost: () => { },
  onViewChange: () => { },
  showInstallPrompt: async () => { },
});

export const useUserData = () => useContext(UserDataContext);

function AppContent() {
  const [activeView, setActiveView] = useState("home");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null); // New state for selected user profile
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [initialShowComments, setInitialShowComments] = useState(false);

  // ── PWA Installation ──────────────────────────────────────────
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      console.log("PWA: beforeinstallprompt event captured");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstallable(false);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const showInstallPrompt = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA: User choice outcome: ${outcome}`);
    setDeferredPrompt(null);
    setIsInstallable(false);
  };
  // ──────────────────────────────────────────────────────────────

  const fetchProfileData = async (id: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", id)
      .maybeSingle();
    if (data) {
      setUsername(data.username);
      setAvatarUrl(data.avatar_url);
    }
  };

  const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(new Set());

  const fetchInteractions = async (id: string) => {
    try {
      const [likesRes, savesRes] = await Promise.all([
        supabase.from("post_likes").select("post_id").eq("user_id", id),
        supabase.from("saved_posts").select("post_id").eq("user_id", id)
      ]);
      setLikedPostIds(new Set(likesRes.data?.map(d => d.post_id) || []));
      setSavedPostIds(new Set(savesRes.data?.map(d => d.post_id) || []));
    } catch (e) {
      console.error("Error fetching interactions", e);
    }
  };

  const toggleLikedPost = (postId: string, isLiked: boolean) => {
    setLikedPostIds(prev => {
      const next = new Set(prev);
      if (isLiked) next.add(postId);
      else next.delete(postId);
      return next;
    });
  };

  const toggleSavedPost = (postId: string, isSaved: boolean) => {
    setSavedPostIds(prev => {
      const next = new Set(prev);
      if (isSaved) next.add(postId);
      else next.delete(postId);
      return next;
    });
  };

  useEffect(() => {
    if (activeView === 'chats') {
      document.body.classList.add('chats-view');
    } else {
      document.body.classList.remove('chats-view');
    }
    return () => document.body.classList.remove('chats-view');
  }, [activeView]);

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const user = data.session.user;
        // Only restore session if the user has completed profile setup (has a username)
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .maybeSingle();
        if (profile?.username) {
          setUserId(user.id);
          setIsLoggedIn(true);
          fetchProfileData(user.id);
          fetchInteractions(user.id);
        }
        // else: incomplete signup — stay on login screen
      } else {
        setIsLoggedIn(false);
        setUsername("");
        setUserId("");
      }
    };
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Only handle sign-out here.
        // Login (both new signup and returning login) is handled explicitly via handleLogin().
        // Session restore on page load is handled by getSession() above.
        if (event === "SIGNED_OUT" || !session) {
          setIsLoggedIn(false);
          setUsername("");
          setUserId("");
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    }
  }, []);

  const handleLogin = (usernameFromForm: string, userIdParam: string) => {
    // Set initial values from the form immediately so the UI isn't blank
    setUsername(usernameFromForm);
    setUserId(userIdParam);
    setIsLoggedIn(true);
    // Then fetch the authoritative username from the DB (handles existing users too)
    fetchProfileData(userIdParam);
    fetchInteractions(userIdParam);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error);
    } else {
      setIsLoggedIn(false);
      setUsername("");
      setUserId("");
      setActiveView("home");
    }
  };

  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  // Synchronize state with URL on mount and popstate
  useEffect(() => {
    const syncFromUrl = () => {
      // Don't sync URL until the user is actually initialized, unless it's just the login screen
      // But we can set the view intent.
      const params = new URLSearchParams(window.location.search);
      const view = params.get('view') || 'home';
      const targetId = params.get('targetId');

      if (view === 'profile') {
        setSelectedProfileId(targetId);
        setActiveChatId(null);
        setSelectedPostId(null);
      } else if (view === 'chats') {
        setActiveChatId(targetId);
        setSelectedProfileId(null);
        setSelectedPostId(null);
      } else if (view === 'post') {
        setSelectedPostId(targetId);
        setInitialShowComments(params.get('comments') === 'true');
      } else {
        setSelectedProfileId(null);
        setActiveChatId(null);
        setSelectedPostId(null);
        setInitialShowComments(false);
      }
      setActiveView(view === 'post' ? 'home' : view);
    };

    // Run once on mount to grab initial URL state
    syncFromUrl();

    // Listen for browser back/forward buttons
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  // Updated onViewChange to accept an optional targetUserId or targetChatId
  const handleViewChange = (view: string, targetId: string | null = null) => {
    if (view === "profile") {
      setSelectedProfileId(targetId);
      setActiveChatId(null);
      setSelectedPostId(null);
    } else if (view === "chats") {
      setActiveChatId(targetId);
      setSelectedProfileId(null);
      setSelectedPostId(null);
    } else if (view === "post") {
      setSelectedPostId(targetId);
      setInitialShowComments(!!arguments[2]); // Third argument is showComments
      // Keep the activeView the same or switch to home if it was nothing
      if (!activeView) setActiveView('home');
    } else {
      setSelectedProfileId(null); // Clear selected user when navigating away from profile
      setActiveChatId(null);
      setSelectedPostId(null);
      setInitialShowComments(false);
    }
    if (view !== 'post') setActiveView(view);

    // Sync to URL
    const searchParams = new URLSearchParams();
    searchParams.set('view', view);
    if (targetId) {
      searchParams.set('targetId', targetId);
    }
    
    const newSearch = `?${searchParams.toString()}`;
    // Only push state if the URL actually changed to prevent duplicate history entries
    if (window.location.search !== newSearch) {
      window.history.pushState({ view, targetId }, '', newSearch);
    }
  };

  // ── Realtime push notifications ────────────────────────────────
  // Must be declared BEFORE any early return to satisfy Rules of Hooks
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`push-notifs-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        (payload: any) => {
          if (
            localStorage.getItem("app_notifications") !== "false" &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            const typeLabels: Record<string, string> = {
              like: "❤️ Someone liked your post",
              comment: "💬 New comment on your post",
              follow: "👤 Someone followed you",
              buddy_request: "🤝 New buddy request",
              buddy_accepted: "✅ Buddy request accepted",
              mention: "📣 You were mentioned",
            };
            const body =
              typeLabels[payload.new.type] ||
              payload.new.content ||
              "You have a new notification";
            navigator.serviceWorker.ready.then((reg) => {
              reg.showNotification("Smile Artist", { body, icon: "/favicon.ico" });
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
  // ──────────────────────────────────────────────────────────────

  const renderContent = () => {
    switch (activeView) {
      case "home":
        return <HomePage />;
      case "search":
        return <SearchPanel onViewChange={handleViewChange} />;
      case "trending":
        return <TrendingPage onViewChange={handleViewChange} />;
      case "library":
        return <LibraryPage />;
      case "buddy":
        return <TalkingBuddy />;
      case "chats":
        return <ChatsPage activeChatId={activeChatId} onViewChange={handleViewChange} />;
      case "write":
        return <WritePost />;
      case "customize":
        return <ThemeCustomizer />;
      case "profile":
        return <ProfilePage onViewChange={handleViewChange} userId={selectedProfileId || userId} />;
      case "notifications":
        return <NotificationPage />;
      case "settings":
        return (
          <Settings
            onLogout={handleLogout}
            username={username}
            userId={userId}
            onUsernameUpdate={setUsername}
          />
        );
      default:
        // Pass the targetId (from URL) to HomePage to allow highlighting/scrolling to a post
        return <HomePage targetPostId={activeView === 'home' ? activeChatId : null} />;
    }
  };

  const refreshAvatar = async () => {
    if (userId) await fetchProfileData(userId);
  };

  const refreshUserData = async () => {
    if (userId) {
      await fetchProfileData(userId);
      await fetchInteractions(userId);
    }
  };

  return (
    <UserDataContext.Provider value={{ 
      avatarUrl, username, userId, 
      isInstallable, showInstallPrompt,
      likedPostIds, savedPostIds, 
      toggleLikedPost, toggleSavedPost,
      refreshAvatar, refreshUserData, 
      refreshInteractions: async () => { if (userId) await fetchInteractions(userId); },
      onViewChange: handleViewChange 
    }}>
      <div
        className="min-h-screen transition-colors duration-300 overflow-x-hidden"
        style={{
          background: `linear-gradient(to bottom right, var(--theme-background), var(--theme-accent), var(--theme-accent)) `,
          fontFamily: "var(--theme-font-family)",
          fontSize: "var(--theme-font-size)",
        }}
      >
        {!isLoggedIn ? (
          <Login onLogin={handleLogin} />
        ) : (
          <>
            <Navigation activeView={activeView} onViewChange={handleViewChange} />
            <MobileHeader onViewChange={handleViewChange} activeView={activeView} />
            <MobileNavigation activeView={activeView} onViewChange={handleViewChange} />
            <main 
              className={`md:ml-64 max-w-none ${activeView === 'chats' ? 'h-[100dvh] pt-16 pb-20 md:pt-0 md:pb-0 md:h-screen overflow-hidden flex flex-col' : 'pt-16 pb-20 px-4 md:pt-0 md:pb-8 md:p-8'}`}
            >
              {renderContent()}
            </main>
            <PostModal 
              postId={selectedPostId} 
              initialShowComments={initialShowComments}
              onClose={() => { 
                setSelectedPostId(null); 
                setInitialShowComments(false);
                handleViewChange(activeView); 
              }} 
            />
          </>
        )}
      </div>
    </UserDataContext.Provider>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </LanguageProvider>
  );
}
