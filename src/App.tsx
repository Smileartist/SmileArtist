import { useState, useEffect, createContext, useContext } from "react";
import { ThemeProvider } from "./utils/ThemeContext";
import { Navigation } from "./components/Navigation";
import { MobileNavigation } from "./components/MobileNavigation";
import { MobileHeader } from "./components/MobileHeader";
import { HomePage } from "./components/HomePage";
import { SearchPanel } from "./components/SearchPanel";
import { TalkingBuddy } from "./components/TalkingBuddy";
import { ChatList } from "./components/ChatList";
import { ThemeCustomizer } from "./components/ThemeCustomizer";
import { ProfilePage } from "./components/ProfilePage";
import { NotificationPage } from "./components/NotificationPage";
import { TrendingPage } from "./components/TrendingPage";
import { LibraryPage } from "./components/LibraryPage";
import { WritePost } from "./components/WritePost";
import { Login } from "./components/Login";
import { Settings } from "./components/Settings";
import { Sparkles, TrendingUp, BookOpen, Users } from "lucide-react";

import { supabase } from "./utils/supabaseClient";

export const UserDataContext = createContext<{
  avatarUrl: string | null;
  username: string;
  userId: string;
  refreshAvatar: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}>({
  avatarUrl: null,
  username: "",
  userId: "",
  refreshAvatar: async () => {},
  refreshUserData: async () => {},
});

export const useUserData = () => useContext(UserDataContext);

function AppContent() {
  const [activeView, setActiveView] = useState("home");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null); // New state for selected user profile

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

  useEffect(() => {

    const getSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (data.session) {
        const user = data.session.user;
        setUserId(user.id);
        setIsLoggedIn(true);
        fetchProfileData(user.id);
      } else {
        setIsLoggedIn(false);
        setUsername("");
        setUserId("");
      }
    };
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          const user = session.user;
          setUserId(user.id);
          setIsLoggedIn(true);
          fetchProfileData(user.id);
        } else {
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

  // Updated onViewChange to accept an optional userId
  const handleViewChange = (view: string, targetUserId: string | null = null) => {
    if (view === "profile") {
      setSelectedProfileId(targetUserId);
    } else {
      setSelectedProfileId(null); // Clear selected user when navigating away from profile
    }
    setActiveView(view);
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />; 
  }

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
        return <ChatList />;
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
        return <HomePage />;
    }
  };

  const refreshAvatar = async () => {
    if (userId) await fetchProfileData(userId);
  };

  const refreshUserData = async () => {
    if (userId) await fetchProfileData(userId);
  };

  return (
    <UserDataContext.Provider value={{ avatarUrl, username, userId, refreshAvatar, refreshUserData }}>
      <div 
        className="min-h-screen transition-colors duration-300"
        style={{
          background: `linear-gradient(to bottom right, var(--theme-background), var(--theme-accent), var(--theme-accent)) `,
          fontFamily: "var(--theme-font-family)",
          fontSize: "var(--theme-font-size)",
        }}
      >
        <Navigation activeView={activeView} onViewChange={handleViewChange} />
        <MobileHeader onViewChange={handleViewChange} activeView={activeView} />
        <MobileNavigation activeView={activeView} onViewChange={handleViewChange} />
        <main className="md:ml-64 pt-16 pb-20 px-4 md:pt-0 md:pb-8 md:p-8">
          {renderContent()}
        </main>
      </div>
    </UserDataContext.Provider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
