# CORS Error Fix Guide

## Current Issue

The dashboard is showing a "Failed to fetch" error with status `FETCH_ERROR`. This is a **CORS (Cross-Origin Resource Sharing)** issue.

### What's Happening

1. Frontend is running on `http://localhost:5173` (or similar)
2. API is running on `https://9f4c-2401-4900-889e-b7c5-417f-40e7-fb4b-a7ce.ngrok-free.app/`
3. Browser blocks the request because the API doesn't have CORS headers

### Temporary Solution (Development)

The dashboard now has a **fallback to mock data** when the API fails. This allows you to:
- See the dashboard UI working
- Test the layout and styling
- Continue development while fixing the backend

**Mock data being used:**
```json
{
  "pending_intent_count": 12,
  "special_intrest_product_count": 5,
  "silent_alerts_count": "3",
  "active_orders_today": 28
}
```

## Permanent Solution (Backend Fix)

To fix this properly, your backend needs to add CORS headers. Here's how:

### For Django Backend

Add this to your Django settings:

```python
# settings.py

INSTALLED_APPS = [
    # ... other apps
    'corsheaders',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Add this at the top
    'django.middleware.common.CommonMiddleware',
    # ... other middleware
]

# Allow requests from your frontend
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    # Add your production domain here
]

# Or allow all origins (NOT recommended for production)
CORS_ALLOW_ALL_ORIGINS = True

# Allow credentials (cookies, auth headers)
CORS_ALLOW_CREDENTIALS = True
```

Install the package:
```bash
pip install django-cors-headers
```

### For Flask Backend

```python
from flask import Flask
from flask_cors import CORS

app = Flask(__name__)

# Allow CORS from your frontend
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:5173", "http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Or allow all origins (NOT recommended for production)
CORS(app)
```

Install the package:
```bash
pip install flask-cors
```

### For Express/Node Backend

```javascript
const cors = require('cors');
const express = require('express');

const app = express();

// Allow CORS from your frontend
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Or allow all origins (NOT recommended for production)
app.use(cors());
```

Install the package:
```bash
npm install cors
```

### For FastAPI Backend

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Or allow all origins (NOT recommended for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Testing the Fix

After adding CORS headers to your backend:

1. **Restart your backend server**
2. **Refresh the dashboard page** in your browser
3. **Check the Network tab** in DevTools
4. The request should now succeed with status `200`

## Verification Steps

### Step 1: Check CORS Headers

Open DevTools → Network tab → Click on the dashboard API request

Look for these response headers:
```
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

### Step 2: Verify Data is Displayed

Once CORS is fixed:
1. Dashboard should show real data from your API
2. Mock data fallback will no longer be used
3. Console logs will show "Dashboard API: Raw response received"

### Step 3: Check Console Logs

Open DevTools → Console tab

You should see:
```
Dashboard API: Auth token present: true
Dashboard API: Fetching from api/superadmin/dashboard/dashboard/
Dashboard API: Raw response received: { pending_intent_count: 12, ... }
Dashboard API: Normalized response { pending_intent_count: 12, ... }
```

## Production Deployment

For production, be more restrictive with CORS:

```python
# Django
CORS_ALLOWED_ORIGINS = [
    "https://yourdomain.com",
    "https://www.yourdomain.com",
]
```

```javascript
// Express
app.use(cors({
  origin: ['https://yourdomain.com', 'https://www.yourdomain.com'],
  credentials: true,
}));
```

## Ngrok Specific Issue

If using ngrok, you may also need to add ngrok-specific headers:

```python
# Django
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "https://*.ngrok-free.app",  # Allow all ngrok URLs
]
```

Or disable ngrok's browser warning:
```bash
ngrok http 8000 --disable-browser-warning
```

## Troubleshooting

### Still Getting CORS Error?

1. **Check backend logs** - See if the request is reaching the server
2. **Verify CORS middleware is installed** - Check requirements.txt or package.json
3. **Restart backend server** - Changes to CORS config require restart
4. **Clear browser cache** - Sometimes browsers cache CORS responses
5. **Check origin URL** - Make sure it matches exactly (http vs https, port number, etc.)

### Request Succeeds but Data is Wrong?

1. Check the API response format in Network tab
2. Verify field names match the expected format
3. Update the normalization function if needed

### Mock Data Still Showing?

1. Check if API request is actually succeeding (Network tab)
2. Look for "Dashboard API: Using mock data due to error" in console
3. If you see this, the API is still failing - check CORS headers

## Removing Mock Data Fallback (Production)

Once CORS is fixed and working, you can remove the mock data fallback:

Edit `src/features/dashboard/api/dashboardApi.ts`:

```typescript
// Remove this section:
async onQueryStarted(_, { dispatch, queryFulfilled }) {
  try {
    await queryFulfilled;
  } catch (error) {
    console.warn("Dashboard API: Using mock data due to error");
    dispatch(
      dashboardApi.util.updateQueryData("getDashboardHeader", undefined, () =>
        MOCK_DASHBOARD_DATA,
      ),
    );
  }
},
```

And remove the mock data constant:
```typescript
// Remove this:
const MOCK_DASHBOARD_DATA: DashboardData = { ... };
```

## Quick Reference

| Issue | Solution |
|-------|----------|
| "Failed to fetch" error | Add CORS headers to backend |
| 401 Unauthorized | Check auth token is valid |
| 404 Not Found | Verify API endpoint URL |
| 500 Server Error | Check backend logs |
| Mock data showing | CORS is still failing |
| Real data showing | CORS is working! ✓ |

## Next Steps

1. **Identify your backend framework** (Django, Flask, Express, FastAPI, etc.)
2. **Add CORS middleware** using the code above
3. **Restart your backend server**
4. **Refresh the dashboard** and verify it works
5. **Check the Network tab** to confirm CORS headers are present
6. **Remove mock data fallback** once everything is working

## Support

If you need help:
1. Check the console logs for detailed error messages
2. Look at the Network tab response headers
3. Verify the backend is running and accessible
4. Check backend logs for any errors
5. Contact your backend team with the error details
