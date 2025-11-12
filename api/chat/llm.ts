import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Import the actual handler from server directory
  const { handler: llmHandler } = await import('../../server/chat/LLMChat');
  
  // Convert Vercel request to standard Request
  const url = `https://${req.headers.host}${req.url}`;
  
  // Read body if it's a POST request
  let body = undefined;
  if (req.method === 'POST' && req.body) {
    body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  }
  
  const request = new Request(url, {
    method: req.method,
    headers: req.headers as any,
    body,
  });
  
  try {
    const response = await llmHandler(request);
    const data = await response.json();
    
    res.status(response.status).json(data);
  } catch (error: any) {
    console.error('[Vercel API] LLM Error:', error);
    res.status(500).json({ success: false, error: error.message || 'Internal server error' });
  }
}
