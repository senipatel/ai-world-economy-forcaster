# Vercel Environment Variables Setup

To fix the `FUNCTION_INVOCATION_FAILED` error, you need to configure the following environment variables in your Vercel project:

## Required Environment Variables

1. **IMF_API_KEY** (or CHART_API_KEY)
   - Get your API key from: https://datahelp.imf.org/
   - Used for fetching economic data from IMF

2. **LLM_API_KEY** (or VITE_LLM_API_KEY)
   - Get your Google Gemini API key from: https://aistudio.google.com/app/apikey
   - Used for the AI chat functionality

## How to Set Environment Variables in Vercel

### Option 1: Via Vercel Dashboard (Recommended)
1. Go to your project on Vercel: https://vercel.com/dashboard
2. Click on your project name
3. Go to **Settings** → **Environment Variables**
4. Add the following variables:
   - Name: `IMF_API_KEY`, Value: `your_imf_api_key_here`
   - Name: `LLM_API_KEY`, Value: `your_gemini_api_key_here`
5. Click **Save**
6. **Redeploy** your application for changes to take effect

### Option 2: Via Vercel CLI
```bash
vercel env add IMF_API_KEY
# Enter your IMF API key when prompted

vercel env add LLM_API_KEY
# Enter your Gemini API key when prompted

# Redeploy
vercel --prod
```

## For Local Development

Create a `.env` file in the root directory:

```bash
# Copy from .env.example
cp .env.example .env
```

Then edit `.env` with your actual keys:

```
IMF_API_KEY=your_imf_api_key_here
LLM_API_KEY=your_gemini_api_key_here
```

## After Setting Environment Variables

1. **Redeploy your application** - Environment variables only take effect after redeployment
2. Wait for the deployment to complete
3. Test your application

## Troubleshooting

If you still see the error after setting environment variables:

1. Verify the environment variables are set correctly in Vercel dashboard
2. Make sure you redeployed after setting them
3. Check the Vercel function logs for specific error messages
4. Ensure your API keys are valid and have proper permissions
