const PROVIDERS = [
  {
    name: "groq",
    key: "GROQ_API_KEY",
    baseURL: "https://api.groq.com/openai/v1",
    modelEnv: "GROQ_MODEL",
    defaultModel: "llama-3.3-70b-versatile"
  },
  {
    name: "cerebras",
    key: "CEREBRAS_API_KEY",
    baseURL: "https://api.cerebras.ai/v1",
    modelEnv: "CEREBRAS_MODEL",
    defaultModel: "gpt-oss-120b"
  },
  {
    name: "gemini",
    key: "GEMINI_API_KEY",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    modelEnv: "GEMINI_MODEL",
    defaultModel: "gemini-2.5-flash"
  },
  {
    name: "openrouter",
    key: "OPENROUTER_API_KEY",
    baseURL: "https://openrouter.ai/api/v1",
    modelEnv: "OPENROUTER_MODEL",
    defaultModel: "openai/gpt-oss-20b:free"
  },
  {
    name: "huggingface",
    key: "HF_TOKEN",
    baseURL: "https://router.huggingface.co/v1",
    modelEnv: "HF_MODEL",
    defaultModel: "openai/gpt-oss-120b"
  }
];

function cleanError(value) {
  if (!value) return "Unknown provider error";
  if (typeof value === "string") return value.slice(0, 300);
  return JSON.stringify(value).slice(0, 300);
}

async function callProvider(provider, messages) {
  const apiKey = process.env[provider.key];
  if (!apiKey) return { skipped: true };

  const model = process.env[provider.modelEnv] || provider.defaultModel;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`
  };

  if (provider.name === "openrouter") {
    headers["HTTP-Referer"] = process.env.APP_URL || "https://pack-emploi-maroc.vercel.app";
    headers["X-Title"] = "AI Maroc";
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 18000);

  try {
    const response = await fetch(`${provider.baseURL}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.4,
        max_tokens: 1200
      }),
      signal: controller.signal
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!response.ok) {
      throw new Error(`${response.status}: ${cleanError(data?.error || data?.message || data?.raw)}`);
    }

    const answer = data?.choices?.[0]?.message?.content;
    if (!answer) throw new Error("Provider returned no answer");

    return { answer, provider: provider.name, model };
  } finally {
    clearTimeout(timeout);
  }
}

// Last-resort legacy public endpoint. It is intentionally opt-in because
// anonymous public inference has strict/unstable limits and should not be
// treated as the production provider. Set ENABLE_PUBLIC_FALLBACK=true only
// when a temporary keyless demo is needed.
async function callPublicFallback(messages) {
  if (process.env.ENABLE_PUBLIC_FALLBACK === "false") return { skipped: true };

  const userText = messages.filter(m => m.role === "user").map(m => m.content).join("\n");
  const systemText = messages.filter(m => m.role === "system").map(m => m.content).join("\n");
  const prompt = `${systemText}\n\nUtilisateur:\n${userText}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const url = "https://text.pollinations.ai/" + encodeURIComponent(prompt);
    const response = await fetch(url, { signal: controller.signal });
    const text = await response.text();
    if (!response.ok || !text.trim()) {
      throw new Error(`${response.status}: ${cleanError(text)}`);
    }
    return { answer: text.trim(), provider: "public-demo", model: "pollinations-legacy" };
  } finally {
    clearTimeout(timeout);
  }
}

async function chatWithFreeFallback(messages) {
  const errors = [];

  for (const provider of PROVIDERS) {
    try {
      const result = await callProvider(provider, messages);
      if (result.skipped) continue;
      return result;
    } catch (error) {
      errors.push(`${provider.name}: ${error.message}`);
    }
  }

  try {
    const result = await callPublicFallback(messages);
    if (!result.skipped) return result;
  } catch (error) {
    errors.push(`public-demo: ${error.message}`);
  }

  const error = new Error("No configured AI provider is available.");
  error.details = errors;
  throw error;
}

module.exports = { chatWithFreeFallback };
