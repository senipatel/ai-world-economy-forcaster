/**
 * LLM Chat Handler for Economic Analysis
 * Uses Google Gemini API to provide responses about economic data
 */

interface ChatContext {
  country: string;
  indicator: string;
  timeRange: string;
  data: Array<{ year: string; value: number }>;
}

interface ChatRequest {
  message: string;
  context: ChatContext | null;
  listModels?: boolean; // optional flag to enumerate available models
}

function getApiKey(): string {
  const key = process.env.LLM_API_KEY || process.env.VITE_LLM_API_KEY || '';
  console.log('[LLMChat] API key present:', key ? `Yes (${key.substring(0, 10)}...)` : 'No');
  return key;
}

function buildContextPrompt(context: ChatContext): string {
  const { country, indicator, timeRange, data } = context;
  if (!data?.length) return `Context: ${country} | ${indicator} | ${timeRange} (no numeric data provided)\n`;

  const values = data.map(d => d.value);
  const latest = values[values.length - 1];
  const earliest = values[0];
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const trend = latest >= earliest ? 'increasing' : 'decreasing';
  const changePct = earliest !== 0 ? (((latest - earliest) / earliest) * 100).toFixed(2) : 'N/A';
  const recentSnippet = data.slice(-10).map(d => `${d.year}: ${d.value}`).join(', ');

  return `Context\n- Country: ${country}\n- Indicator: ${indicator}\n- Range: ${timeRange}\n- Points: ${data.length}\n- Latest (${data[data.length - 1].year}): ${latest}\n- Trend: ${trend} (${changePct}% from ${data[0].year})\n- Avg: ${avg.toFixed(2)} | Max: ${max.toFixed(2)} | Min: ${min.toFixed(2)}\n- Recent: ${recentSnippet}\n\nFull series (year:value)\n${data.map(d => `${d.year}: ${d.value}`).join('\n')}\n`;
}

interface ModelAttemptLog {
  model: string;
  status: number | null;
  ok: boolean;
  errorSnippet?: string;
  empty?: boolean; // indicates empty candidate text
}

async function listAvailableModels(apiKey: string) {
  const url = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
  try {
    const res = await fetch(url);
    const txt = await res.text();
    if (!res.ok) return { ok: false, status: res.status, raw: txt.substring(0, 500) };
    const json = JSON.parse(txt);
    return { ok: true, models: (json.models || []).map((m: any) => m.name) };
  } catch (e: any) {
    return { ok: false, status: 0, raw: e?.message };
  }
}

async function callGemini(prompt: string, apiKey: string): Promise<{ output: string; attempts: ModelAttemptLog[] } > {
  // Updated model names - using v1beta API for latest Gemini models
  const tryModels = [
    'gemini-2.5-flash',          // Gemini 2.5 Flash (latest)
    'gemini-2.0-flash-exp',      // Gemini 2.0 experimental
    'gemini-1.5-flash',          // Stable fast model
    'gemini-1.5-pro',            // Pro model
  ];

  const body = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024,
    },
  };

  const attempts: ModelAttemptLog[] = [];
  for (const model of tryModels) {
    const modelPath = model.startsWith('models/') ? model : `models/${model}`;
    // Use v1beta API for all Gemini models (v1 is deprecated for these models)
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${apiKey}`;
    console.log(`[LLMChat] Trying model: ${modelPath} (v1beta API)`);
    let status: number | null = null;
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      status = res.status;
      if (!res.ok) {
        const text = await res.text();
        console.error('[LLMChat] Gemini error', status, text.substring(0, 300));
        attempts.push({ model: modelPath, status, ok: false, errorSnippet: text.substring(0, 200) });
        
        // Stop trying other models for these errors:
        // 401/403: Authentication/Permission errors
        // 429: Quota exceeded
        // 500+: Server errors
        if (status === 429) {
          const quotaError = new Error('API quota exceeded. Please check your Gemini API billing and usage limits at https://aistudio.google.com/');
          throw Object.assign(quotaError, { attempts, isQuotaError: true });
        }
        if (![400, 404].includes(status)) break; // do not continue on auth/rate/server errors
        continue;
      }
      const json: any = await res.json();
      const candidate = json?.candidates?.[0];
      const parts = candidate?.content?.parts || [];
      const out = parts.map((p: any) => p?.text).filter(Boolean).join('\n').trim();
      if (!out) {
        attempts.push({ model: modelPath, status, ok: false, empty: true, errorSnippet: 'Empty response' });
        continue;
      }
      attempts.push({ model: modelPath, status, ok: true });
      return { output: out, attempts };
    } catch (e: any) {
      attempts.push({ model: modelPath, status, ok: false, errorSnippet: e?.message?.substring(0, 200) });
      break; // network/other fatal
    }
  }
  
  // If all models failed, provide helpful error message
  const errorMsg = 'All Gemini models failed. Try using "gemini-pro" or check available models at https://ai.google.dev/models/gemini';
  console.error('[LLMChat]', errorMsg, 'Attempts:', JSON.stringify(attempts, null, 2));
  throw Object.assign(new Error(errorMsg), { attempts });
}

export async function handler(req: Request): Promise<Response> {
  let apiKey: string | null = null;
  
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Robust parsing: read as text then JSON.parse for better diagnostics
    const raw = await req.text();
    if (!raw?.trim()) {
      return new Response(JSON.stringify({ success: false, error: 'Empty request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    let payload: ChatRequest;
    try {
      payload = JSON.parse(raw);
    } catch (e: any) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid JSON: ' + e?.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

  const { message, context, listModels } = payload || ({} as ChatRequest);
    if (!message || !message.trim()) {
      return new Response(JSON.stringify({ success: false, error: 'Message is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    apiKey = getApiKey();
    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: 'LLM_API_KEY not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (listModels) {
      const models = await listAvailableModels(apiKey);
      return new Response(JSON.stringify({ success: models.ok, models }), { status: models.ok ? 200 : 502, headers: { 'Content-Type': 'application/json' } });
    }

    let prompt = 'You are a senior economic analyst. Provide concise, data-aware answers.\n\n';
    if (context) {
      prompt += buildContextPrompt(context) + '\n';
      prompt += 'Considering the above data, answer the question below.\n\n';
    }
    prompt += `User question: ${message}\n\n`;
    prompt += 'Guidelines:\n- Use specific numbers from data when present\n- Explain trends clearly\n- Keep under ~250 words\n- Use short paragraphs or bullet points when listing items\n';

    const { output, attempts } = await callGemini(prompt, apiKey);
    return new Response(JSON.stringify({ success: true, response: output, attempts }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('[LLMChat] Handler fatal error:', e?.message);
    const attempts = e?.attempts || undefined;
    
    // If all models failed with 404, try to list available models to help debugging
    if (apiKey && attempts && attempts.every((a: any) => a.status === 404)) {
      console.log('[LLMChat] All models returned 404, fetching available models list...');
      try {
        const availableModels = await listAvailableModels(apiKey);
        if (availableModels.ok) {
          console.log('[LLMChat] Available models:', JSON.stringify(availableModels.models, null, 2));
        }
      } catch (listError) {
        console.error('[LLMChat] Failed to list models:', listError);
      }
    }
    
    return new Response(JSON.stringify({ success: false, error: e?.message || 'Internal error', attempts }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export default handler;
