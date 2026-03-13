import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Initialize Gemini
const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "VerseVibe backend is running!" });
});

app.post("/api/analyze", async (req, res) => {
  if (!genAI) {
    return res.status(503).json({ error: "GEMINI_API_KEY is missing. Add it to .env" });
  }

  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: "No content provided" });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
    You are 'VerseVibe', a supportive and insightful AI companion for poets and creative writers.
    Analyze this text: "${content}"

    IMPORTANT: Respond ONLY with a valid JSON object. No markdown, no code fences, no extra text.
    {
        "sentiment": "One word (choose from: Melancholic, Joyful, Dark, Energetic, Peaceful, Thoughtful, Romantic, Mysterious)",
        "suggestions": "Two warm, encouraging sentences of constructive feedback",
        "pacing": "One sentence about the rhythm and flow of the piece",
        "wordChoice": "One sentence about the vocabulary and imagery used",
        "tone": "One sentence describing the overall emotional tone"
    }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    res.json({ analysis: text });
  } catch (e) {
    console.error("Analysis error:", e);
    res.status(500).json({ error: e.message || "Analysis failed. Please try again." });
  }
});

app.listen(8000, () => console.log("AI server running on 8000"));
