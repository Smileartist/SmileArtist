import { useState, useEffect } from "react";
import { Heart, MessageCircle, UserPlus, AtSign, Award, CheckCheck, Sparkles } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { supabase } from "../utils/supabaseClient"; // Assuming supabaseClient is in ../utils/supabaseClient

interface Notification {
  id: string;
  type: "like" | "comment" | "follow" | "mention" | "buddy_request" | "buddy_accepted" | "milestone";
  user: {
    name: string;
    username: string;
    avatar: string;
  };
  content?: string;
  postTitle?: string;
  timestamp: string;
  isRead: boolean;
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
            .select("*")
            .eq("recipient_id", userId) // Assuming a 'recipient_id' column in your notifications table
            .order("created_at", { ascending: false }); // Assuming a 'created_at' column

          if (fetchError) throw fetchError;
          
          // Map the fetched data to the Notification interface
          const formattedNotifications: Notification[] = data.map((n: any) => ({
            id: n.id,
            type: n.type,
            user: {
              name: n.sender_name, // Assuming sender_name is available
              username: n.sender_username, // Assuming sender_username is available
              avatar: n.sender_avatar || "", // Assuming sender_avatar is available, with a fallback
            },
            content: n.content,
            postTitle: n.post_title,
            timestamp: new Date(n.created_at).toLocaleString(), // Format timestamp
            isRead: n.is_read,
          }));
          setNotifications(formattedNotifications);
        } else {
          // No active session, clear notifications or show a message
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

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAllAsRead = async () => {
    // Optimistic UI update
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    try {
      // API call to mark all as read
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("recipient_id", (await supabase.auth.getSession()).data.session?.user.id) // Ensure correct user
        .neq("is_read", true); // Only update unread ones
      if (error) throw error;
    } catch (error) {
      console.error("Error marking all as read:", error);
      // Revert UI if API call fails
      // For simplicity, not reverting here, but in a real app you might want to.
    }
  };

  const markAsRead = async (id: string) => {
    // Optimistic UI update
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    ));
    try {
      // API call to mark as read
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
      if (error) throw error;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      // Revert UI if API call fails
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
    switch (notification.type) {
      case "like":
        return (
          <>
            <strong>{notification.user.name}</strong> liked your post
            {notification.postTitle && <span className="opacity-70"> "{notification.postTitle}"</span>}
          </>
        );
      case "comment":
        return (
          <>
            <strong>{notification.user.name}</strong> commented on
            {notification.postTitle && <span className="opacity-70"> "{notification.postTitle}"</span>}
          </>
        );
      case "follow":
        return (
          <>
            <strong>{notification.user.name}</strong> started following you
          </>
        );
      case "mention":
        return (
          <>
            <strong>{notification.user.name}</strong> {notification.content}
          </>
        );
      case "buddy_request":
        return (
          <>
            <strong>{notification.user.name}</strong> sent you a Talking Buddy request
          </>
        );
      case "buddy_accepted":
        return (
          <>
            <strong>{notification.user.name}</strong> {notification.content}
          </>
        );
      case "milestone":
        return notification.content;
      default:
        return notification.content;
    }
  };

  const handleBuddyRequest = async (notificationId: string, accept: boolean) => {
    // Handle buddy request acceptance/rejection
    markAsRead(notificationId); // Mark as read immediately
    // In a real app, this would make an API call to update buddy status
    // For now, we'll just log it.
    console.log(`Buddy request ${accept ? 'accepted' : 'declined'} for notification ID: ${notificationId}`);
    // Example: You might call another Supabase function here to update relationships
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
          backgroundColor: notification.isRead ? 'transparent' : 'var(--theme-accent)',
          border: `1px solid ${notification.isRead ? 'var(--theme-primary)22' : 'var(--theme-primary)44'}`,
        }}
      >
        {/* Avatar */}
        <Avatar className="w-12 h-12 flex-shrink-0">
          <AvatarImage src={notification.user.avatar} alt={notification.user.name} />
          <AvatarFallback>{notification.user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
        </Avatar>

        {/* Content */}
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
              {notification.timestamp}
            </span>

            {/* Action buttons for buddy requests */}
            {notification.type === "buddy_request" && !notification.isRead && (
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

        {/* Unread indicator */}
        {!notification.isRead && (
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
      {/* Header */}
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

      {/* Tabs */}
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
              (n.type === "buddy_request" || n.type === "buddy_accepted") && !n.isRead
            ).length > 0 && (
              <Badge 
                className="ml-2 px-2 py-0.5"
                style={{
                  backgroundColor: 'var(--theme-primary)',
                  color: 'white',
                }}
              >
                {notifications.filter(n => 
                  (n.type === "buddy_request" || n.type === "buddy_accepted") && !n.isRead
                ).length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* All Notifications */}
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

        {/* Mentions */}
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

        {/* Talking Buddy */}
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
