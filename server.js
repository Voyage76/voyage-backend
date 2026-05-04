// server.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import rateLimit from "express-rate-limit";

const app = express();
const PORT = process.env.PORT || 3000;

// 🔐 ENV
const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY;
const GROQ_KEY = process.env.GROQ_API_KEY;

// 🧱 MIDDLEWARE
app.use(cors());
app.use(express.json());

// 🚫 RATE LIMIT (anti abuso)
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // max 30 richieste / min per IP
});
app.use(limiter);

// 🟢 HEALTH CHECK (UptimeRobot)
app.get("/", (req, res) => {
  res.send("Voyage backend attivo 🚀");
});

// 🌍 EXPLORE (Google Maps via backend)
app.get("/explore", async (req, res) => {
  const city = req.query.city;

  if (!city) {
    return res.status(400).json({ error: "Missing city" });
  }

  try {
    // 🔹 1. Geocoding
    const geoRes = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        city
      )}&key=${GOOGLE_KEY}`
    );
    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      return res.status(404).json({ error: "City not found" });
    }

    const location = geoData.results[0].geometry.location;

    // 🔹 2. Places
    const placesRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
        "tourist attractions in " + city
      )}&location=${location.lat},${location.lng}&radius=8000&key=${GOOGLE_KEY}`
    );

    const placesData = await placesRes.json();

    res.json({
      lat: location.lat,
      lon: location.lng,
      places: placesData.results || [],
    });
  } catch (e) {
    console.error("Explore error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

// 🤖 CHAT (Groq via backend)
app.post("/chat", async (req, res) => {
  const prompt = req.body.prompt;

  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt" });
  }

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama3-70b-8192",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      }
    );

    const data = await response.json();

    res.json(data);
  } catch (e) {
    console.error("Groq error:", e);
    res.status(500).json({ error: "Groq request failed" });
  }
});

// 🚀 START SERVER
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
