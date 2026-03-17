import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, title, body, icon, url, type } = req.body;

  if (!userId || !title || !body) {
    return res.status(400).json({ error: "Missing required fields: userId, title, body" });
  }

  // 1. Initialize VAPID
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    return res.status(500).json({ error: "VAPID Keys not configured on server" });
  }

  webpush.setVapidDetails(
    'mailto:contactapp@smileartist.org',
    publicKey,
    privateKey
  );

  // 2. Initialize Supabase Admin
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 3. Check User Notification Preferences
    const { data: profile } = await supabase
      .from('profiles')
      .select('notification_preferences')
      .eq('id', userId)
      .maybeSingle();

    const prefs = profile?.notification_preferences || {};
    
    // If user has explicitly toggled off this notification type, early return
    if (type && prefs[type] === false) {
      return res.status(200).json({ success: true, message: `Notification type '${type}' is disabled by user` });
    }

    // 4. Fetch Subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (subError) throw subError;

    if (!subscriptions || subscriptions.length === 0) {
      return res.status(200).json({ success: true, message: "No active subscriptions found for this user" });
    }

    // 5. Build Payload
    const payload = JSON.stringify({
      title,
      body,
      icon: icon || "/icons/notification-icon-192.png",
      badge: "/icons/badge-72.png",
      url: url || "/",
      type: type || "general"
    });

    const sendPromises = subscriptions.map(async (sub) => {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: sub.keys
      };

      try {
        await webpush.sendNotification(pushConfig, payload);
      } catch (err) {
        console.error(`Push failed for endpoint ${sub.endpoint}`, err.statusCode);
        
        // 410 Gone or 404 Not Found means subscription is expired/invalid
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`Deleting expired subscription: ${sub.endpoint}`);
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', sub.endpoint);
        }
      }
    });

    await Promise.all(sendPromises);

    return res.status(200).json({ success: true, message: `Sent ${subscriptions.length} push attempts` });
  } catch (e) {
    console.error("Send Push Error:", e);
    return res.status(500).json({ error: e.message || "Failed to send push" });
  }
}
