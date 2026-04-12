const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend attivo");
});

app.post("/chat", async (req, res) => {
  try {
    const prompt = req.body?.prompt;

    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

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
      console.error("Groq error:", apiError.message);
      return res.status(500).json({ error: "Errore Groq" });
    }

    res.json(response.data);

  } catch (error) {
    console.error("Server error:", error.message);
    res.status(500).json({ error: "Errore server" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
