# AI Economic Analyst Chat Flow - Complete Guide

## 🔄 Complete Request/Response Flow

```
USER → FRONTEND → VITE MIDDLEWARE → LLMCHAT HANDLER → GEMINI API → RESPONSE → FRONTEND → USER
```

---

## 📊 Step-by-Step Breakdown

### **Step 1: Frontend - User Sends Message** 
**File:** `src/pages/Dashboard.tsx` (lines 497-540)

```
User types: "What's the trend?"
User clicks: Send button
↓
Trigger: handleSendMessage() function
```

**What happens:**
1. Get current chat message from input field
2. Check if checkbox is marked for "Include graph data"
3. If YES → collect all economic data for the country/indicator
4. If NO → send just the question without context

**Data Structure Sent:**
```json
{
  "message": "What's the trend?",
  "context": {
    "country": "United States",
    "indicator": "GDP Growth",
    "timeRange": "2000-2024",
    "data": [
      { "year": "2000", "value": 3.8 },
      { "year": "2001", "value": 1.1 },
      ...
      { "year": "2024", "value": 2.5 }
    ]
  }
}
```

---

### **Step 2: Network Request** 
**File:** `src/pages/Dashboard.tsx` (line 517)

```typescript
const response = await fetch('/api/chat/llm', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: chatMessage,
    context: contextData
  })
});
```

**What happens:**
- Browser sends HTTP POST to `http://localhost:8080/api/chat/llm`
- Includes JSON body with message and context
- Request goes to Vite dev server

---

### **Step 3: Vite Middleware - Route Interception**
**File:** `vite.config.ts` (lines 58-91)

**What happens:**
1. Vite middleware intercepts all requests
2. Checks if URL starts with `/api/chat/llm` ✓
3. Detects it's a POST request
4. **Reads the body in chunks** (very important for large payloads)
5. **Converts Buffer to proper format** for the handler
6. Creates a Request object that the handler can use
7. Calls the LLM handler

**Code Flow:**
```typescript
if (url.startsWith("/api/chat/llm")) {
  // Read body as Buffer chunks
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  bodyBuffer = Buffer.concat(chunks);
  
  // Create Request for handler
  const request = new Request(fullUrl, {
    method: req.method,
    headers: req.headers,
    body: bodyBuffer
  });
  
  // Call handler
  const response = await llmChatHandler(request);
  
  // Send response back to browser
  res.end(Buffer.from(responseBody));
}
```

**Debugging Logs:**
- `[vite-middleware] LLM Chat request received`
- `[vite-middleware] Request body received, size: XXX`
- `[vite-middleware] Calling LLM handler...`
- `[vite-middleware] LLM handler returned status: 200`

---

### **Step 4: LLM Handler - Process Request**
**File:** `server/chat/LLMChat.ts` (lines 118-248)

**Phase 1: Validate Request**
```
✓ Check method is POST
✓ Parse JSON body using req.text() then JSON.parse()
✓ Extract message and context
✓ Validate message is not empty
```

**Debugging Logs:**
- `[LLMChat] Handler called, method: POST`
- `[LLMChat] Parsing request body...`
- `[LLMChat] Body text length: XXX`
- `[LLMChat] Request parsed successfully`

**Phase 2: Get API Key**
```
✓ Read LLM_API_KEY from process.env
✓ Verify it exists (loaded from .env file)
```

**Debugging Logs:**
- `[LLMChat] API Key available: Yes (AIzaSyDNJH...)`

**Phase 3: Build Prompt**

If context was provided, the prompt includes:
- Country name
- Economic indicator
- Time range
- Statistical analysis (avg, min, max, trend)
- Last 10 data points
- Full dataset
- User's original question

If no context:
- Just the user's question with system prompt

**Phase 4: Call Gemini API**
```
✓ Build request with prompt
✓ Set generation parameters (temperature: 0.7, etc.)
✓ Make POST to Google Gemini API
✓ Parse AI response
```

**Debugging Logs:**
- `[LLMChat] Calling Gemini API with model: gemini-1.5-flash (v1beta)`
- `[LLMChat] Request payload prepared`
- `[LLMChat] Gemini API response received`
- `[LLMChat] Response generated successfully, length: XXX`

---

