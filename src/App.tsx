import { useState, useEffect } from "react";
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

function AppContent() {
  const [activeView, setActiveView] = useState("home");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState("");

  useEffect(() => {
    // Check if user is already logged in
    const savedUser = localStorage.getItem("smileArtist_user");
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setUsername(user.username);
      setUserId(user.userId);
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = (username: string, userId: string) => {
    setUsername(username);
    setUserId(userId);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("smileArtist_user");
    setIsLoggedIn(false);
    setUsername("");
    setUserId("");
    setActiveView("home");
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (activeView) {
      case "home":
        return <HomePage />;
      case "search":
        return <SearchPanel />;
      case "trending":
        return <TrendingPage />;
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
        return <ProfilePage />;
      case "notifications":
        return <NotificationPage />;
      case "settings":
        return <Settings onLogout={handleLogout} username={username} />;
      default:
        return <HomePage />;
    }
  };

  return (
    <div 
      className="min-h-screen transition-colors duration-300"
      style={{
        background: `linear-gradient(to bottom right, var(--theme-background), var(--theme-accent), var(--theme-accent))`,
        fontFamily: "var(--theme-font-family)",
        fontSize: "var(--theme-font-size)",
      }}
    >
      <Navigation activeView={activeView} onViewChange={setActiveView} />
      <MobileHeader onViewChange={setActiveView} />
      <MobileNavigation activeView={activeView} onViewChange={setActiveView} />
      <main className="md:ml-64 pt-16 pb-20 px-4 md:pt-0 md:pb-8 md:p-8">
        {renderContent()}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}