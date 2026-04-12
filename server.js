const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

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

    console.log("Prompt:", prompt);

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "user", content: prompt }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 10000
      }
    );

    console.log("Risposta ricevuta");

    res.json(response.data);

  } catch (error) {
    console.error("ERRORE:", error.response?.data || error.message);

    res.status(500).json({
      error: "Server error",
      details: error.message
    });
  }
});

/**
 * PORTA RAILWAY
 */
const PORT = process.env.PORT;

if (!PORT) {
  console.error("PORT non definita!");
  process.exit(1);
}

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
