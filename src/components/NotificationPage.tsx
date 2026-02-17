import { useState, useEffect } from "react";
import { Heart, MessageCircle, UserPlus, AtSign, Award, CheckCheck, Sparkles } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { supabase } from "../utils/supabaseClient";

interface ProfileData {
  full_name: string;
  username: string;
  avatar_url: string;
}

interface Notification {
  id: string;
  type: "like" | "comment" | "follow" | "mention" | "buddy_request" | "buddy_accepted" | "milestone";
  sender_id: string; // Only store sender_id, fetch profile separately
  sender_profile: ProfileData | null; // To store fetched profile data
  content?: string;
  post_id?: string; 
  created_at: string;
  is_read: boolean;
}

export function NotificationPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (sessionData.session) {
          const userId = sessionData.session.user.id;
          const { data, error: fetchError } = await supabase
            .from("notifications")
            .select(
              `
              id,
              type,
              content,
              post_id,
              is_read,
              created_at,
              sender_id
            `
            )
            .eq("recipient_id", userId)
            .order("created_at", { ascending: false });

          if (fetchError) throw fetchError;
          
          const notificationsWithProfilesPromises = (data || []).map(async (n: any) => {
            let senderProfile: ProfileData | null = null;
            if (n.sender_id) {
              const { data: profileData, error: profileError } = await supabase
                .from("profiles")
                .select("full_name, username, avatar_url")
                .eq("id", n.sender_id)
                .single();

              if (profileError) {
                console.error("Error fetching sender profile for notification:", profileError);
              } else {
                senderProfile = profileData;
              }
            }
            return {
              id: n.id,
              type: n.type,
              sender_id: n.sender_id,
              sender_profile: senderProfile,
              content: n.content,
              post_id: n.post_id,
              created_at: n.created_at,
              is_read: n.is_read,
            };
          });

          const formattedNotifications = await Promise.all(notificationsWithProfilesPromises);
          setNotifications(formattedNotifications);
        } else {
          setNotifications([]);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
        setError("Failed to load notifications. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAllAsRead = async () => {
    setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("recipient_id", (await supabase.auth.getSession()).data.session?.user.id)
        .eq("is_read", false);
      if (error) throw error;
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const markAsRead = async (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, is_read: true } : n
    ));
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
      if (error) throw error;
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "like":
        return Heart;
      case "comment":
        return MessageCircle;
      case "follow":
        return UserPlus;
      case "mention":
        return AtSign;
      case "buddy_request":
      case "buddy_accepted":
        return Award;
      case "milestone":
        return Sparkles;
      default:
        return Heart;
    }
  };

  const getNotificationText = (notification: Notification) => {
    const truncateText = (text: string, maxLength: number) => {
      if (text.length > maxLength) {
        return text.substring(0, maxLength) + "...";
      }
      return text;
    };

    const senderName = notification.sender_profile?.full_name || notification.sender_profile?.username || "Unknown User";

    switch (notification.type) {
      case "like":
        return (
          <>
            <strong>{senderName}</strong> liked
            {notification.post_id ? " your post" : " a post"}
          </>
        );
      case "comment":
        return (
          <>
            <strong>{senderName}</strong> commented on
            {notification.post_id ? " your post" : " a post"}
          </>
        );
      case "follow":
        return (
          <>
            <strong>{senderName}</strong> started following you
          </>
        );
      case "mention":
        return (
          <>
            <strong>{senderName}</strong> {notification.content ? truncateText(notification.content, 50) : "mentioned you"}
          </>
        );
      case "buddy_request":
        return (
          <>
            <strong>{senderName}</strong> sent you a Talking Buddy request
          </>
        );
      case "buddy_accepted":
        return (
          <>
            <strong>{senderName}</strong> {notification.content ? truncateText(notification.content, 50) : "accepted your buddy request"}
          </>
        );
      case "milestone":
        return notification.content;
      default:
        return notification.content ? truncateText(notification.content, 50) : "";
    }
  };

  const handleBuddyRequest = async (notificationId: string, accept: boolean) => {
    markAsRead(notificationId);
    console.log(`Buddy request ${accept ? 'accepted' : 'declined'} for notification ID: ${notificationId}`);
  };

  const filterNotifications = (filter: string) => {
    if (filter === "all") return notifications;
    if (filter === "mentions") return notifications.filter(n => n.type === "mention");
    if (filter === "buddy") return notifications.filter(n => 
      n.type === "buddy_request" || n.type === "buddy_accepted"
    );
    return notifications;
  };

  const NotificationItem = ({ notification }: { notification: Notification }) => {
    const Icon = getNotificationIcon(notification.type);
    
    return (
      <div
        onClick={() => markAsRead(notification.id)}
        className="flex gap-4 p-4 rounded-2xl transition-all cursor-pointer hover:shadow-md"
        style={{
          backgroundColor: notification.is_read ? 'transparent' : 'var(--theme-accent)',
          border: `1px solid ${notification.is_read ? 'var(--theme-primary)22' : 'var(--theme-primary)44'}`, 
        }}
      >
        <Avatar className="w-12 h-12 flex-shrink-0">
          <AvatarImage src={notification.sender_profile?.avatar_url} alt={notification.sender_profile?.full_name} />
          <AvatarFallback>{notification.sender_profile?.full_name ? notification.sender_profile.full_name[0] : '?'}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-1">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'var(--theme-primary)22' }}
            >
              <Icon className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ color: 'var(--theme-text)' }}>
                {getNotificationText(notification)}
              </p>
              {notification.type === "comment" && notification.content && (
                <p 
                  className="text-sm mt-1 italic"
                  style={{ color: 'var(--theme-text)', opacity: 0.7 }}
                >
                  "{notification.content}"
                </p>
              )}
              {notification.type === "buddy_request" && notification.content && (
                <p 
                  className="text-sm mt-2 p-3 rounded-xl"
                  style={{ 
                    backgroundColor: 'var(--theme-card-bg)',
                    color: 'var(--theme-text)',
                    opacity: 0.9,
                  }}
                >
                  "{notification.content}"
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-2">
            <span className="text-sm" style={{ color: 'var(--theme-text)', opacity: 0.5 }}>
              {new Date(notification.created_at).toLocaleString()}
            </span>

            {notification.type === "buddy_request" && !notification.is_read && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    handleBuddyRequest(notification.id, true);
                  }}
                  className="rounded-lg text-white"
                  style={{
                    background: `linear-gradient(to right, var(--theme-primary), var(--theme-secondary))`,
                  }}
                >
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    handleBuddyRequest(notification.id, false);
                  }}
                  className="rounded-lg"
                  style={{
                    borderColor: 'var(--theme-primary)',
                    color: 'var(--theme-primary)',
                  }}
                >
                  Decline
                </Button>
              </div>
            )}
          </div>
        </div>

        {!notification.is_read && (
          <div 
            className="w-2 h-2 rounded-full flex-shrink-0 mt-2"
            style={{ backgroundColor: 'var(--theme-primary)' }}
          />
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="text-center py-12" style={{ color: 'var(--theme-text)' }}>Loading notifications...</div>;
  }

  if (error) {
    return <div className="text-center py-12" style={{ color: 'red' }}>{error}</div>;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 style={{ color: 'var(--theme-text)' }}>Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm mt-1" style={{ color: 'var(--theme-text)', opacity: 0.6 }}>
                You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              className="rounded-xl"
              style={{
                borderColor: 'var(--theme-primary)',
                color: 'var(--theme-primary)',
              }}
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList 
          className="grid w-full grid-cols-3 mb-6 rounded-xl shadow-md"
          style={{ backgroundColor: 'var(--theme-accent)' }}
        >
          <TabsTrigger value="all" className="rounded-xl">
            All
            {unreadCount > 0 && (
              <Badge 
                className="ml-2 px-2 py-0.5"
                style={{
                  backgroundColor: 'var(--theme-primary)',
                  color: 'white',
                }}
              >
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="mentions" className="rounded-xl">
            Mentions
          </TabsTrigger>
          <TabsTrigger value="buddy" className="rounded-xl">
            Talking Buddy
            {notifications.filter(n => 
              (n.type === "buddy_request" || n.type === "buddy_accepted") && !n.is_read
            ).length > 0 && (
              <Badge 
                className="ml-2 px-2 py-0.5"
                style={{
                  backgroundColor: 'var(--theme-primary)',
                  color: 'white',
                }}
              >
                {notifications.filter(n => 
                  (n.type === "buddy_request" || n.type === "buddy_accepted") && !n.is_read
                ).length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-3">
          {filterNotifications("all").length > 0 ? (
            filterNotifications("all").map((notification) => (
              <NotificationItem key={notification.id} notification={notification} />
            ))
          ) : (
            <div className="text-center py-12">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: 'var(--theme-accent)' }} 
              >
                <CheckCheck className="w-8 h-8" style={{ color: 'var(--theme-primary)' }} />
              </div>
              <p style={{ color: 'var(--theme-text)', opacity: 0.6 }}>
                You're all caught up! No new notifications.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="mentions" className="space-y-3">
          {filterNotifications("mentions").length > 0 ? (
            filterNotifications("mentions").map((notification) => (
              <NotificationItem key={notification.id} notification={notification} />
            ))
          ) : (
            <div className="text-center py-12">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: 'var(--theme-accent)' }} 
              >
                <AtSign className="w-8 h-8" style={{ color: 'var(--theme-primary)' }} />
              </div>
              <p style={{ color: 'var(--theme-text)', opacity: 0.6 }}>
                No mentions yet
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="buddy" className="space-y-3">
          {filterNotifications("buddy").length > 0 ? (
            filterNotifications("buddy").map((notification) => (
              <NotificationItem key={notification.id} notification={notification} />
            ))
          ) : (
            <div className="text-center py-12">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: 'var(--theme-accent)' }} 
              >
                <Award className="w-8 h-8" style={{ color: 'var(--theme-primary)' }} />
              </div>
              <p style={{ color: 'var(--theme-text)', opacity: 0.6 }}>
                No Talking Buddy notifications
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
