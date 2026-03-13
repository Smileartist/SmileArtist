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
  onViewChange?: (view: string, userId?: string | null) => void;
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

export function ShareModal({
  postId,
  postTitle,
  postContent,
  isOpen,
  onClose,
  onViewChange,
}: ShareModalProps) {
  const [buddyChats, setBuddyChats] = useState<BuddyChat[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

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

      // ✅ FIXED QUERY (symmetric buddies table)
      const { data: buddies, error: buddiesError } = await supabase
        .from("buddies")
        .select("user1_id, user2_id")
        .eq("status", "accepted")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (buddiesError) {
        console.error("Error fetching buddies:", buddiesError);
        setBuddyChats([]);
        return;
      }

      if (!buddies || buddies.length === 0) {
        setBuddyChats([]);
        return;
      }

      const buddyChatList: BuddyChat[] = [];

      for (const buddy of buddies) {
        const buddyId =
          buddy.user1_id === user.id
            ? buddy.user2_id
            : buddy.user1_id;

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, username, avatar_url")
          .eq("id", buddyId)
          .maybeSingle();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
          continue;
        }

        if (profile) {
          buddyChatList.push({
            chatId: buddyId,
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
      console.error("Error fetching buddies:", err);
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

    const preview =
      postContent.length > 120
        ? postContent.slice(0, 120) + "…"
        : postContent;

    const messageText = postTitle
      ? `📖 *${postTitle}*\n\n${preview}`
      : `📖 ${preview}`;

    try {
      for (const buddyId of selected) {

        // 🔍 Get or create buddy chat via RPC (bypasses RLS)
        const { data: chatId, error: chatError } = await supabase.rpc(
          "get_or_create_buddy_chat",
          { p_user_id: user.id, p_buddy_id: buddyId }
        );

        if (chatError || !chatId) throw chatError || new Error("No chat ID returned");

        // 💬 Insert message via RPC (bypasses RLS on messages table)
        const { error: messageError } = await supabase.rpc("send_buddy_message", {
          p_chat_id: chatId,
          p_user_id: user.id,
          p_content: messageText,
        });

        if (messageError) throw messageError;
      }

      toast.success(
        `Post shared with ${selected.size} buddy${selected.size > 1 ? "s" : ""}! 💬`
      );

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
        className="fixed inset-0 z-[10000]"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div
        className="fixed z-[10001] right-0 flex items-end justify-center"
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
            <div className="w-9 h-1 rounded-full"
              style={{ backgroundColor: "var(--theme-text)", opacity: 0.2 }}
            />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: "var(--theme-text)15" }}
          >
            <div className="w-8" />
            <p className="text-sm font-bold tracking-wide"
              style={{ color: "var(--theme-text)" }}
            >
              Send to Buddies
            </p>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full"
              style={{ backgroundColor: "var(--theme-accent)" }}
            >
              <X className="w-4 h-4"
                style={{ color: "var(--theme-text)" }}
              />
            </button>
          </div>

          {/* Post preview */}
          <div className="mx-4 mt-3 px-4 py-2.5 rounded-2xl text-sm"
            style={{
              backgroundColor: "var(--theme-accent)",
              color: "var(--theme-text)",
              opacity: 0.85,
              border: `1px solid var(--theme-primary)22`,
            }}
          >
            {postTitle && (
              <p className="font-semibold mb-0.5">{postTitle}</p>
            )}
            <p className="text-xs opacity-70 line-clamp-2">
              {postContent.slice(0, 100)}
              {postContent.length > 100 ? "…" : ""}
            </p>
          </div>

          {/* Buddy list */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {loading && <p className="text-center">Loading...</p>}

            {!loading && buddyChats.length === 0 && (
              <p className="text-center text-sm opacity-60">
                No buddies yet
              </p>
            )}

            <div className="grid grid-cols-4 gap-3">
              {buddyChats.map(({ chatId, buddy }) => {
                const isSelected = selected.has(chatId);
                return (
                  <button
                    key={chatId}
                    onClick={() => toggleSelect(chatId)}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-2xl"
                  >
                    <Avatar className="w-14 h-14">
                      <AvatarFallback>
                        {buddy.full_name[0]?.toUpperCase()}
                      </AvatarFallback>
                      <AvatarImage
                        src={buddy.avatar_url}
                        alt={buddy.full_name}
                      />
                    </Avatar>

                    <span className="text-xs text-center truncate">
                      {buddy.full_name.split(" ")[0]}
                    </span>

                    {isSelected && (
                      <Check className="w-4 h-4 text-green-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Send button */}
          <div className="px-4 py-3 border-t">
            <button
              onClick={handleSend}
              disabled={selected.size === 0 || sending}
              className="w-full py-3 rounded-2xl text-sm font-bold text-white flex items-center justify-center gap-2"
              style={{
                background: "linear-gradient(to right, var(--theme-primary), var(--theme-secondary))",
                opacity: selected.size === 0 ? 0.4 : 1,
              }}
            >
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
