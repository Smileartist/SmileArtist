import { Home, Search, TrendingUp, BookOpen, User, Heart, MessageCircle, Settings as SettingsIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useUserData } from "../App";

interface MobileNavigationProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export function MobileNavigation({ activeView, onViewChange }: MobileNavigationProps) {
  const { avatarUrl } = useUserData();

  const navItems = [
    { id: "home", label: "Home", icon: Home },
    { id: "search", label: "Search", icon: Search },
    { id: "buddy", label: "Buddy", icon: Heart },
    { id: "chats", label: "Chats", icon: MessageCircle },
    { id: "profile", label: "Profile", icon: User },
  ];

  return (
    <nav 
      className="md:hidden fixed bottom-0 left-0 right-0 backdrop-blur-md border-t z-50 shadow-lg overflow-x-auto no-scrollbar"
      style={{
        backgroundColor: 'var(--theme-background)',
        borderColor: 'var(--theme-primary)' + '33',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div className="flex justify-between items-center h-16 px-4 w-full min-w-max">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isProfile = item.id === "profile";
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className="flex flex-col items-center justify-center gap-1 transition-all flex-1 py-2"
              style={{
                color: isActive ? 'var(--theme-primary)' : 'var(--theme-text)',
              }}
            >
              {isProfile ? (
                avatarUrl ? (
                  <Avatar
                    className="w-5 h-5"
                    style={{
                      opacity: 1, // Always show avatar at full opacity regardless of active state
                      outline: isActive ? '2px solid var(--theme-primary)' : 'none',
                      outlineOffset: '1px',
                    }}
                  >
                    <AvatarImage src={avatarUrl} alt="Profile" />
                    <AvatarFallback>
                      <User className="w-full h-full p-0.5" />
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <Icon className={`w-5 h-5 ${isActive ? "fill-current" : ""}`} />
                )
              ) : (
                <Icon className={`w-5 h-5 ${isActive ? "fill-current" : ""}`} />
              )}
              <span className="text-[10px]">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
