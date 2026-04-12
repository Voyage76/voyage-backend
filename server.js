import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

/**
 * TEST BASE
 */
app.get("/", (req, res) => {
  res.send("Backend attivo");
});

/**
 * CHAT ENDPOINT
 */
app.post("/chat", async (req, res) => {
  try {
    const prompt = req.body?.prompt;

    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    console.log("Prompt ricevuto:", prompt);

    let response;

    try {
      response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }]
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json"
          },
          timeout: 8000
        }
      );
    } catch (apiError) {
      console.error("Errore Groq:", apiError.message);

      return res.status(500).json({
        error: "Errore API Groq",
        details: apiError.message
      });
    }

    return res.json(response.data);

  } catch (error) {
    console.error("Errore server:", error.message);

    return res.status(500).json({
      error: "Errore server",
      details: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
