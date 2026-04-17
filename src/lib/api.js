const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-20250514'

function buildPrompt(language) {
  const cardLanguage = language === 'jp' ? 'Japanese' : 'English'
  const textLanguage = language === 'jp' ? 'Japanese katakana' : 'English'

  return `This is a ${cardLanguage} Pokemon Trading Card.
Identify the Pokemon shown. The text at the top of the card gives the name in ${textLanguage}, but on alt-art cards it may be hard to read - use both the text AND the artwork to decide.
Return your TOP 3 candidates. If highly confident, make the second and third candidates visually similar Pokemon that could plausibly be confused.
Always translate the final answer to the standard English National Pokedex name (e.g. "Pikachu", not "ピカチュウ").
Return ONLY the JSON object. No markdown, no code fences, no prose.

Use this exact JSON shape:
{
  "candidates": [
    {"name": "Charizard", "confidence": "high", "reasoning": "brief why"},
    {"name": "Charmeleon", "confidence": "medium", "reasoning": "brief why"},
    {"name": "Moltres", "confidence": "low", "reasoning": "brief why"}
  ],
  "setHint": "Paldea Evolved",
  "cardNumber": "25/185",
  "notes": "Holographic ex card with full art"
}`
}

function normalizeResult(parsed) {
  const rawCandidates = Array.isArray(parsed.candidates) ? parsed.candidates : []
  const normalizedCandidates = rawCandidates
    .slice(0, 3)
    .map((candidate) => ({
      name:
        typeof candidate?.name === 'string' ? candidate.name.trim() : '',
      confidence:
        candidate?.confidence === 'high' ||
        candidate?.confidence === 'medium' ||
        candidate?.confidence === 'low'
          ? candidate.confidence
          : 'low',
      reasoning:
        typeof candidate?.reasoning === 'string'
          ? candidate.reasoning.trim()
          : '',
    }))
    .filter((candidate) => candidate.name)

  return {
    candidates: normalizedCandidates,
    setHint: typeof parsed.setHint === 'string' ? parsed.setHint.trim() : '',
    cardNumber:
      typeof parsed.cardNumber === 'string' ? parsed.cardNumber.trim() : '',
    notes: typeof parsed.notes === 'string' ? parsed.notes.trim() : '',
  }
}

export function extractJson(text) {
  const trimmed = text.trim()
  const withoutFences = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  try {
    return JSON.parse(withoutFences)
  } catch {
    // Fall through to first-object extraction.
  }

  const firstBrace = withoutFences.indexOf('{')
  if (firstBrace === -1) {
    throw new Error(
      `Failed to parse model JSON. Raw text: ${withoutFences.slice(0, 200)}`,
    )
  }

  let depth = 0
  for (let index = firstBrace; index < withoutFences.length; index += 1) {
    const char = withoutFences[index]
    if (char === '{') {
      depth += 1
    } else if (char === '}') {
      depth -= 1
      if (depth === 0) {
        const candidate = withoutFences.slice(firstBrace, index + 1)
        try {
          return JSON.parse(candidate)
        } catch {
          throw new Error(
            `Failed to parse model JSON. Raw text: ${withoutFences.slice(0, 200)}`,
          )
        }
      }
    }
  }

  throw new Error(
    `Failed to parse model JSON. Raw text: ${withoutFences.slice(0, 200)}`,
  )
}

export async function identifyCard(base64Image, mediaType, language) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey || !apiKey.trim()) {
    throw new Error(
      'API key not set. Add VITE_ANTHROPIC_API_KEY to .env and restart the dev server.',
    )
  }

  const response = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: buildPrompt(language),
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(
      `Anthropic request failed (${response.status}): ${errorBody.slice(0, 200)}`,
    )
  }

  const responseBody = await response.json()
  console.log('[identifyCard] raw API response', responseBody)
  const textOutput = Array.isArray(responseBody.content)
    ? responseBody.content
        .filter((block) => block?.type === 'text' && typeof block.text === 'string')
        .map((block) => block.text)
        .join('\n')
    : ''

  const parsed = extractJson(textOutput)
  const normalized = normalizeResult(parsed)
  if (!normalized.candidates.length) {
    throw new Error('Model returned no candidates. Try a clearer photo.')
  }
  return normalized
}
