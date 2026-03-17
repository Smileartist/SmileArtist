import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Bell, X } from "lucide-react";
import { subscribeToPush, isPushSupported } from "../utils/pushNotifications";

interface PermissionBannerProps {
  userId: string;
}

export function NotificationPermissionBanner({ userId }: PermissionBannerProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isPushSupported() || !userId) return;

    // 1. Check current permission status
    if (Notification.permission === "default") {
      const lastDismissed = localStorage.getItem("push_prompt_dismissed_at");
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

      // Only show if not dismissed recently
      if (!lastDismissed || parseInt(lastDismissed, 10) < sevenDaysAgo) {
        setIsVisible(true);
      }
    }
  }, [userId]);

  const handleEnable = async () => {
    const success = await subscribeToPush(userId);
    if (success) {
      console.log("Successfully subscribed to notifications");
    }
    setIsVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem("push_prompt_dismissed_at", Date.now().toString());
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 md:left-auto md:right-8 md:bottom-8 z-[9999] animate-in fade-in slide-in-from-bottom-5 duration-500 max-w-md">
      <div className="bg-white/95 backdrop-blur-md border border-[var(--theme-primary)]/20 rounded-2xl p-4 shadow-xl flex items-start gap-4">
        <div className="flex-shrink-0 bg-[var(--theme-primary)]/10 p-2 rounded-xl">
          <Bell className="w-6 h-6" style={{ color: "var(--theme-primary)" }} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm text-[#2d2424] mb-1">Stay Updated</h3>
          <p className="text-xs text-[#8a7c74] mb-3">
            Enable notifications to get updates on messages, replies, likes, and more.
          </p>
          
          <div className="flex gap-2">
            <Button 
              size="sm" 
              onClick={handleEnable}
              className="bg-[var(--theme-primary)] hover:bg-[var(--theme-secondary)] text-white font-semibold text-xs h-8 px-4 rounded-xl shadow-md transition-transform active:scale-95"
            >
              Enable Notifications
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleDismiss}
              className="border-[var(--theme-primary)]/20 text-[#8a7c74] hover:text-[var(--theme-primary)] h-8 text-xs px-4 rounded-xl hover:bg-[var(--theme-primary)]/5 transition-colors"
            >
              Maybe Later
            </Button>
          </div>
        </div>

        <button 
          onClick={handleDismiss} 
          className="text-[#8a7c74]/60 hover:text-[#8a7c74] flex-shrink-0 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
