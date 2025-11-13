/**
 * Vercel Serverless Function wrapper for IMF API
 * Delegates directly to the Express-style adapter exported from server/api/imf3.ts
 */
import imf3Adapter from '../server/api/imf3.ts';

export default imf3Adapter;

// Ensure Node.js runtime on Vercel (not Edge)
export const config = { runtime: 'nodejs20.x' } as const;
