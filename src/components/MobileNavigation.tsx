import { Home, Search, TrendingUp, BookOpen, User, Heart, MessageCircle, Settings as SettingsIcon } from "lucide-react";

interface MobileNavigationProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export function MobileNavigation({ activeView, onViewChange }: MobileNavigationProps) {
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
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderColor: 'var(--theme-primary)' + '33',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div className="flex justify-between items-center h-16 px-4 w-full min-w-max">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className="flex flex-col items-center justify-center gap-1 transition-all flex-1 py-2"
              style={{
                color: activeView === item.id ? 'var(--theme-primary)' : 'var(--theme-text)',
                opacity: activeView === item.id ? 1 : 0.6,
              }}
            >
              <Icon className={`w-5 h-5 ${activeView === item.id ? "fill-current" : ""}`} />
              <span className="text-[10px]">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}