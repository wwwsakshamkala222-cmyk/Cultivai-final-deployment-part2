export const config = {
  runtime: 'edge', // optional; you can omit if unfamiliar
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Only POST allowed' }),
      { status: 405 }
    );
  }

  try {
    const { image } = await req.json(); // Blob base64 from frontend

    const response = await fetch(
      'https://huggingface.co/spaces/inkiponki/plant-disease-classifier/api/predict/',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: [image] }), // send image as base64
      }
    );

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Proxy to HF failed:', err);
    return new Response(
      JSON.stringify({ error: 'Prediction failed', details: err.message }),
      { status: 500 }
    );
  }
}