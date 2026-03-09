import { NextResponse } from 'next/server'

const POLLINATIONS_URL = 'https://gen.pollinations.ai/v1/chat/completions'

const SYSTEM_PROMPT = `You are LixSketch AI, a professional diagram and flowchart generator for a collaborative whiteboard application. Your sole purpose is to convert natural language descriptions or Mermaid diagram syntax into structured JSON that the whiteboard engine renders as interactive shapes.

You MUST respond with ONLY a valid JSON object — no markdown fences, no explanations, no commentary before or after the JSON.

Required JSON schema:
{
  "title": "string — concise diagram title (2-5 words)",
  "nodes": [
    {
      "id": "string — unique identifier (e.g. \"n1\", \"n2\")",
      "type": "rectangle | circle | diamond",
      "label": "string — node display text (1-4 words max)",
      "x": "number — horizontal position in pixels",
      "y": "number — vertical position in pixels",
      "width": "number — node width (default 160)",
      "height": "number — node height (default 60)"
    }
  ],
  "edges": [
    {
      "from": "string — source node id",
      "to": "string — target node id",
      "label": "string (optional) — edge label (1-3 words)",
      "directed": "boolean (optional) — true for arrows (default), false for plain lines"
    }
  ]
}

Shape type guidelines:
- "rectangle": processes, actions, services, pages, components, entities, data stores, API endpoints
- "circle": start/end terminals, events, triggers, status indicators
- "diamond": decisions, conditions, branching logic, yes/no gates, validations

Edge direction guidelines:
- Use "directed": true (default) for flow direction — arrows show cause/effect, sequence, data flow
- Use "directed": false for associations, relationships, or bidirectional connections

Layout rules:
- Arrange nodes in a logical top-to-bottom or left-to-right flow
- Use ~200px horizontal spacing and ~120px vertical spacing between nodes
- Stagger branching paths horizontally (e.g. "Yes" path at x+200, "No" path at x-200)
- Keep the layout balanced and readable — avoid overlapping nodes
- For flowcharts: start at top, flow downward
- For architecture diagrams: group related components horizontally
- For entity relationships: arrange in a grid pattern

Content rules:
- Keep labels concise: 1-4 words maximum per node
- Title should summarize the diagram purpose in 2-5 words
- Edge labels are optional — only add when the relationship needs clarification
- Generate between 3 and 15 nodes depending on complexity
- Every node must have at least one edge connecting it (no orphan nodes)
- Use meaningful, descriptive labels — not generic placeholders

Mermaid conversion:
- When given Mermaid syntax, parse the graph structure faithfully
- Map Mermaid node shapes: [text] → rectangle, (text) → circle, {text} → diamond, ((text)) → circle
- Preserve all labels and edge text from the Mermaid source
- Compute logical x,y positions based on the Mermaid flow direction (TD = top-down, LR = left-right)`

const USER_PROMPT_TEXT = (prompt) =>
  `Generate a professional diagram for the following description. Analyze the subject matter and choose appropriate node types, layout direction, and level of detail.

Description: ${prompt}`

const USER_PROMPT_MERMAID = (prompt) =>
  `Convert the following Mermaid diagram syntax into the JSON format. Preserve all nodes, edges, labels, and logical structure exactly as defined in the Mermaid source.

Mermaid syntax:
${prompt}`

const USER_PROMPT_EDIT = (prompt, previousDiagram) =>
  `You previously generated this diagram:
${JSON.stringify(previousDiagram, null, 2)}

The user wants to modify it. Apply the following edit while keeping the existing structure as much as possible. Return the complete updated diagram JSON (not just the changes).

Edit request: ${prompt}`

export async function POST(request) {
  try {
    const { prompt, mode, history, previousDiagram } = await request.json()

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const apiKey = process.env.POLLINATIONS_TEXT_API
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
    }

    // Build the user message based on context
    let userMessage
    if (previousDiagram && previousDiagram.nodes) {
      // Edit mode — modify existing diagram
      userMessage = USER_PROMPT_EDIT(prompt, previousDiagram)
    } else if (mode === 'mermaid') {
      userMessage = USER_PROMPT_MERMAID(prompt)
    } else {
      userMessage = USER_PROMPT_TEXT(prompt)
    }

    console.log('[AI Generate] Request:', {
      mode,
      promptLength: prompt.length,
      isEdit: !!previousDiagram,
      historyLength: history?.length || 0,
    })

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 45000)

    // Build messages array with conversation history for context
    const messages = [{ role: 'system', content: SYSTEM_PROMPT }]

    // Include relevant history for multi-turn edits
    if (history && Array.isArray(history) && history.length > 0) {
      // Only include the last few turns to keep context manageable
      const recentHistory = history.slice(-4)
      recentHistory.forEach(msg => {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({ role: msg.role, content: msg.content })
        }
      })
    }

    messages.push({ role: 'user', content: userMessage })

    const response = await fetch(POLLINATIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gemini-fast',
        messages,
        temperature: 0.2,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[AI Generate] API error:', response.status, errorText)
      return NextResponse.json(
        { error: `AI service returned ${response.status}. Please try again.` },
        { status: 502 }
      )
    }

    const data = await response.json()
    console.log('[AI Generate] Raw API response:', JSON.stringify(data, null, 2))

    const content = data.choices?.[0]?.message?.content

    if (!content) {
      console.error('[AI Generate] No content in response:', data)
      return NextResponse.json({ error: 'Empty AI response' }, { status: 500 })
    }

    console.log('[AI Generate] Model output:', content)

    // Parse the JSON from the response (strip markdown fences if present)
    let diagram
    try {
      const cleaned = content
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim()
      diagram = JSON.parse(cleaned)
    } catch (parseErr) {
      console.error('[AI Generate] JSON parse failed. Raw content:', content)
      return NextResponse.json({ error: 'AI returned invalid format. Try again.' }, { status: 500 })
    }

    // Validate structure
    if (!diagram.nodes || !Array.isArray(diagram.nodes) || diagram.nodes.length === 0) {
      console.error('[AI Generate] Invalid diagram structure:', diagram)
      return NextResponse.json({ error: 'AI returned empty diagram. Try rephrasing.' }, { status: 500 })
    }

    console.log('[AI Generate] Success:', {
      title: diagram.title,
      nodes: diagram.nodes.length,
      edges: diagram.edges?.length || 0,
    })

    return NextResponse.json({ diagram })
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('[AI Generate] Request timed out')
      return NextResponse.json({ error: 'AI request timed out. Try a simpler prompt.' }, { status: 504 })
    }
    console.error('[AI Generate] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
