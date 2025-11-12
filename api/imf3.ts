import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Import the actual handler from server directory
  const { onRequest } = await import('../server/api/imf3');
  
  // Convert Vercel request to standard Request
  const url = `https://${req.headers.host}${req.url}`;
  const request = new Request(url, {
    method: req.method,
    headers: req.headers as any,
  });
  
  try {
    const response = await onRequest(request);
    const data = await response.json();
    
    res.status(response.status).json(data);
  } catch (error: any) {
    console.error('[Vercel API] Error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
