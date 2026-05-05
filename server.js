// server.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import rateLimit from "express-rate-limit";

const app = express();
const PORT = process.env.PORT || 3000;

const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY;
const GROQ_KEY = process.env.GROQ_API_KEY;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
});
app.use(limiter);

app.get("/", (req, res) => {
  res.send("Voyage backend attivo");
});

async function proxyGoogle(res, path, params) {
  try {
    if (!GOOGLE_KEY) {
      return res.status(500).json({
        status: "ERROR",
        error_message: "Missing GOOGLE_MAPS_API_KEY",
      });
    }

    const search = new URLSearchParams({
      ...params,
      key: GOOGLE_KEY,
    });

    const url = `https://maps.googleapis.com${path}?${search.toString()}`;
    const response = await fetch(url);
    const text = await response.text();

    return res.status(response.status).type("application/json").send(text);
  } catch (error) {
    return res.status(500).json({
      status: "ERROR",
      error_message: error.message,
    });
  }
}

// Google Maps proxy
app.get("/maps/autocomplete", async (req, res) => {
  await proxyGoogle(res, "/maps/api/place/autocomplete/json", {
    input: req.query.input || "",
    types: "(cities)",
    language: req.query.language || "en",
  });
});

app.get("/maps/geocode", async (req, res) => {
  await proxyGoogle(res, "/maps/api/geocode/json", {
    address: req.query.address || "",
  });
});

app.get("/maps/place-coords", async (req, res) => {
  await proxyGoogle(res, "/maps/api/place/details/json", {
    place_id: req.query.place_id || "",
    fields: "geometry",
  });
});

app.get("/maps/place-reviews", async (req, res) => {
  await proxyGoogle(res, "/maps/api/place/details/json", {
    place_id: req.query.place_id || "",
    fields: "reviews",
  });
});

app.get("/maps/textsearch", async (req, res) => {
  await proxyGoogle(res, "/maps/api/place/textsearch/json", {
    query: req.query.query || "",
    location: req.query.location || "",
    radius: req.query.radius || "8000",
  });
});

app.get("/maps/find-place", async (req, res) => {
  await proxyGoogle(res, "/maps/api/place/findplacefromtext/json", {
    input: req.query.input || "",
    inputtype: "textquery",
    fields: "place_id",
  });
});

app.get("/maps/place-photo-url", async (req, res) => {
  try {
    if (!GOOGLE_KEY) {
      return res.status(500).json({
        status: "ERROR",
        error_message: "Missing GOOGLE_MAPS_API_KEY",
      });
    }

    const search = new URLSearchParams({
      place_id: req.query.place_id || "",
      fields: "photos",
      key: GOOGLE_KEY,
    });

    const url = `https://maps.googleapis.com/maps/api/place/details/json?${search.toString()}`;
    const response = await fetch(url);
    const json = await response.json();

    const photoReference = json?.result?.photos?.[0]?.photo_reference || null;

    if (!photoReference) {
      return res.json({ photoUrl: null });
    }

    const baseUrl = `https://${req.get("host")}`;

    return res.json({
      photoUrl:
        `${baseUrl}/maps/photo?maxwidth=800&photo_reference=${encodeURIComponent(photoReference)}`,
    });
  } catch (error) {
    return res.status(500).json({
      status: "ERROR",
      error_message: error.message,
    });
  }
});

app.get("/maps/photo", async (req, res) => {
  if (!GOOGLE_KEY) {
    return res.status(500).send("Missing GOOGLE_MAPS_API_KEY");
  }

  const search = new URLSearchParams({
    maxwidth: req.query.maxwidth || "800",
    photoreference: req.query.photo_reference || "",
    key: GOOGLE_KEY,
  });

  const url = `https://maps.googleapis.com/maps/api/place/photo?${search.toString()}`;
  return res.redirect(url);
});

app.get("/maps/directions", async (req, res) => {
  await proxyGoogle(res, "/maps/api/directions/json", {
    origin: req.query.origin || "",
    destination: req.query.destination || "",
    mode: req.query.mode || "walking",
  });
});

