import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import OpenAI from "openai";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

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

app.listen(8000, () => console.log("AI server running on 8000"));
