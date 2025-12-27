import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

const app = new Hono();

app.use("*", cors());
app.use("*", logger(console.log));

// Health check endpoint
app.get("/make-server-927350a6/health", (c) => {
  return c.json({ status: "ok", message: "Server is running", timestamp: Date.now() });
});

// Talking Buddy Routes

// Join as listener or seeker
app.post("/make-server-927350a6/buddy/join", async (c) => {
  try {
    const { userId, role } = await c.req.json();

    if (!userId || !role) {
      return c.json({ error: "Missing userId or role" }, 400);
    }

    console.log(`User ${userId} joining as ${role}`);

    // Store user in waiting queue
    await kv.set(`buddy:user:${userId}`, {
      userId,
      role,
      status: "waiting",
      timestamp: Date.now(),
    });

    // Try to find a match
    const oppositeRole = role === "listener" ? "seeker" : "listener";
    
    // Get all waiting users with opposite role
    const waitingUsers = await kv.getByPrefix(`buddy:user:`);
    const potentialMatch = waitingUsers.find(
      (u) => u.role === oppositeRole && u.status === "waiting" && u.userId !== userId
    );

    if (potentialMatch) {
      // Create session
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const sessionData = {
        sessionId,
        listener: role === "listener" ? userId : potentialMatch.userId,
        seeker: role === "seeker" ? userId : potentialMatch.userId,
        messages: [],
        createdAt: Date.now(),
      };

      await kv.set(`buddy:session:${sessionId}`, sessionData);

      // Update both users
      await kv.set(`buddy:user:${userId}`, {
        userId,
        role,
        status: "connected",
        sessionId,
        timestamp: Date.now(),
      });

      await kv.set(`buddy:user:${potentialMatch.userId}`, {
        userId: potentialMatch.userId,
        role: potentialMatch.role,
        status: "connected",
        sessionId,
        timestamp: Date.now(),
      });

      console.log(`Match found! Session ${sessionId} created between ${userId} and ${potentialMatch.userId}`);

      return c.json({ sessionId, matched: true });
    }

    // No match found, stay in waiting
    console.log(`No match found for ${userId}, waiting...`);
    return c.json({ matched: false });
  } catch (error) {
    console.error("Error in buddy/join:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get messages for a session
app.get("/make-server-927350a6/buddy/messages", async (c) => {
  try {
    const sessionId = c.req.query("sessionId");
    const userId = c.req.query("userId");

    if (!sessionId || !userId) {
      return c.json({ error: "Missing sessionId or userId" }, 400);
    }

    // Check if user is still waiting (not matched yet)
    const userData = await kv.get(`buddy:user:${userId}`);
    if (userData && userData.status === "waiting") {
      // Try to find a match again
      const oppositeRole = userData.role === "listener" ? "seeker" : "listener";
      const waitingUsers = await kv.getByPrefix(`buddy:user:`);
      const potentialMatch = waitingUsers.find(
        (u) => u.role === oppositeRole && u.status === "waiting" && u.userId !== userId
      );

      if (potentialMatch) {
        // Create session
        const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const sessionData = {
          sessionId: newSessionId,
          listener: userData.role === "listener" ? userId : potentialMatch.userId,
          seeker: userData.role === "seeker" ? userId : potentialMatch.userId,
          messages: [],
          createdAt: Date.now(),
        };

        await kv.set(`buddy:session:${newSessionId}`, sessionData);

        // Update both users
        await kv.set(`buddy:user:${userId}`, {
          ...userData,
          status: "connected",
          sessionId: newSessionId,
        });

        await kv.set(`buddy:user:${potentialMatch.userId}`, {
          userId: potentialMatch.userId,
          role: potentialMatch.role,
          status: "connected",
          sessionId: newSessionId,
          timestamp: Date.now(),
        });

        return c.json({ matched: true, sessionId: newSessionId, messages: [] });
      }

      return c.json({ matched: false, messages: [] });
    }

    const session = await kv.get(`buddy:session:${sessionId}`);

    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }

    // Transform messages to show sender perspective
    const messages = session.messages.map((msg: any) => ({
      ...msg,
      sender: msg.senderId === userId ? "me" : "other",
    }));

    return c.json({ messages });
  } catch (error) {
    console.error("Error in buddy/messages:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Send a message
app.post("/make-server-927350a6/buddy/send", async (c) => {
  try {
    const { sessionId, userId, message } = await c.req.json();

    if (!sessionId || !userId || !message) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const session = await kv.get(`buddy:session:${sessionId}`);

    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }

    const messageWithSender = {
      ...message,
      senderId: userId,
    };

    session.messages.push(messageWithSender);
    await kv.set(`buddy:session:${sessionId}`, session);

    console.log(`Message sent in session ${sessionId} by ${userId}`);

    return c.json({ success: true });
  } catch (error) {
    console.error("Error in buddy/send:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Leave a session
app.post("/make-server-927350a6/buddy/leave", async (c) => {
  try {
    const { sessionId, userId } = await c.req.json();

    if (!sessionId || !userId) {
      return c.json({ error: "Missing sessionId or userId" }, 400);
    }

    // Delete user data
    await kv.del(`buddy:user:${userId}`);

    // Optionally clean up session after some time
    // For now, we'll leave the session data for the other user to see the disconnect
    console.log(`User ${userId} left session ${sessionId}`);

    return c.json({ success: true });
  } catch (error) {
    console.error("Error in buddy/leave:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Send friend request
app.post("/make-server-927350a6/buddy/friend-request", async (c) => {
  try {
    const { sessionId, fromUserId, toUserId } = await c.req.json();

    if (!sessionId || !fromUserId || !toUserId) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    // Store friend request
    await kv.set(`buddy:friend-request:${sessionId}`, {
      sessionId,
      fromUserId,
      toUserId,
      status: "pending",
      timestamp: Date.now(),
    });

    console.log(`Friend request sent from ${fromUserId} to ${toUserId}`);

    return c.json({ success: true });
  } catch (error) {
    console.error("Error in buddy/friend-request:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get friend request status
app.get("/make-server-927350a6/buddy/friend-request-status", async (c) => {
  try {
    const sessionId = c.req.query("sessionId");

    if (!sessionId) {
      return c.json({ error: "Missing sessionId" }, 400);
    }

    const request = await kv.get(`buddy:friend-request:${sessionId}`);

    return c.json({ request: request || null });
  } catch (error) {
    console.error("Error in buddy/friend-request-status:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Accept friend request
app.post("/make-server-927350a6/buddy/accept-friend", async (c) => {
  try {
    const { sessionId, userId } = await c.req.json();

    if (!sessionId || !userId) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const session = await kv.get(`buddy:session:${sessionId}`);
    const request = await kv.get(`buddy:friend-request:${sessionId}`);

    if (!session || !request) {
      return c.json({ error: "Session or request not found" }, 404);
    }

    // Update request status
    await kv.set(`buddy:friend-request:${sessionId}`, {
      ...request,
      status: "accepted",
    });

    // Create saved chat for both users
    const chatId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const preview = session.messages.length > 0 
      ? session.messages[session.messages.length - 1].text 
      : "New conversation";

    const savedChat = {
      id: chatId,
      sessionId,
      listener: session.listener,
      seeker: session.seeker,
      messages: session.messages,
      lastMessageTime: Date.now(),
      preview,
    };

    // Save chat for both users
    await kv.set(`buddy:saved-chat:${chatId}`, savedChat);
    
    // Add chat reference to user's chat list
    const listenerChats = await kv.get(`buddy:user-chats:${session.listener}`) || { chatIds: [] };
    const seekerChats = await kv.get(`buddy:user-chats:${session.seeker}`) || { chatIds: [] };
    
    if (!listenerChats.chatIds.includes(chatId)) {
      listenerChats.chatIds.push(chatId);
      await kv.set(`buddy:user-chats:${session.listener}`, listenerChats);
    }
    
    if (!seekerChats.chatIds.includes(chatId)) {
      seekerChats.chatIds.push(chatId);
      await kv.set(`buddy:user-chats:${session.seeker}`, seekerChats);
    }

    console.log(`Friend request accepted for session ${sessionId}, chat saved as ${chatId}`);

    return c.json({ success: true, chatId });
  } catch (error) {
    console.error("Error in buddy/accept-friend:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Decline friend request
app.post("/make-server-927350a6/buddy/decline-friend", async (c) => {
  try {
    const { sessionId } = await c.req.json();

    if (!sessionId) {
      return c.json({ error: "Missing sessionId" }, 400);
    }

    await kv.del(`buddy:friend-request:${sessionId}`);

    console.log(`Friend request declined for session ${sessionId}`);

    return c.json({ success: true });
  } catch (error) {
    console.error("Error in buddy/decline-friend:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get saved chats for a user
app.get("/make-server-927350a6/buddy/saved-chats", async (c) => {
  try {
    const userId = c.req.query("userId");

    if (!userId) {
      return c.json({ error: "Missing userId" }, 400);
    }

    const userChats = await kv.get(`buddy:user-chats:${userId}`);
    
    if (!userChats || !userChats.chatIds || userChats.chatIds.length === 0) {
      return c.json({ chats: [] });
    }

    // Get all saved chats for this user
    const chats = [];
    for (const chatId of userChats.chatIds) {
      const chat = await kv.get(`buddy:saved-chat:${chatId}`);
      if (chat) {
        // Transform messages to show from user's perspective
        const transformedMessages = chat.messages.map((msg: any) => ({
          ...msg,
          sender: msg.senderId === userId ? "me" : "other",
        }));
        
        chats.push({
          id: chat.id,
          friendId: chat.listener === userId ? chat.seeker : chat.listener,
          messages: transformedMessages,
          lastMessageTime: chat.lastMessageTime,
          preview: chat.preview,
        });
      }
    }

    return c.json({ chats });
  } catch (error) {
    console.error("Error in buddy/saved-chats:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Send message in saved chat
app.post("/make-server-927350a6/buddy/send-saved", async (c) => {
  try {
    const { chatId, userId, message } = await c.req.json();

    if (!chatId || !userId || !message) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const chat = await kv.get(`buddy:saved-chat:${chatId}`);

    if (!chat) {
      return c.json({ error: "Chat not found" }, 404);
    }

    const messageWithSender = {
      ...message,
      senderId: userId,
    };

    chat.messages.push(messageWithSender);
    chat.lastMessageTime = Date.now();
    chat.preview = message.text;
    
    await kv.set(`buddy:saved-chat:${chatId}`, chat);

    console.log(`Message sent in saved chat ${chatId} by ${userId}`);

    return c.json({ success: true });
  } catch (error) {
    console.error("Error in buddy/send-saved:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

Deno.serve(app.fetch);