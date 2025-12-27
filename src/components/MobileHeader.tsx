import { Bell, User, Menu, PenTool, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import logo from "figma:asset/f15460e64ff6dd326797f0cc15f4e18e934e3112.png";

interface MobileHeaderProps {
  onMenuClick?: () => void;
  onViewChange?: (view: string) => void;
}

export function MobileHeader({ onMenuClick, onViewChange }: MobileHeaderProps) {
  return (
    <header 
      className="md:hidden fixed top-0 left-0 right-0 backdrop-blur-md border-b z-40 shadow-sm"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderColor: 'var(--theme-primary)' + '33',
      }}
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <img 
            src={logo} 
            alt="Smile Artist" 
            className="h-8 object-contain"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9"
            onClick={() => onViewChange?.("write")}
            style={{
              color: 'var(--theme-primary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--theme-accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <PenTool className="w-5 h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9"
            onClick={() => onViewChange?.("customize")}
            style={{
              color: 'var(--theme-primary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--theme-accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <Sparkles className="w-5 h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9"
            onClick={() => onViewChange?.("notifications")}
            style={{
              color: 'var(--theme-primary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--theme-accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <Bell className="w-5 h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-9 w-9"
            onClick={() => onViewChange?.("profile")}
            style={{
              color: 'var(--theme-primary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--theme-accent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <User className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}