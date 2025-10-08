// /api/predict.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  // ⛔ Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Expecting { imageBase64: "data:image/..." } from the frontend
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "No image provided" });
    }

    // ✅  Hugging Face Space API endpoint
    const hfRes = await fetch(
      "https://inkiponki-plant-disease-classifier.hf.space/api/predict", // correct endpoint
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // remove this line or wrap token correctly if you actually created one:
          // "Authorization": `Bearer ${process.env.HF_API_TOKEN}`,
        },
        // Gradio’s /api/predict expects { data: [<input>] }
        body: JSON.stringify({ data: [imageBase64] })
      }
    );

    // Handle network errors
    if (!hfRes.ok) {
      const text = await hfRes.text();
      throw new Error(`Hugging Face API error: ${hfRes.status} ${text}`);
    }

    const result = await hfRes.json();
    res.status(200).json(result);
  } catch (err) {
    console.error("❌ Serverless error:", err);
    res.status(500).json({ error: "Prediction failed", details: err.message });
  }
}
