/**
 * Vercel Serverless Function wrapper for IMF API
 * Use a static ESM import so Vercel bundles the dependency into this function.
 */
import imf3Adapter from '../server/api/imf3';

export default imf3Adapter;

// Ensure Node.js runtime on Vercel (not Edge)
// No explicit runtime override here; Vercel will use the default Node.js runtime.
