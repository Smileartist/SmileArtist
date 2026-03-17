import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { endpoint, userId } = req.body;

  if (!endpoint && !userId) {
    return res.status(400).json({ error: "Missing endpoint or userId" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  // Bypassing RLS with Service Role as background cleaning doesn't need authenticated spoofing
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Supabase configuration missing on server" });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    let query = supabase.from('push_subscriptions').delete();
    
    if (endpoint) {
      query = query.eq('endpoint', endpoint);
    } else if (userId) {
      query = query.eq('user_id', userId);
    }

    const { error } = await query;
    if (error) throw error;

    return res.status(200).json({ success: true, message: "Unsubscribed successfully" });
  } catch (e) {
    console.error("Unsubscribe Error:", e);
    return res.status(500).json({ error: e.message || "Failed to unsubscribe" });
  }
}
