import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

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

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "user", content: prompt }
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 10000 // ⬅️ IMPORTANTISSIMO (10 secondi)
      }
    );

    return res.json(response.data);

  } catch (error) {
    console.error("ERROR:", error.message);

    if (error.code === "ECONNABORTED") {
      return res.status(504).json({ error: "Timeout AI" });
    }

    return res.status(500).json({ error: "Server error" });
  }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
