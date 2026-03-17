import { useState, useEffect } from "react";
import { Toggle } from "./ui/toggle_custom";
import { Label } from "./ui/label";
import { supabase } from "../utils/supabaseClient";
import { toast } from "sonner";
import { isPushSupported, subscribeToPush } from "../utils/pushNotifications";
import { Button } from "./ui/button";

interface NotificationSettingsProps {
  userId: string;
}

export function NotificationSettings({ userId }: NotificationSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [preferences, setPreferences] = useState<{ [key: string]: boolean }>({
    chats: true,
    replies: true,
    follows: true,
    likes: true,
    buddies: true,
    comments: true,
    mentions: true,
  });

  useEffect(() => {
    setPermission(Notification.permission);

    const fetchPreferences = async () => {
      if (!userId) return;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("notification_preferences")
          .eq("id", userId)
          .maybeSingle();

        if (error) throw error;

        if (data?.notification_preferences) {
          setPreferences(data.notification_preferences);
        }
      } catch (err) {
        console.error("Error fetching notification preferences:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, [userId]);

  const handleToggle = async (key: string, checked: boolean) => {
    const updated = { ...preferences, [key]: checked };
    setPreferences(updated);
    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ notification_preferences: updated })
        .eq("id", userId);

      if (error) throw error;
      toast.success("Preferences updated");
    } catch (err: any) {
      toast.error("Failed to save changes: " + err.message);
      // Rollback on failure
      setPreferences(preferences);
    } finally {
      setSaving(false);
    }
  };

  const handleEnableEnableBrowser = async () => {
    const success = await subscribeToPush(userId);
    if (success) {
      setPermission("granted");
      toast.success("Notifications enabled in browser");
    } else {
      toast.error("Failed to enable browser notifications");
    }
  };

  if (loading) return <div className="text-center py-4">Loading preferences...</div>;

  const prefItems = [
    { key: "chats", label: "Direct Messages", desc: "When someone sends you a message" },
    { key: "replies", label: "Replies", desc: "When someone replies to your post" },
    { key: "comments", label: "Comments", desc: "When someone comments on your post" },
    { key: "likes", label: "Likes", desc: "When someone likes your work" },
    { key: "follows", label: "New Followers", desc: "When someone starts following you" },
    { key: "buddies", label: "Buddy Requests", desc: "When you receive a buddy request" },
    { key: "mentions", label: "Mentions", desc: "When someone mentions you (@username)" },
  ];

  return (
    <div className="space-y-6">
      {!isPushSupported() && (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl text-orange-800 text-sm">
          Push notifications are not supported by your browser.
        </div>
      )}

      {isPushSupported() && permission !== "granted" && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-sm text-blue-900">Browser Notifications Disabled</h4>
            <p className="text-xs text-blue-800 mt-1">
              Enable standard browser push streams to receive these alerts on your device.
            </p>
          </div>
          <Button size="sm" onClick={handleEnableEnableBrowser} className="bg-[#d4756f] hover:bg-[#c1645e] text-white font-semibold text-xs rounded-lg shadow-md px-4 h-8 transition-transform active:scale-95">
            Enable
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {prefItems.map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between py-3 border-b border-[#8a7c74]/5 last:border-0">
            <div className="space-y-0.5">
              <Label htmlFor={key} className="font-medium text-sm text-[#2d2424]">{label}</Label>
              <p className="text-xs text-[#8a7c74]">{desc}</p>
            </div>
            <Toggle
              checked={preferences[key] !== false}
              disabled={saving}
              onChange={(checked) => handleToggle(key, checked)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
