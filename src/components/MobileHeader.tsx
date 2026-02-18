import { Bell, User, Menu, PenTool, Sparkles, Settings as SettingsIcon, BookOpen, Palette } from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useUserData } from "../App";
import logo from "figma:asset/f15460e64ff6dd326797f0cc15f4e18e934e3112.png";

interface MobileHeaderProps {
  onMenuClick?: () => void;
  onViewChange?: (view: string) => void;
  activeView?: string;
}

export function MobileHeader({ onMenuClick, onViewChange, activeView }: MobileHeaderProps) {
  const { avatarUrl } = useUserData();
  return (
    <header 
      className="md:hidden fixed top-0 left-0 right-0 backdrop-blur-md border-b z-40 shadow-sm"
      style={{
        backgroundColor: 'var(--theme-background)',
        borderColor: 'var(--theme-primary)' + '33',
      }}
    >
      <div className="grid grid-cols-3 items-center px-4 py-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11"
            onClick={() => onViewChange?.("write")}
            style={{
              color: 'var(--theme-primary)',
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <PenTool className="w-7 h-7" />
          </Button>
        </div>
        <div className="col-start-2 justify-self-center flex items-center gap-2">
          <img 
            src={logo} 
            alt="Smile Artist" 
            className="h-12 object-contain"
          />
        </div>
        <div className="flex items-center gap-2 justify-self-end">
          {activeView === "profile" ? (
            <div className="flex items-center gap-2 md:hidden">
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11"
                onClick={() => onViewChange?.("library")}
                style={{
                  color: 'var(--theme-primary)',
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <BookOpen className="w-7 h-7" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11"
                onClick={() => onViewChange?.("customize")}
                style={{
                  color: 'var(--theme-primary)',
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Palette className="w-7 h-7" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11"
                onClick={() => onViewChange?.("settings")}
                style={{
                  color: 'var(--theme-primary)',
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <SettingsIcon className="w-7 h-7" />
              </Button>
            </div>
          ) : (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-11 w-11"
              onClick={() => onViewChange?.("notifications")}
              style={{
                color: 'var(--theme-primary)',
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
              onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Bell className="w-7 h-7" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
