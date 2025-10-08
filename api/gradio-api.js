import express from "express";
import fetch from "node-fetch";
import { client } from "@gradio/client";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

let gradioClient;

(async () => {
  try {
    gradioClient = await client("inkiponki/plant-disease-classifier");
    console.log("✅ Connected to Gradio model");
  } catch (err) {
    console.error("❌ Could not connect to Gradio:", err);
  }
})();

app.post("/predict", async (req, res) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ error: "Missing imageUrl" });

    const response = await fetch(imageUrl);
    const imageBlob = await response.blob();

    const result = await gradioClient.predict("/predict", { image: imageBlob });
    res.json(result.data);
  } catch (err) {
    console.error("Prediction error:", err);
    res.status(500).json({ error: "Prediction failed", details: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 CultivAI API running on port ${PORT}`));