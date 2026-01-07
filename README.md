# FunPost Automation Server

Browser automation server for FunPost - handles Tistory and Naver blog posting via Playwright.

## Tech Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript
- **Framework**: Express.js
- **Browser Automation**: Playwright
- **Database**: Supabase (shared with main FunPost project)

## Why Browser Automation?

Both Tistory and Naver Blog APIs have been discontinued:
- Tistory API: Shut down February 2024
- Naver Blog API: Shut down May 2020

This server uses Playwright for browser automation with session persistence.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/login` | Login to platform |
| POST | `/api/session/check` | Verify session validity |
| POST | `/api/post` | Create blog post |

All endpoints require `x-api-key` header.

## Environment Variables

```env
PORT=3001
NODE_ENV=development
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
API_SECRET_KEY=your_api_secret_key
HEADLESS=true
ALLOWED_ORIGINS=http://localhost:3000
```

## Database

Requires `platform_sessions` table in Supabase:

```sql
CREATE TABLE platform_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('tistory', 'naver')),
  cookies TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

CREATE INDEX idx_platform_sessions_user ON platform_sessions(user_id);
CREATE INDEX idx_platform_sessions_expires ON platform_sessions(expires_at);
```

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build
npm run build

# Run production
npm start
```

## Deployment (Railway)

This server is designed to run on Railway with the included Dockerfile.

```bash
# Using Railway CLI
railway up
```

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│   Vercel        │     │   Railway       │
│   (FunPost)     │────▶│   (This Server) │
│                 │ API │                 │
└─────────────────┘     └─────────────────┘
         │                      │
         ▼                      ▼
┌─────────────────────────────────────────┐
│              Supabase                   │
│      (Shared DB, Session Storage)       │
└─────────────────────────────────────────┘
```

## Session Management

- Sessions are stored as encrypted cookies in Supabase
- Default session expiry: 7 days
- Sessions are automatically refreshed on successful operations
- CAPTCHA handling: Manual login required if CAPTCHA is triggered
