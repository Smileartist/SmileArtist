import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useTheme } from "../utils/ThemeContext";
import { supabase } from "../utils/supabaseClient";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useUserData } from "../App";
import { useLanguage } from "../utils/LanguageContext";
import { Lang } from "../utils/i18n";
import { toast } from "sonner";
import {
  User, Lock, Bell, Moon, Sun, Database,
  Trash2, Shield, UserX, LogOut, Globe,
} from "lucide-react";

interface SettingsProps {
  onLogout: () => void;
  username: string;
  userId: string;
  onUsernameUpdate: (newUsername: string) => void;
}

export function Settings({ onLogout, username: usernameProp, userId, onUsernameUpdate }: SettingsProps) {
  const { updateTheme } = useTheme();
  const { username: contextUsername, refreshUserData } = useUserData();
  const { t, setLanguage: applyLanguage } = useLanguage();
  const username = contextUsername || usernameProp;

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [editableUsername, setEditableUsername] = useState(username);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);

  // ── Privacy settings ───────────────────────────────────────────
  const [showEmail, setShowEmailState] = useState(localStorage.getItem("privacy_showEmail") === "true");
  const [showActivity, setShowActivityState] = useState(localStorage.getItem("privacy_showActivity") !== "false");

  // ── Notifications ──────────────────────────────────────────────
  const [pushNotifications, setPushNotificationsState] = useState(localStorage.getItem("app_notifications") !== "false");

  // ── Appearance ─────────────────────────────────────────────────
  const [darkMode, setDarkMode] = useState(localStorage.getItem("app_darkMode") === "true");

  // ── Data & Storage ─────────────────────────────────────────────
  const [dataUsage, setDataUsageState] = useState(localStorage.getItem("app_dataUsage") || "normal");
  const [autoDownload, setAutoDownloadState] = useState(localStorage.getItem("app_autoDownload") === "true");

  // ── Language ───────────────────────────────────────────────────
  const [language, setLanguageState] = useState(localStorage.getItem("app_language") || "english");

  // ── Init ───────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || "");
        const { data } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle();
        if (data) setAvatarUrl(data.avatar_url);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!isEditingUsername) setEditableUsername(username);
  }, [username, isEditingUsername]);

  // ── Privacy handlers ───────────────────────────────────────────
  const setShowEmail = (val: boolean) => {
    setShowEmailState(val);
    localStorage.setItem("privacy_showEmail", val.toString());
    toast.success(val ? "Email shown on your profile" : "Email hidden from profile");
  };

  const setShowActivity = (val: boolean) => {
    setShowActivityState(val);
    localStorage.setItem("privacy_showActivity", val.toString());
    // Notify Navigation so the green dot updates immediately (no page reload needed)
    window.dispatchEvent(new CustomEvent("activityStatusChanged", { detail: val }));
    toast.success(val ? "Activity status visible" : "Activity status hidden");
  };

  // ── Push Notifications ─────────────────────────────────────────
  const setPushNotifications = async (val: boolean) => {
    if (val) {
      if (!("Notification" in window)) {
        toast.error("This browser does not support notifications");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setPushNotificationsState(true);
        localStorage.setItem("app_notifications", "true");
        toast.success("Push notifications enabled! 🔔");
        // Use service worker (registered in main.tsx) to show a real notification
        if ("serviceWorker" in navigator) {
          const reg = await navigator.serviceWorker.ready;
          reg.showNotification("Smile Artist", {
            body: "You'll now receive notifications for new activity.",
            icon: "/favicon.ico",
          });
        }
      } else if (permission === "denied") {
        toast.error("Notifications blocked. Please allow them in browser settings.");
        setPushNotificationsState(false);
      } else {
        toast.info("Notification permission dismissed");
      }
    } else {
      setPushNotificationsState(false);
      localStorage.setItem("app_notifications", "false");
      toast.success("Push notifications disabled");
    }
  };

  // ── Dark mode ──────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem("app_darkMode", darkMode.toString());
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
      updateTheme({ backgroundColor: "#1a1515", textColor: "#f5e8e0", accentColor: "#3d2f2f", chatOtherMessageBg: "#2d2424" });
    } else {
      root.classList.remove("dark");
      updateTheme({ backgroundColor: "#fef9f5", textColor: "#2d2424", accentColor: "#fce4da", chatOtherMessageBg: "#ffffff" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [darkMode]);

  // ── Data usage ─────────────────────────────────────────────────
  const setDataUsage = (val: string) => {
    setDataUsageState(val);
    localStorage.setItem("app_dataUsage", val);
    toast.success(`Data usage set to ${val}`);
  };

  const setAutoDownload = (val: boolean) => {
    setAutoDownloadState(val);
    localStorage.setItem("app_autoDownload", val.toString());
    toast.success(val ? "Auto-download enabled" : "Auto-download disabled");
  };

  // ── Language ───────────────────────────────────────────────────
  const setLanguage = (val: string) => {
    setLanguageState(val);
    applyLanguage(val as Lang); // updates LanguageContext + document.lang instantly
    const labels: Record<string, string> = {
      english: "English", spanish: "Español", french: "Français", german: "Deutsch", hindi: "हिन्दी",
    };
    toast.success(`Language set to ${labels[val] || val}`);
  };

  // ── Username save ──────────────────────────────────────────────
  const handleUsernameSave = async () => {
    setSavingUsername(true);
    try {
      const { error } = await supabase.from("profiles").upsert(
        { id: userId, username: editableUsername.toLowerCase(), updated_at: new Date().toISOString() },
        { onConflict: "id" }
      );
      if (error) {
        if (error.code === "23505") toast.error("Username already taken.");
        else throw error;
      } else {
        toast.success("Username updated!");
        setIsEditingUsername(false);
        await refreshUserData();
        onUsernameUpdate(editableUsername);
      }
    } catch (err: any) {
      toast.error("Failed to update username: " + err.message);
    } finally {
      setSavingUsername(false);
    }
  };

  // ── Clear App Data ─────────────────────────────────────────────
  const handleClearData = () => {
    if (!confirm("Clear all local app data (settings, cache, theme)? You will stay logged in.")) return;
    const sessionKeys: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!;
      if (key.startsWith("sb-") || key.startsWith("supabase")) sessionKeys[key] = localStorage.getItem(key)!;
    }
    localStorage.clear();
    sessionStorage.clear();
    Object.entries(sessionKeys).forEach(([k, v]) => localStorage.setItem(k, v));
    toast.success("App data cleared. Reloading…");
    setTimeout(() => window.location.reload(), 1200);
  };

  // ── Delete Account ─────────────────────────────────────────────
  const handleDeleteAccount = async () => {
    if (!confirm("⚠️ Delete your account? This removes your profile and all posts permanently.")) return;
    const typed = prompt('Type "DELETE" to confirm:');
    if (typed !== "DELETE") { toast.error("Account deletion cancelled."); return; }
    try {
      toast.info("Deleting account data…");
      await supabase.from("posts").delete().eq("user_id", userId);
      await supabase.from("follows").delete().eq("follower_id", userId);
      await supabase.from("follows").delete().eq("following_id", userId);
      await supabase.from("notifications").delete().eq("recipient_id", userId);
      await supabase.from("profiles").delete().eq("id", userId);
      await supabase.from("users").delete().eq("id", userId);
      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
      toast.success("Account deleted.");
      onLogout();
    } catch (err: any) {
      toast.error("Failed to delete account: " + err.message);
    }
  };

  // ── UI helpers ─────────────────────────────────────────────────
  const SettingSection = ({ title, icon: Icon, children }: any) => (
    <Card className="mb-4 backdrop-blur-sm border-2 rounded-2xl overflow-hidden"
      style={{
        backgroundColor: darkMode ? "rgba(45,36,36,0.8)" : "rgba(255,255,255,0.8)",
        borderColor: darkMode ? "rgba(212,117,111,0.3)" : "rgba(212,117,111,0.2)",
      }}>
      <div className="p-4 border-b"
        style={{
          backgroundColor: darkMode ? "rgba(61,47,47,0.3)" : "rgba(252,228,218,0.3)",
          borderColor: darkMode ? "rgba(212,117,111,0.2)" : "rgba(212,117,111,0.1)",
        }}>
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5" style={{ color: "#d4756f" }} />
          <h3 style={{ color: darkMode ? "#f5e8e0" : "#2d2424" }}>{title}</h3>
        </div>
      </div>
      <div className="p-4 space-y-4">{children}</div>
    </Card>
  );

  const SettingRow = ({ label, description, children, column = false }: any) => (
    <div className={`flex ${column ? "flex-col space-y-2" : "items-center justify-between"} py-2`}>
      <div className="flex-1">
        <p className="text-sm" style={{ color: darkMode ? "#f5e8e0" : "#2d2424" }}>{label}</p>
        {description && <p className="text-xs mt-0.5" style={{ color: darkMode ? "#c9a28f" : "#8a7c74" }}>{description}</p>}
      </div>
      <div className={column ? "w-full" : ""}>{children}</div>
    </div>
  );

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button onClick={() => onChange(!checked)}
      className={`relative w-12 h-6 rounded-full transition-colors ${checked ? "bg-[#d4756f]" : "bg-[#e0d5ce]"}`}>
      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${checked ? "translate-x-6" : "translate-x-0"}`} />
    </button>
  );

  const selectStyle = {
    backgroundColor: darkMode ? "#2d2424" : "white",
    color: darkMode ? "#f5e8e0" : "#2d2424",
    borderColor: darkMode ? "rgba(212,117,111,0.3)" : "rgba(212,117,111,0.2)",
  };

  return (
    <div className="max-w-4xl mx-auto pb-8">
      <div className="mb-6">
        <h2 className="mb-2" style={{ color: darkMode ? "#f5e8e0" : "#2d2424" }}>{t("settings")}</h2>
        <p className="text-sm md:text-base" style={{ color: darkMode ? "#c9a28f" : "#8a7c74" }}>{t("manage_desc")}</p>
      </div>

      {/* Account */}
      <SettingSection title={t("account")} icon={User}>
        <div className="flex items-center gap-4 py-2">
          <Avatar className="w-16 h-16 border-2 border-[var(--theme-primary)]/20 shadow-md">
            <AvatarImage src={avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`} alt={username} />
            <AvatarFallback className="bg-gradient-to-br from-[#d4756f] to-[#c9a28f] text-white text-xl">
              {username?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p style={{ color: darkMode ? "#f5e8e0" : "#2d2424" }}>{username}</p>
            <p className="text-xs" style={{ color: darkMode ? "#c9a28f" : "#8a7c74" }}>{t("member")}</p>
            {showEmail && userEmail && (
              <p className="text-xs mt-1" style={{ color: darkMode ? "#c9a28f" : "#8a7c74" }}>📧 {userEmail}</p>
            )}
          </div>
        </div>

        <SettingRow label={t("username")} description={t("username_desc")} column={isEditingUsername}>
          {isEditingUsername ? (
            <div className="space-y-3">
              <Input type="text" value={editableUsername} onChange={(e) => setEditableUsername(e.target.value)}
                className="w-full rounded-xl border-[var(--theme-primary)]/20 bg-[var(--theme-card-bg)]"
                disabled={savingUsername} autoFocus />
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => { setIsEditingUsername(false); setEditableUsername(username); }}
                  disabled={savingUsername} className="rounded-xl" style={{ color: darkMode ? "#f5e8e0" : "#2d2424" }}>
                  {t("cancel")}
                </Button>
                <Button onClick={handleUsernameSave} disabled={savingUsername || editableUsername === username}
                  className="rounded-xl px-6"
                  style={{ background: "linear-gradient(to right,var(--theme-primary),var(--theme-secondary))", color: "white" }}>
                  {savingUsername ? t("saving") : t("save")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span style={{ color: darkMode ? "#f5e8e0" : "#2d2424" }}>@{username}</span>
              <Button variant="outline" onClick={() => setIsEditingUsername(true)} className="rounded-xl"
                style={{ color: darkMode ? "#f5e8e0" : "#2d2424" }}>
                {t("edit")}
              </Button>
            </div>
          )}
        </SettingRow>
      </SettingSection>

      {/* Privacy & Security */}
      <SettingSection title={t("privacy_security")} icon={Shield}>
        {/* Profile Visibility — commented out for now */}
        {/* <SettingRow label="Profile Visibility" description="Who can see your profile">
          <select className="px-3 py-1.5 border rounded-lg text-sm" style={selectStyle}>
            <option value="public">Public</option>
            <option value="friends">Friends Only</option>
            <option value="private">Private</option>
          </select>
        </SettingRow> */}

        <SettingRow label={t("show_email")} description={t("show_email_desc")}>
          <Toggle checked={showEmail} onChange={setShowEmail} />
        </SettingRow>

        {/* Allow Messages — commented out for now */}
        {/* <SettingRow label="Allow Messages" description="Let buddies send you shared posts">
          <Toggle checked={allowMessages} onChange={setAllowMessages} />
        </SettingRow> */}

        <SettingRow label={t("show_activity")} description={t("show_activity_desc")}>
          <Toggle checked={showActivity} onChange={setShowActivity} />
        </SettingRow>
      </SettingSection>

      {/* Notifications */}
      <SettingSection title={t("notifications")} icon={Bell}>
        <SettingRow label={t("push_notifications")} description={t("push_notif_desc")}>
          <Toggle checked={pushNotifications} onChange={setPushNotifications} />
        </SettingRow>
        {pushNotifications && (
          <p className="text-xs px-1" style={{ color: darkMode ? "#c9a28f" : "#8a7c74" }}>
            ✅ Push notifications are enabled for this browser
          </p>
        )}
      </SettingSection>

      {/* Appearance */}
      <SettingSection title={t("appearance")} icon={darkMode ? Moon : Sun}>
        <SettingRow label={t("dark_mode")} description={t("dark_mode_desc")}>
          <Toggle checked={darkMode} onChange={setDarkMode} />
        </SettingRow>
      </SettingSection>

      {/* Data & Storage */}
      <SettingSection title={t("data_storage")} icon={Database}>
        <SettingRow label={t("data_usage")} description={t("data_usage_desc")}>
          <select value={dataUsage} onChange={(e) => setDataUsage(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none" style={selectStyle}>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High Quality</option>
          </select>
        </SettingRow>

        <SettingRow label={t("auto_download")} description={t("auto_download_desc")}>
          <Toggle checked={autoDownload} onChange={setAutoDownload} />
        </SettingRow>

        <div className="pt-2 border-t border-[#d4756f]/10">
          <Button onClick={handleClearData} variant="outline"
            className="w-full justify-start text-[#d4756f] border-[#d4756f]/20 hover:bg-[#fce4da]/30 rounded-xl">
            <Trash2 className="w-4 h-4 mr-2" />
            {t("clear_app_data")}
          </Button>
        </div>
      </SettingSection>

      {/* Language */}
      <SettingSection title={t("language_region")} icon={Globe}>
        <SettingRow label={t("app_language")} description={t("app_language_desc")}>
          <select value={language} onChange={(e) => setLanguage(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-sm focus:outline-none" style={selectStyle}>
            <option value="english">English</option>
            <option value="spanish">Español</option>
            <option value="french">Français</option>
            <option value="german">Deutsch</option>
            <option value="hindi">हिन्दी</option>
          </select>
        </SettingRow>
      </SettingSection>

      {/* Account Actions */}
      <SettingSection title={t("account_actions")} icon={Lock}>
        <Button onClick={onLogout} variant="outline" className="w-full justify-start rounded-xl mb-2"
          style={{ color: darkMode ? "#f5e8e0" : "#2d2424", borderColor: darkMode ? "rgba(212,117,111,0.3)" : "rgba(212,117,111,0.2)", backgroundColor: "transparent" }}>
          <LogOut className="w-4 h-4 mr-2" />
          {t("logout")}
        </Button>

        <Button onClick={handleDeleteAccount} variant="outline"
          className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50 rounded-xl">
          <UserX className="w-4 h-4 mr-2" />
          {t("delete_account")}
        </Button>
      </SettingSection>

      <Card className="mt-6 p-4 backdrop-blur-sm border-2 rounded-2xl text-center"
        style={{
          backgroundColor: darkMode ? "rgba(45,36,36,0.8)" : "rgba(255,255,255,0.8)",
          borderColor: darkMode ? "rgba(212,117,111,0.3)" : "rgba(212,117,111,0.2)",
        }}>
        <p className="text-xs" style={{ color: darkMode ? "#c9a28f" : "#8a7c74" }}>Smile Artist v1.0.0</p>
        <p className="text-xs mt-1" style={{ color: darkMode ? "#c9a28f" : "#8a7c74" }}>
          A safe space for poetry and connections
        </p>
      </Card>
    </div>
  );
}
