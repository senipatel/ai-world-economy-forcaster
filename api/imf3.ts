/**
 * Vercel Serverless Function wrapper for IMF API
 * Delegates directly to the Express-style adapter exported from server/api/imf3.ts
 */
import imf3Adapter from '../server/api/imf3';

export default imf3Adapter;
