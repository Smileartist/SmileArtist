import { createClient } from "@supabase/supabase-js";

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

  const { subscription, userId, deviceInfo } = req.body;

  if (!subscription || !userId) {
    return res.status(400).json({ error: "Missing subscription or userId" });
  }

  // Initialize Supabase admin client to bypass RLS for secure server-side tracking
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Supabase configuration missing on server" });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Upsert subscription tied to user
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: userId,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        device_info: deviceInfo || {}
      }, { onConflict: 'endpoint' });

    if (error) throw error;

    return res.status(200).json({ success: true, message: "Subscription saved successfully" });
  } catch (e) {
    console.error("Subscribe Error:", e);
    return res.status(500).json({ error: e.message || "Failed to subscribe" });
  }
}
