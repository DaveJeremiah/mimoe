const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const { text, lang, voice } = await req.json() as {
      text: string;
      lang: string;
      voice: string;
    };

    if (!text || !lang || !voice) {
      return new Response("Missing text, lang, or voice", { status: 400, headers: CORS });
    }

    const azureKey    = Deno.env.get("AZURE_TTS_KEY");
    const azureRegion = Deno.env.get("AZURE_TTS_REGION");

    if (!azureKey || !azureRegion) {
      return new Response("Azure credentials not configured", { status: 500, headers: CORS });
    }

    const safe = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");

    const ssml = `<speak version='1.0' xml:lang='${lang}'><voice name='${voice}'>${safe}</voice></speak>`;

    const azureRes = await fetch(
      `https://${azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": azureKey,
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        },
        body: ssml,
      }
    );

    if (!azureRes.ok) {
      const errText = await azureRes.text();
      return new Response(`Azure error ${azureRes.status}: ${errText}`, {
        status: azureRes.status,
        headers: CORS,
      });
    }

    const audio = await azureRes.arrayBuffer();
    return new Response(audio, {
      headers: { ...CORS, "Content-Type": "audio/mpeg" },
    });
  } catch (err) {
    return new Response(String(err), { status: 500, headers: CORS });
  }
});
