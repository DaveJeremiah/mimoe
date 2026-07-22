const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const { phrase } = await req.json() as { phrase: string };
    if (!phrase) {
      return new Response("Missing phrase", { status: 400, headers: CORS });
    }

    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiKey) {
      return new Response("OpenAI credentials not configured", { status: 500, headers: CORS });
    }

    const prompt = `A modern, flat vector illustration with vibrant colors and clean lines, minimalist and friendly Duolingo-like aesthetic. The subject is: ${phrase}. The illustration should contain strong context clues for this subject. No text in the image.`;

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(`OpenAI error ${response.status}: ${errText}`, {
        status: response.status,
        headers: CORS,
      });
    }

    const data = await response.json();
    const imageUrl = data.data?.[0]?.url;
    
    if (!imageUrl) {
      return new Response("No image returned from OpenAI", { status: 500, headers: CORS });
    }

    return new Response(JSON.stringify({ imageUrl }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(String(err), { status: 500, headers: CORS });
  }
});
