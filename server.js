const express = require("express")
const fetch = require("node-fetch")
require("dotenv").config()

const app = express()

app.get("/", (req, res) => {
  res.send("Voyage backend attivo 🚀")
})

app.get("/explore", async (req, res) => {
  try {
    const { city } = req.query

    if (!city || city.length < 2) {
      return res.status(400).json({ error: "Invalid city" })
    }

    const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY

    // 🔹 GEOCODING
    const geoRes = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(city)}&key=${GOOGLE_KEY}`
    )
    const geoData = await geoRes.json()

    const location = geoData.results[0]?.geometry?.location

    if (!location) {
      return res.status(404).json({ error: "City not found" })
    }

    // 🔹 PLACES
    const placesRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=tourist+attractions+in+${encodeURIComponent(city)}&key=${GOOGLE_KEY}`
    )
    const placesData = await placesRes.json()

    res.json({
      lat: location.lat,
      lon: location.lng,
      places: placesData.results
    })

  } catch (e) {
    console.error(e)
    res.status(500).json({ error: "Server error" })
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log("Server running on port " + PORT))
