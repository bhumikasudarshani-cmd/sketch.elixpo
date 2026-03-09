import { NextResponse } from 'next/server'

const POLLINATIONS_URL = 'https://gen.pollinations.ai/v1/chat/completions'

const SYSTEM_PROMPT = `You are a diagram generator for a whiteboard app. You receive either a text description or Mermaid syntax and output a structured JSON diagram.

Output ONLY valid JSON with this exact schema:
{
  "title": "Short descriptive title",
  "nodes": [
    { "id": "1", "type": "rectangle|circle|diamond", "label": "Node text", "x": 0, "y": 0, "width": 160, "height": 60 }
  ],
  "edges": [
    { "from": "1", "to": "2", "label": "optional edge label" }
  ]
}

Rules:
- Use type "rectangle" for processes, actions, entities, classes
- Use type "circle" for start/end points, decisions with yes/no
- Use type "diamond" for decision/condition nodes
- Position nodes in a logical flow layout. Use x,y coordinates with ~200px horizontal and ~120px vertical spacing
- Default node size: width 160, height 60. Adjust for longer labels
- Keep labels concise (max 4 words)
- Generate 3-15 nodes typically
- For Mermaid input, parse the syntax and convert to this JSON format
- Do NOT include any text outside the JSON object. No markdown, no explanation.`

export async function POST(request) {
  try {
    const { prompt, mode } = await request.json()

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const apiKey = process.env.POLLINATIONS_TEXT_API
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    const userMessage = mode === 'mermaid'
      ? `Convert this Mermaid diagram to the JSON format:\n\n${prompt}`
      : `Generate a diagram for: ${prompt}`

    // Try the primary endpoint first, fallback to alternative
    let response
    let lastError

    const endpoints = [
      POLLINATIONS_URL,
      'https://gen.pollinations.ai/v1/chat/completions',
    ]

    for (const url of endpoints) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 30000)

        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'openai',
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: userMessage },
            ],
            temperature: 0.3,
            jsonMode: true,
            seed: 42,
          }),
          signal: controller.signal,
        })

        clearTimeout(timeout)

        if (response.ok) break
        lastError = `${url} returned ${response.status}`
      } catch (fetchErr) {
        lastError = `${url}: ${fetchErr.message}`
        response = null
        continue
      }
    }

    if (!response || !response.ok) {
      console.error('[AI Generate] All endpoints failed:', lastError)
      return NextResponse.json(
        { error: 'AI service unavailable. Please try again.' },
        { status: 502 }
      )
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      return NextResponse.json({ error: 'Empty AI response' }, { status: 500 })
    }

    // Parse the JSON from the response (strip markdown fences if present)
    let diagram
    try {
      const cleaned = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      diagram = JSON.parse(cleaned)
    } catch (parseErr) {
      console.error('[AI Generate] JSON parse error:', parseErr, 'Content:', content)
      return NextResponse.json({ error: 'AI returned invalid format. Try again.' }, { status: 500 })
    }

    // Validate structure
    if (!diagram.nodes || !Array.isArray(diagram.nodes) || diagram.nodes.length === 0) {
      return NextResponse.json({ error: 'AI returned empty diagram. Try rephrasing.' }, { status: 500 })
    }

    return NextResponse.json({ diagram })
  } catch (err) {
    console.error('[AI Generate] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
