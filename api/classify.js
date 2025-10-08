// /api/classify.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const formData = new FormData();
    const blob = Buffer.from(req.body); 

    const response = await fetch(
      "https://huggingface.co/spaces/inkiponki/plant-disease-classifier/api/predict/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      }
    );

    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Proxy failed to contact HuggingFace" });
  }
}