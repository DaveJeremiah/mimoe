const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAiKey) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured" }), {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const model = (formData.get("model") as string) || "whisper-1";
    const language = (formData.get("language") as string) || "fr";

    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: "Missing audio file" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const openaiForm = new FormData();
    openaiForm.append("file", file);
    openaiForm.append("model", model);
    openaiForm.append("language", language);

    const openaiRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${openAiKey}` },
      body: openaiForm,
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      console.error("Whisper API error:", openaiRes.status, errText);
      return new Response(JSON.stringify({ error: `Whisper ${openaiRes.status}` }), {
        status: openaiRes.status,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const result = await openaiRes.json() as { text: string };
    return new Response(JSON.stringify({ text: result.text ?? "" }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("whisper-stt:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
