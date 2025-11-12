import type { VercelRequest, VercelResponse } from '@vercel/node';

interface ChatContext {
  country: string;
  indicator: string;
  timeRange: string;
  data: Array<{ year: string; value: number }>;
}

interface ChatRequest {
  message: string;
  context: ChatContext | null;
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

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const tryModels = [
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro',
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

  for (const model of tryModels) {
    const modelPath = model.startsWith('models/') ? model : `models/${model}`;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${apiKey}`;
    
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      if (!res.ok) {
        const text = await res.text();
        console.error(`[LLM] Model ${model} failed:`, res.status, text.substring(0, 200));
        
        // Stop for auth errors and quota exceeded
        if (res.status === 401 || res.status === 403 || res.status === 429) {
          throw new Error(res.status === 429 ? 'API quota exceeded' : 'Authentication failed');
        }
        continue;
      }
      
      const json: any = await res.json();
      const candidate = json?.candidates?.[0];
      const parts = candidate?.content?.parts || [];
      const output = parts.map((p: any) => p?.text).filter(Boolean).join('\n').trim();
      
      if (output) {
        return output;
      }
    } catch (e: any) {
      console.error(`[LLM] Model ${model} error:`, e.message);
      if (e.message.includes('quota') || e.message.includes('Authentication')) {
        throw e;
      }
    }
  }
  
  throw new Error('All Gemini models failed');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ success: false, error: 'Method not allowed' });
      return;
    }

    const payload = req.body as ChatRequest;
    const { message, context } = payload || {};
    
    if (!message || !message.trim()) {
      res.status(400).json({ success: false, error: 'Message is required' });
      return;
    }

    const apiKey = process.env.LLM_API_KEY || process.env.VITE_LLM_API_KEY || '';
    
    if (!apiKey) {
      res.status(500).json({ success: false, error: 'LLM_API_KEY not configured' });
      return;
    }

    let prompt = 'You are a senior economic analyst. Provide concise, data-aware answers.\n\n';
    if (context) {
      prompt += buildContextPrompt(context) + '\n';
      prompt += 'Considering the above data, answer the question below.\n\n';
    }
    prompt += `User question: ${message}\n\n`;
    prompt += 'Guidelines:\n- Use specific numbers from data when present\n- Explain trends clearly\n- Keep under ~250 words\n- Use short paragraphs or bullet points when listing items\n';

    const output = await callGemini(prompt, apiKey);
    
    res.status(200).json({ success: true, response: output });
    
  } catch (error: any) {
    console.error('[LLM API] Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error'
    });
  }
}
