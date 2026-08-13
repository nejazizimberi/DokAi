// api/chat.js
// Vercel Serverless Function
//
// GROQ_API_KEY ruhet vetëm në Vercel Environment Variables.
// Nuk dërgohet kurrë në browser.

export default async function handler(req, res) {

  // =====================================================
  // CORS
  // =====================================================

  res.setHeader(
    'Access-Control-Allow-Origin',
    '*'
  );

  res.setHeader(
    'Access-Control-Allow-Methods',
    'POST, OPTIONS'
  );

  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type'
  );

  // =====================================================
  // OPTIONS
  // =====================================================

  if (req.method === 'OPTIONS') {

    return res
      .status(200)
      .end();

  }

  // =====================================================
  // ONLY POST
  // =====================================================

  if (req.method !== 'POST') {

    return res
      .status(405)
      .json({
        error: 'Method not allowed'
      });

  }

  // =====================================================
  // BODY
  // =====================================================

  const {
    messages,
    systemPrompt
  } = req.body || {};

  if (
    !Array.isArray(messages) ||
    !systemPrompt
  ) {

    return res
      .status(400)
      .json({
        error:
          'Missing messages or systemPrompt'
      });

  }

  // =====================================================
  // MAX CONTEXT
  // =====================================================

  if (
    messages.length > 20
  ) {

    return res
      .status(429)
      .json({
        error:
          'Too many messages in context'
      });

  }

  // =====================================================
  // GROQ KEY
  // =====================================================

  if (
    !process.env.GROQ_API_KEY
  ) {

    console.error(
      'GROQ_API_KEY is missing'
    );

    return res
      .status(500)
      .json({
        error:
          'AI service is not configured'
      });

  }

  try {

    // ===================================================
    // SANITIZE MESSAGES
    // ===================================================

    const safeMessages =
      messages
        .filter(
          message =>
            message &&
            (
              message.role === 'user' ||
              message.role === 'assistant'
            ) &&
            typeof message.content === 'string'
        )
        .slice(-20)
        .map(
          message => ({
            role:
              message.role,

            content:
              message.content.slice(
                0,
                8000
              )
          })
        );

    // ===================================================
    // GROQ REQUEST
    // ===================================================

    const response =
      await fetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {

          method:
            'POST',

          headers: {

            'Content-Type':
              'application/json',

            'Authorization':
              `Bearer ${process.env.GROQ_API_KEY}`

          },

          body:
            JSON.stringify({

              model:
                'llama-3.3-70b-versatile',

              max_tokens:
                400,

              temperature:
                0.3,

              messages: [

                {
                  role:
                    'system',

                  content:
                    String(
                      systemPrompt
                    ).slice(
                      0,
                      12000
                    )
                },

                ...safeMessages

              ]

            })

        }
      );

    // ===================================================
    // GROQ ERROR
    // ===================================================

    if (!response.ok) {

      const errorData =
        await response
          .json()
          .catch(
            () => ({})
          );

      console.error(
        'Groq API error:',
        errorData
      );

      return res
        .status(502)
        .json({
          error:
            'AI service error'
        });

    }

    // ===================================================
    // RESPONSE
    // ===================================================

    const data =
      await response.json();

    const reply =
      data
        ?.choices?.[0]
        ?.message
        ?.content ||
      'Nuk mora përgjigje nga AI.';

    return res
      .status(200)
      .json({
        reply
      });

  } catch (error) {

    console.error(
      'Handler error:',
      error
    );

    return res
      .status(500)
      .json({
        error:
          'Internal server error'
      });

  }

}