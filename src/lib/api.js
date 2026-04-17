const anthropicApiKey = import.meta.env.VITE_ANTHROPIC_API_KEY

export const hasAnthropicApiKey = () => Boolean(anthropicApiKey)