// Optional: vecchio endpoint explore, mantenuto per compatibilità
app.get("/explore", async (req, res) => {
  const city = req.query.city;

  if (!city) {
    return res.status(400).json({ error: "Missing city" });
  }

  try {
    if (!GOOGLE_KEY) {
      return res.status(500).json({ error: "Missing GOOGLE_MAPS_API_KEY" });
    }

    const geoUrl =
      "https://maps.googleapis.com/maps/api/geocode/json?" +
      new URLSearchParams({
        address: city,
        key: GOOGLE_KEY,
      }).toString();

    const geoRes = await fetch(geoUrl);
    const geoData = await geoRes.json();

    if (geoData.status !== "OK" || !geoData.results?.length) {
      return res.status(404).json({
        error: "City not found",
        status: geoData.status,
        message: geoData.error_message,
      });
    }

    const location = geoData.results[0].geometry.location;

    const placesUrl =
      "https://maps.googleapis.com/maps/api/place/textsearch/json?" +
      new URLSearchParams({
        query: `tourist attractions in ${city}`,
        location: `${location.lat},${location.lng}`,
        radius: "8000",
        key: GOOGLE_KEY,
      }).toString();

    const placesRes = await fetch(placesUrl);
    const placesData = await placesRes.json();

    return res.json({
      lat: location.lat,
      lon: location.lng,
      places: placesData.results || [],
    });
  } catch (error) {
    console.error("Explore error:", error.message);
    return res.status(500).json({ error: "Server error" });
  }
});

// Groq chat
app.post("/chat", async (req, res) => {
  const prompt = req.body.prompt;
  const selectedLanguage = req.body.language || "Italiano";
  const city = req.body.city || "";

  const languageMap = {
    Italiano: "Italian",
    English: "English",
    Francais: "French",
    Français: "French",
    Deutsch: "German",
    Espanol: "Spanish",
    Español: "Spanish",
  };

  const outputLanguage = languageMap[selectedLanguage] || selectedLanguage || "Italian";

  if (!prompt) {
    return res.status(400).json({ reply: "Missing prompt" });
  }

  if (!GROQ_KEY) {
    return res.status(500).json({ reply: "Missing GROQ_API_KEY" });
  }

  try {
    console.log("LANGUAGE RECEIVED:", selectedLanguage, "->", outputLanguage);

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content:
              `You are VoyageAI, a travel assistant.\n` +
              `The app selected language is: ${selectedLanguage}.\n` +
              `You MUST answer only in ${outputLanguage}.\n` +
              `Never answer in English unless the selected language is English.\n` +
              `If the user asks for JSON, keep the JSON keys unchanged, but translate every user-facing value into ${outputLanguage}.\n` +
              `Descriptions, tips, activity names, explanations, chat replies and itinerary text must all be in ${outputLanguage}.`
          },
          {
            role: "user",
            content:
              `Selected app language: ${selectedLanguage}\n` +
              `Required output language: ${outputLanguage}\n` +
              `City: ${city}\n\n` +
              `IMPORTANT: Reply only in ${outputLanguage}.\n\n` +
              prompt
          }
        ],
        temperature: 0.1,
        max_completion_tokens: 4096,
      }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      console.error("Groq error:", data.error?.message || response.status);
      return res.status(200).json({
        reply: "Errore AI temporaneo. Riprova tra qualche secondo.",
      });
    }

    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return res.status(200).json({
        reply: "Errore: risposta AI non valida.",
      });
    }

    return res.json({ reply: content });
  } catch (error) {
    console.error("Chat error:", error.message);
    return res.status(500).json({
      reply: "Errore server AI.",
    });
  }
});

// AI content reporting
app.post("/report", async (req, res) => {
  const { city, language, reason, content, createdAt } = req.body || {};

  if (!content) {
    return res.status(400).json({ ok: false, error: "Missing content" });
  }

  const report = {
    city: String(city || "").slice(0, 120),
    language: String(language || "").slice(0, 40),
    reason: String(reason || "").slice(0, 500),
    content: String(content || "").slice(0, 4000),
    createdAt: createdAt || Date.now(),
  };

  // In produzione: salva questi report in un DB o mandali a una dashboard/admin email.
  console.log("AI content report received:", {
    city: report.city,
    language: report.language,
    reason: report.reason,
    contentLength: report.content.length,
    createdAt: report.createdAt,
  });

  return res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
