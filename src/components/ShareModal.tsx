import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Send, Check } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { supabase } from "../utils/supabaseClient";
import { toast } from "sonner";

interface ShareModalProps {
  postId: string;
  postTitle?: string;
  postContent: string;
  isOpen: boolean;
  onClose: () => void;
}

interface BuddyChat {
  chatId: string;
  buddy: {
    id: string;
    full_name: string;
    username: string;
    avatar_url: string;
  };
}

export function ShareModal({ postId, postTitle, postContent, isOpen, onClose }: ShareModalProps) {
  const [buddyChats, setBuddyChats] = useState<BuddyChat[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Offset from left (sidebar) and from bottom (mobile nav)
  const [leftOffset, setLeftOffset] = useState(0);
  const [bottomOffset, setBottomOffset] = useState(0);

  useEffect(() => {
    const update = () => {
      const isDesktop = window.innerWidth >= 768;
      setLeftOffset(isDesktop ? 256 : 0);
      setBottomOffset(isDesktop ? 0 : 64);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchBuddyChats();
      setSelected(new Set());
    }
  }, [isOpen]);

  const fetchBuddyChats = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all chats the current user participates in
      const { data: participations } = await supabase
        .from("chat_participants")
        .select("chat_id")
        .eq("user_id", user.id);

      if (!participations || participations.length === 0) { setBuddyChats([]); return; }

      const chatIds = participations.map((p: any) => p.chat_id);

      // Get buddy-type chats only
      const { data: chats } = await supabase
        .from("chats")
        .select("id")
        .in("id", chatIds)
        .eq("type", "buddy");

      if (!chats || chats.length === 0) { setBuddyChats([]); return; }

      // For each chat, find the other participant
      const buddyChatList: BuddyChat[] = [];

      for (const chat of chats) {
        const { data: participants } = await supabase
          .from("chat_participants")
          .select("user_id")
          .eq("chat_id", chat.id)
          .neq("user_id", user.id);

        if (!participants || participants.length === 0) continue;

        const otherId = participants[0].user_id;

        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url")
          .eq("id", otherId)
          .maybeSingle();

        if (profile) {
          buddyChatList.push({
            chatId: chat.id,
            buddy: {
              id: profile.id,
              full_name: profile.full_name || profile.username || "User",
              username: profile.username || "user",
              avatar_url: profile.avatar_url || "",
            },
          });
        }
      }

      setBuddyChats(buddyChatList);
    } catch (err) {
      console.error("Error fetching buddy chats:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (chatId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(chatId)) next.delete(chatId);
      else next.add(chatId);
      return next;
    });
  };

  const handleSend = async () => {
    if (selected.size === 0) return;
    setSending(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSending(false); return; }

    // Build a short, readable message
    const preview = postContent.length > 120 ? postContent.slice(0, 120) + "…" : postContent;
    const messageText = postTitle
      ? `📖 *${postTitle}*\n\n${preview}`
      : `📖 ${preview}`;

    try {
      const insertions = Array.from(selected).map((chatId) =>
        supabase.from("messages").insert({
          chat_id: chatId,
          sender_id: user.id,
          content: messageText,
          is_read: false,
          created_at: new Date().toISOString(),
        })
      );

      await Promise.all(insertions);

      // Update last_message_at on those chats
      await Promise.all(
        Array.from(selected).map((chatId) =>
          supabase.from("chats").update({ last_message_at: new Date().toISOString() }).eq("id", chatId)
        )
      );

      toast.success(`Post shared with ${selected.size} buddy${selected.size > 1 ? "s" : ""}! 💬`);
      onClose();
    } catch (err: any) {
      console.error("Error sharing post:", err);
      toast.error("Failed to share post");
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100]"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div
        className="fixed z-[101] right-0 flex items-end justify-center"
        style={{ left: leftOffset, bottom: bottomOffset }}
        onClick={onClose}
      >
        <div
          className="w-full flex flex-col"
          style={{
            maxWidth: leftOffset > 0 ? "520px" : "100%",
            backgroundColor: "var(--theme-background)",
            borderRadius: "16px 16px 0 0",
            maxHeight: "70vh",
            boxShadow: "0 -4px 30px rgba(0,0,0,0.25)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-9 h-1 rounded-full" style={{ backgroundColor: "var(--theme-text)", opacity: 0.2 }} />
          </div>

          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: "var(--theme-text)15" }}
          >
            <div className="w-8" />
            <p className="text-sm font-bold tracking-wide" style={{ color: "var(--theme-text)" }}>
              Send to Buddies
            </p>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full"
              style={{ backgroundColor: "var(--theme-accent)" }}
            >
              <X className="w-4 h-4" style={{ color: "var(--theme-text)" }} />
            </button>
          </div>

          {/* Post preview */}
          <div
            className="mx-4 mt-3 px-4 py-2.5 rounded-2xl text-sm"
            style={{
              backgroundColor: "var(--theme-accent)",
              color: "var(--theme-text)",
              opacity: 0.85,
              border: `1px solid var(--theme-primary)22`,
            }}
          >
            {postTitle && <p className="font-semibold mb-0.5">{postTitle}</p>}
            <p className="text-xs opacity-70 line-clamp-2">{postContent.slice(0, 100)}{postContent.length > 100 ? "…" : ""}</p>
          </div>

          {/* Buddy list */}
          <div className="flex-1 overflow-y-auto px-4 py-3" style={{ minHeight: 0 }}>
            {loading && (
              <div className="flex justify-center py-8">
                <div
                  className="w-6 h-6 rounded-full border-2 animate-spin"
                  style={{ borderColor: "var(--theme-primary)", borderTopColor: "transparent" }}
                />
              </div>
            )}

            {!loading && buddyChats.length === 0 && (
              <div className="flex flex-col items-center py-10 gap-2">
                <p className="text-sm font-semibold" style={{ color: "var(--theme-text)" }}>No buddies yet</p>
                <p className="text-xs text-center" style={{ color: "var(--theme-text)", opacity: 0.5 }}>
                  Add buddies from a user's profile to share posts with them.
                </p>
              </div>
            )}

            <div className="grid grid-cols-4 gap-3">
              {buddyChats.map(({ chatId, buddy }) => {
                const isSelected = selected.has(chatId);
                return (
                  <button
                    key={chatId}
                    onClick={() => toggleSelect(chatId)}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all"
                    style={{
                      backgroundColor: isSelected ? "var(--theme-accent)" : "transparent",
                    }}
                  >
                    <div className="relative">
                      <Avatar className="w-14 h-14 border-2" style={{ borderColor: isSelected ? "var(--theme-primary)" : "transparent" }}>
                        <AvatarFallback
                          className="text-sm font-bold"
                          style={{ backgroundColor: "var(--theme-accent)", color: "var(--theme-primary)" }}
                        >
                          {buddy.full_name[0]?.toUpperCase()}
                        </AvatarFallback>
                        <img
                          src={buddy.avatar_url}
                          alt={buddy.full_name}
                          className="w-full h-full object-cover rounded-full"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      </Avatar>
                      {isSelected && (
                        <div
                          className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: "var(--theme-primary)" }}
                        >
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <span
                      className="text-xs text-center leading-tight max-w-full truncate"
                      style={{ color: "var(--theme-text)", opacity: isSelected ? 1 : 0.7, fontWeight: isSelected ? 600 : 400 }}
                    >
                      {buddy.full_name.split(" ")[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Send button */}
          <div
            className="px-4 py-3 border-t"
            style={{ borderColor: "var(--theme-text)15", paddingBottom: "calc(env(safe-area-inset-bottom,0px) + 12px)" }}
          >
            <button
              onClick={handleSend}
              disabled={selected.size === 0 || sending}
              className="w-full py-3 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-opacity"
              style={{
                background: "linear-gradient(to right, var(--theme-primary), var(--theme-secondary))",
                opacity: selected.size === 0 ? 0.4 : 1,
              }}
            >
              {sending ? (
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {selected.size > 0 ? `Send to ${selected.size} buddy${selected.size > 1 ? "s" : ""}` : "Select buddies"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
