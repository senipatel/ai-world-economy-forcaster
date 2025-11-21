/**
 * Vercel Serverless Function for IMF API
 * Inline implementation to avoid module resolution issues
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Dynamic import to load the handler at runtime
    const { default: imf3Adapter } = await import('../server/api/imf3.js');
    return await imf3Adapter(req, res);
  } catch (error: any) {
    console.error('[api/imf3] Failed to load handler:', error);
    res.status(500).json({ 
      error: 'Failed to load IMF API handler',
      message: error?.message || 'Internal server error',
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    });
  }
}
