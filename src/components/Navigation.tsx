import { useState, useEffect } from "react";
import { Home, Search, Bell, User, BookOpen, TrendingUp, Heart, Palette, MessageCircle, Settings as SettingsIcon } from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useUserData } from "../App";
import { useLanguage } from "../utils/LanguageContext";
import logo from "figma:asset/f15460e64ff6dd326797f0cc15f4e18e934e3112.png";

interface NavigationProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export function Navigation({ activeView, onViewChange }: NavigationProps) {
  const { avatarUrl } = useUserData();
  const { t } = useLanguage();

  // Activity status — reactive via custom event dispatched from Settings
  const [showActivity, setShowActivity] = useState(
    localStorage.getItem("privacy_showActivity") !== "false"
  );
  useEffect(() => {
    const handler = (e: Event) => setShowActivity((e as CustomEvent<boolean>).detail);
    window.addEventListener("activityStatusChanged", handler);
    return () => window.removeEventListener("activityStatusChanged", handler);
  }, []);

  const navItems = [
    { id: "home", label: t("home"), icon: Home },
    { id: "search", label: t("search"), icon: Search },
    { id: "trending", label: t("trending"), icon: TrendingUp },
    { id: "library", label: t("library"), icon: BookOpen },
    { id: "buddy", label: t("talking_buddy"), icon: Heart },
  ];

  return (
    <nav 
      className="hidden md:flex fixed left-0 top-0 h-screen w-64 border-r backdrop-blur-md p-6 flex-col shadow-lg overflow-y-auto"
      style={{
        borderColor: 'var(--theme-primary)' + '33',
        backgroundColor: 'var(--theme-card-bg)',
        opacity: 0.95,
      }}
    >
      <div className="mb-8">
        <img 
          src={logo} 
          alt="Smile Artist - writes the poetry he cannot live" 
          className="w-full object-contain dark:invert"
        />
      </div>

      <div className="flex-1 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all shadow-md"
              style={{
                background: activeView === item.id 
                  ? `linear-gradient(to right, var(--theme-primary), var(--theme-secondary))`
                  : 'transparent',
                color: activeView === item.id ? 'white' : 'var(--theme-text)',
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                if (activeView !== item.id) {
                  e.currentTarget.style.backgroundColor = 'var(--theme-accent)';
                  e.currentTarget.style.color = 'var(--theme-primary)';
                }
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                if (activeView !== item.id) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--theme-text)';
                }
              }}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-2 pt-6 border-t" style={{ borderColor: 'var(--theme-primary)' + '33' }}>
        <button
          onClick={() => onViewChange("customize")}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all shadow-md"
          style={{
            background: activeView === "customize" 
              ? `linear-gradient(to right, var(--theme-primary), var(--theme-secondary))`
              : 'transparent',
            color: activeView === "customize" ? 'white' : 'var(--theme-text)',
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (activeView !== "customize") {
              e.currentTarget.style.backgroundColor = 'var(--theme-accent)';
              e.currentTarget.style.color = 'var(--theme-primary)';
            }
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (activeView !== "customize") {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--theme-text)';
            }
          }}
        >
          <Palette className="w-5 h-5" />
          <span>{t("customize_theme")}</span>
        </button>
        <button 
          onClick={() => onViewChange("notifications")}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all shadow-md"
          style={{
            background: activeView === "notifications" 
              ? `linear-gradient(to right, var(--theme-primary), var(--theme-secondary))`
              : 'transparent',
            color: activeView === "notifications" ? 'white' : 'var(--theme-text)',
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (activeView !== "notifications") {
              e.currentTarget.style.backgroundColor = 'var(--theme-accent)';
              e.currentTarget.style.color = 'var(--theme-primary)';
            }
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (activeView !== "notifications") {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--theme-text)';
            }
          }}
        >
          <Bell className="w-5 h-5" />
          <span>{t("notifications")}</span>
        </button>
        <button 
          onClick={() => onViewChange("profile")}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all shadow-md"
          style={{
            background: activeView === "profile" 
              ? `linear-gradient(to right, var(--theme-primary), var(--theme-secondary))`
              : 'transparent',
            color: activeView === "profile" ? 'white' : 'var(--theme-text)',
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (activeView !== "profile") {
              e.currentTarget.style.backgroundColor = 'var(--theme-accent)';
              e.currentTarget.style.color = 'var(--theme-primary)';
            }
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (activeView !== "profile") {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--theme-text)';
            }
          }}
        >
          <div className="relative w-5 h-5">
            <Avatar className="w-5 h-5 border border-[var(--theme-primary)]/20 shadow-sm">
              <AvatarImage src={avatarUrl || ""} alt="Profile" />
              <AvatarFallback><User className="w-full h-full p-0.5" /></AvatarFallback>
            </Avatar>
            {showActivity && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-white" />
            )}
          </div>
          <span>{t("profile")}</span>
        </button>
        <button 
          onClick={() => onViewChange("chats")}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all shadow-md"
          style={{
            background: activeView === "chats" 
              ? `linear-gradient(to right, var(--theme-primary), var(--theme-secondary))`
              : 'transparent',
            color: activeView === "chats" ? 'white' : 'var(--theme-text)',
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (activeView !== "chats") {
              e.currentTarget.style.backgroundColor = 'var(--theme-accent)';
              e.currentTarget.style.color = 'var(--theme-primary)';
            }
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (activeView !== "chats") {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--theme-text)';
            }
          }}
        >
          <MessageCircle className="w-5 h-5" />
          <span>{t("my_chats")}</span>
        </button>
        <button 
          onClick={() => onViewChange("settings")}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all shadow-md"
          style={{
            background: activeView === "settings" 
              ? `linear-gradient(to right, var(--theme-primary), var(--theme-secondary))`
              : 'transparent',
            color: activeView === "settings" ? 'white' : 'var(--theme-text)',
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (activeView !== "settings") {
              e.currentTarget.style.backgroundColor = 'var(--theme-accent)';
              e.currentTarget.style.color = 'var(--theme-primary)';
            }
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            if (activeView !== "settings") {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--theme-text)';
            }
          }}
        >
          <SettingsIcon className="w-5 h-5" />
          <span>{t("settings")}</span>
        </button>
      </div>

      <Button 
        className="w-full mt-4 mb-2 text-white shadow-md rounded-xl"
        style={{
          background: `linear-gradient(to right, var(--theme-primary), var(--theme-secondary))`,
        }}
        onClick={() => onViewChange("write")}
      >
        {t("write")}
      </Button>
    </nav>
  );
}