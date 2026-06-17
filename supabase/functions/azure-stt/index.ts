const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const azureKey    = Deno.env.get("AZURE_TTS_KEY");
    const azureRegion = Deno.env.get("AZURE_TTS_REGION");

    if (!azureKey || !azureRegion) {
      return new Response(JSON.stringify({ error: "Azure credentials not configured" }), {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const formData = await req.formData();
    const file     = formData.get("file");
    const language = (formData.get("language") as string) || "fr-FR";

    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: "Missing audio file" }), {
        status: 400,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const audioBytes = await file.arrayBuffer();

    const azureRes = await fetch(
      `https://${azureRegion}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${language}&format=simple&profanity=raw`,
      {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": azureKey,
          "Content-Type": "audio/wav; codecs=audio/pcm; samplerate=16000",
          "Accept": "application/json",
        },
        body: audioBytes,
      }
    );

    if (!azureRes.ok) {
      const errText = await azureRes.text();
      console.error("Azure STT error:", azureRes.status, errText);
      return new Response(JSON.stringify({ error: `Azure STT ${azureRes.status}` }), {
        status: azureRes.status,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const result = await azureRes.json() as { RecognitionStatus: string; DisplayText?: string };
    console.log("Azure STT result:", JSON.stringify(result));

    const text = result.RecognitionStatus === "Success" ? (result.DisplayText ?? "") : "";
    return new Response(JSON.stringify({ text }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("azure-stt:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