### **Step 5: Gemini API - Generate Response**
**Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`

**Request Format:**
```json
{
  "contents": [{
    "parts": [{
      "text": "[Full prompt with data and question]"
    }]
  }],
  "generationConfig": {
    "temperature": 0.7,
    "topK": 40,
    "topP": 0.95,
    "maxOutputTokens": 2048
  }
}
```

**Google Processes:**
1. Analyzes the economic data
2. Understands the user's question
3. Generates relevant, data-backed response
4. Formats response in clear paragraphs
5. Returns JSON with candidates

---

### **Step 6: Response Back to Handler**
**File:** `server/chat/LLMChat.ts` (lines 227-239)

Handler returns:
```json
{
  "success": true,
  "response": "[AI Generated Response]",
  "hasContext": true
}
```

**Debugging Logs:**
- `[LLMChat] Processing request with context: Yes`
- `[vite-middleware] LLM handler returned status: 200`

---

### **Step 7: Response to Frontend**
**File:** `src/pages/Dashboard.tsx` (lines 519-532)

**What happens:**
1. Frontend receives response (status 200)
2. Parses JSON response
3. Checks if `data.success === true`
4. Sets `setChatResponse(data.response)`
5. Clears input field
6. Stops loading spinner

**Result:** AI response appears in chat UI with fade-in animation

---

## 🔧 Configuration & Environment

### **Environment Variables** 
File: `.env`

```
CHART_API_KEY=e811831a18f4401f80293a10549a3c93
IMF_API_KEY=e811831a18f4401f80293a10549a3c93
LLM_API_KEY=AIzaSyDNJHyEiY0-887L5sgPtjvysXz0gvoYRn4
```

**How Vite loads them:**
```typescript
const env = loadEnv(mode, process.cwd(), '');
if (env.LLM_API_KEY) {
  process.env.LLM_API_KEY = env.LLM_API_KEY;
}
```

---

## 🐛 Error Handling

### **Common Errors & Solutions**

| Error | Cause | Solution |
|-------|-------|----------|
| 405 Method Not Allowed | Sent GET instead of POST | Always use POST |
| 400 Invalid JSON | Malformed JSON in body | Check JSON syntax in frontend |
| 404 Not Found | Model name wrong | Use `gemini-1.5-flash` with `v1beta` |
| 500 API Key Error | LLM_API_KEY not set | Check `.env` file |
| 500 Gemini Error | API request failed | Check API quota/status |

### **Debugging Tips**

1. **Check Terminal Logs**
   - Look for `[vite-middleware]` logs for request flow
   - Look for `[LLMChat]` logs for processing
   - Look for error messages with stack traces

2. **Browser Console**
   - Check for fetch errors
   - See the actual response object
   - Verify JSON parsing

3. **Common Issues:**
   - API key not loaded → Check .env file exists
   - Request body corrupted → Middleware buffer handling
   - JSON parse fails → Body format issue
   - 404 from API → Wrong endpoint or model name

---

## 📝 Example Request/Response

### **Request (from browser to server)**
```
POST /api/chat/llm
Content-Type: application/json

{
  "message": "What was the average GDP growth?",
  "context": {
    "country": "United States",
    "indicator": "GDP Growth",
    "timeRange": "2000-2024",
    "data": [
      { "year": "2000", "value": 3.8 },
      { "year": "2001", "value": 1.1 }
    ]
  }
}
```

### **Response (from server to browser)**
```json
{
  "success": true,
  "response": "Based on the data provided, the average GDP growth for the United States from 2000 to 2024 was approximately 2.1%. The data shows fluctuations with a peak of 3.8% in 2000 and a low of 1.1% in 2001...",
  "hasContext": true
}
```

---

## 🚀 Testing the Feature

### **Step 1: Start Dev Server**
```bash
npm run dev
```

### **Step 2: Navigate to Dashboard**
- Select a country
- Select an economic indicator
- Data should load and display on graph

### **Step 3: Test Chat**
1. Type a question: "What's the trend?"
2. **Try WITHOUT context first:**
   - Don't check the checkbox
   - Click Send
   - Should get generic economic advice
3. **Try WITH context:**
   - Check the "Include graph data" checkbox
   - Click Send
   - Should reference specific numbers from your data

### **Step 4: Monitor Logs**
Watch terminal for:
```
[vite-middleware] LLM Chat request received
[vite-middleware] Request body received, size: XXX
[vite-middleware] Calling LLM handler...
[LLMChat] Handler called, method: POST
[LLMChat] Parsing request body...
[LLMChat] Request parsed successfully
[LLMChat] API Key available: Yes (AIzaSyDNJH...)
[LLMChat] Calling Gemini API with model: gemini-1.5-flash (v1beta)
[LLMChat] Gemini API response received
[LLMChat] Response generated successfully, length: XXX
[vite-middleware] LLM handler returned status: 200
```

---

## 📚 Files Involved

| File | Purpose |
|------|---------|
| `src/pages/Dashboard.tsx` | Frontend UI and request sending |
| `vite.config.ts` | Middleware routing and body handling |
| `server/chat/LLMChat.ts` | Core handler and Gemini API calls |
| `.env` | API keys storage |

---

## 🎯 Key Points

✅ **Request body must be Buffer** - Converted in middleware, can be read as text in handler
✅ **Use v1beta endpoint** - gemini-1.5-flash only works with v1beta, not v1
✅ **API Key must be set** - Loaded from .env into process.env
✅ **Context is optional** - Chat works with or without graph data
✅ **Comprehensive logging** - Every step logs for debugging
✅ **Proper error handling** - Specific error messages at each layer

