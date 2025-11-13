/**
 * Vercel Serverless Function wrapper for LLM Chat API
 * Delegates to the actual handler in server/chat/LLMChat.ts
 */

import { handler as llmHandler } from '../../server/chat/LLMChat';

export default async function handler(req: any, res: any) {
  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    // Construct a Web API Request object
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
    const url = `${protocol}://${host}${req.url}`;
    
    // Vercel automatically parses JSON body into req.body
    const bodyText = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    
    const request = new Request(url, {
      method: req.method,
      headers: {
        'content-type': 'application/json',
        ...req.headers,
      },
      body: bodyText,
      duplex: 'half',
    } as any);

    const response = await llmHandler(request);
    
    // Convert Web API Response to Vercel response
    const body = await response.text();
    const contentType = response.headers.get('content-type') || 'application/json';
    
    res.status(response.status)
      .setHeader('content-type', contentType)
      .send(body);
  } catch (err: any) {
    console.error('[api/chat/llm] Error:', err);
    res.status(500).json({ success: false, error: err?.message || 'Internal Server Error' });
  }
}
