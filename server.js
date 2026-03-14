import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import OpenAI from "openai";
import dotenv from "dotenv";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

// Load environment variables from .env file
dotenv.config();

// Initialize Supabase (Service Role Key recommended for backend, but we'll use Anon for now or assume Service Role is in ENV)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; // Ideally use SERVICE_ROLE_KEY for server-side
const supabase = createClient(supabaseUrl, supabaseKey);

// Configure web-push
if (process.env.VITE_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:support@smileartist.com",
    process.env.VITE_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn("VAPID keys are missing. Push notifications will not work.");
}

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Initialize OpenAI
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "VerseVibe backend is running!" });
});

app.post("/api/analyze", async (req, res) => {
  if (!openai) {
    return res.status(503).json({ error: "OPENAI_API_KEY is missing. Add it to .env" });
  }

  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: "No content provided" });
    }

    const prompt = `
    You are 'VerseVibe', a supportive and insightful AI companion for poets and creative writers.
    Analyze this text: "${content}"

    IMPORTANT: Respond ONLY with a valid JSON object.
    {
        "sentiment": "One word (choose from: Melancholic, Joyful, Dark, Energetic, Peaceful, Thoughtful, Romantic, Mysterious)",
        "suggestions": "Two warm, encouraging sentences of constructive feedback",
        "pacing": "One sentence about the rhythm and flow of the piece",
        "wordChoice": "One sentence about the vocabulary and imagery used",
        "tone": "One sentence describing the overall emotional tone"
    }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful assistant that responds in JSON format." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const text = response.choices[0].message.content;

    res.json({ analysis: text });
  } catch (e) {
    console.error("Analysis error:", e);
    res.status(500).json({ error: e.message || "Analysis failed. Please try again." });
  }
});

app.post("/api/push-notify", async (req, res) => {
  const { userId, title, body, data } = req.body;

  if (!userId || !title || !body) {
    return res.status(400).json({ error: "Missing required fields: userId, title, body" });
  }

  try {
    // Fetch user's subscriptions
    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("subscription_json")
      .eq("user_id", userId);

    if (error) throw error;

    if (!subscriptions || subscriptions.length === 0) {
      return res.json({ success: true, message: "No subscriptions found for user" });
    }

    const payload = JSON.stringify({ title, body, ...data });

    const sendPromises = subscriptions.map(async (sub) => {
      const pushSubscription = JSON.parse(sub.subscription_json);
      try {
        await webpush.sendNotification(pushSubscription, payload);
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          // Subscription has expired or is no longer valid, remove it
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("user_id", userId)
            .eq("subscription_json", sub.subscription_json);
        } else {
          console.error("Error sending push notification:", err);
        }
      }
    });

    await Promise.all(sendPromises);

    res.json({ success: true, message: `Attempted to send push to ${subscriptions.length} devices.` });
  } catch (e) {
    console.error("Push notify error:", e);
    res.status(500).json({ error: "Failed to send push notifications" });
  }
});

app.listen(8000, () => console.log("AI server running on 8000"));
