/**
 * LLM Chat Handler for Economic Analysis
 * Uses Google Gemini API to provide intelligent responses about economic data
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
}

interface ChatResponse {
  response: string;
  success: boolean;
  error?: string;
}

/**
 * Get the LLM API key from environment variables
 */
function getApiKey(): string {
  const key = process.env.LLM_API_KEY || process.env.VITE_LLM_API_KEY || '';
  console.log('[LLMChat] API Key available:', key ? `Yes (${key.substring(0, 10)}...)` : 'No');
  return key;
}

/**
 * Build the context prompt from graph data
 */
function buildContextPrompt(context: ChatContext): string {
  const { country, indicator, timeRange, data } = context;
  
  // Calculate statistics
  const values = data.map(d => d.value);
  const latestValue = values[values.length - 1];
  const earliestValue = values[0];
  const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const trend = latestValue > earliestValue ? 'increasing' : 'decreasing';
  const changePercent = ((latestValue - earliestValue) / earliestValue * 100).toFixed(2);
  
  // Format data points for the prompt
  const dataPoints = data.slice(-10).map(d => `${d.year}: ${d.value.toFixed(2)}`).join(', ');
  
  return `
Context Information:
- Country: ${country}
- Economic Indicator: ${indicator}
- Time Range: ${timeRange}
- Data Points: ${data.length} observations
- Latest Value (${data[data.length - 1].year}): ${latestValue.toFixed(2)}
- Trend: ${trend} (${changePercent}% change from ${data[0].year} to ${data[data.length - 1].year})
- Average: ${avgValue.toFixed(2)}
- Maximum: ${maxValue.toFixed(2)}
- Minimum: ${minValue.toFixed(2)}
- Recent Data: ${dataPoints}

Full Dataset:
${data.map(d => `${d.year}: ${d.value}`).join('\n')}
`;
}

/**
 * Call Google Gemini API for chat completion
 */
async function callGeminiAPI(prompt: string, apiKey: string): Promise<string> {
  // Use v1beta for gemini-1.5-flash model
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  
  console.log('[LLMChat] Calling Gemini API with model: gemini-1.5-flash (v1beta)');
  
  const requestBody = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    }
  };

  console.log('[LLMChat] Request payload prepared');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[LLMChat] Gemini API error:', response.status, errorText.substring(0, 500));
    throw new Error(`Gemini API error: ${response.status} - ${errorText.substring(0, 200)}`);
  }

  const data: any = await response.json();
  console.log('[LLMChat] Gemini API response received');
  
  if (!data.candidates || data.candidates.length === 0) {
    throw new Error('No response generated from Gemini API');
  }

  return data.candidates[0].content.parts[0].text;
}

/**
 * Main handler for LLM chat requests
 */
export async function handler(req: Request): Promise<Response> {
  console.log('[LLMChat] Handler called, method:', req.method);
  
  // Only accept POST requests
  if (req.method !== 'POST') {
    console.log('[LLMChat] Rejected: Method not allowed');
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Method not allowed' 
    }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Parse request body
    console.log('[LLMChat] Parsing request body...');
    let body: ChatRequest;
    
    try {
      body = await req.json() as ChatRequest;
      console.log('[LLMChat] Request parsed successfully');
    } catch (parseError: any) {
      console.error('[LLMChat] Failed to parse JSON:', parseError.message);
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid JSON in request body'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('[LLMChat] Message length:', body?.message?.length || 0);
    const { message, context } = body;

    if (!message || message.trim().length === 0) {
      console.log('[LLMChat] Rejected: Empty message');
      return new Response(JSON.stringify({
        success: false,
        error: 'Message is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get API key
    const apiKey = getApiKey();
    if (!apiKey) {
      console.error('[LLMChat] API key not found in environment');
      return new Response(JSON.stringify({
        success: false,
        error: 'LLM API key not configured. Please check your .env file.'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Build the full prompt
    let fullPrompt = `You are an expert economic analyst. Provide clear, insightful, and accurate analysis of economic data and trends.\n\n`;
    
    if (context) {
      fullPrompt += buildContextPrompt(context);
      fullPrompt += `\n\nBased on the above economic data, please answer the following question:\n`;
    }
    
    fullPrompt += `\nUser Question: ${message}\n\n`;
    fullPrompt += `Please provide a concise, professional response that:
1. Directly answers the user's question
2. References specific data points when relevant (use actual numbers from the data)
3. Explains economic trends in simple, clear terms
4. Provides actionable insights when applicable
5. Keeps the response under 300 words
6. Format your response in clear paragraphs
7. Use bullet points or numbered lists when listing multiple items
8. Be conversational yet professional

Important: Focus on the actual data provided and give specific numerical insights.`;

    console.log('[LLMChat] Processing request with context:', context ? 'Yes' : 'No');

    // Call Gemini API
    let aiResponse: string;
    try {
      aiResponse = await callGeminiAPI(fullPrompt, apiKey);
      console.log('[LLMChat] Response generated successfully, length:', aiResponse.length);
    } catch (apiError: any) {
      console.error('[LLMChat] Gemini API call failed:', apiError.message);
      return new Response(JSON.stringify({
        success: false,
        error: `AI service error: ${apiError.message}`
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Return successful response
    return new Response(JSON.stringify({
      success: true,
      response: aiResponse,
      hasContext: !!context
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('[LLMChat] Unexpected error:', error.message);
    console.error('[LLMChat] Stack:', error.stack);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Failed to process chat request',
      details: error.stack
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export default handler;
