const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const AZURE_TTS_KEY = Deno.env.get('AZURE_TTS_KEY')
    const AZURE_TTS_REGION = Deno.env.get('AZURE_TTS_REGION')

    if (!AZURE_TTS_KEY || !AZURE_TTS_REGION) {
      return new Response(JSON.stringify({ error: 'Azure Speech not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const tokenRes = await fetch(
      `https://${AZURE_TTS_REGION}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': AZURE_TTS_KEY,
          'Content-Length': '0',
        },
      }
    )

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      console.error('Azure token error:', tokenRes.status, err)
      return new Response(JSON.stringify({ error: 'Token mint failed', detail: err }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const token = await tokenRes.text()

    return new Response(JSON.stringify({ token, region: AZURE_TTS_REGION }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
