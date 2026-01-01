# Environment Variables Configuration

This document is the single source of truth for all environment variable configuration in Babblr.

## Quick Start

1. **Copy the example file:**

   **Linux/macOS (bash):**
   ```bash
   cp backend/.env.example backend/.env
   ```

   **Windows (CMD):**
   ```cmd
   copy backend\.env.example backend\.env
   ```

2. **Get your Anthropic API key** (see below)

3. **Edit `backend/.env`** and add your API key:
   ```
   ANTHROPIC_API_KEY=sk-ant-api03-...
   ```

4. **Restart the backend** if it's already running

## Required API Keys

### Anthropic Claude API Key (REQUIRED)

Babblr uses Claude AI for conversation and error correction. You need an API key to use the app.

**Where to get it:**
1. Visit [Anthropic Console](https://console.anthropic.com/settings/keys)
2. Sign up for a free account (if you don't have one)
3. Click "Create Key" to generate a new API key
4. Copy the key (starts with `sk-ant-api03-...`)

**Free Tier:**
- New users get **$5 free credits**
- After free credits, pay-as-you-go pricing applies
- Check current pricing: https://www.anthropic.com/pricing

**Add to `.env`:**
```bash
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here
```

**Documentation:**
- [Anthropic Quickstart](https://docs.anthropic.com/en/docs/quickstart)
- [API Reference](https://docs.anthropic.com/en/api)
- [Models Overview](https://docs.anthropic.com/en/docs/models-overview)

## Optional Configuration

### Claude Model Selection

You can optionally specify which Claude model to use. If not set, defaults to `claude-3-5-sonnet-20241022`.

```bash
# Optional - uncomment to customize
CLAUDE_MODEL=claude-3-5-sonnet-20241022
```

**Available models:**
- `claude-3-5-sonnet-20241022` (Recommended - best balance of quality and cost)
- `claude-3-haiku-20240307` (Faster, cheaper, slightly lower quality)
- `claude-3-opus-20240229` (Highest quality, most expensive)

See full list: https://docs.anthropic.com/en/docs/models-overview

### Whisper Model Size

Whisper runs **locally** (no API key needed) for speech-to-text. You can choose the model size:

```bash
# Optional - uncomment to customize
WHISPER_MODEL=base
```

**Options:**
- `tiny` - Fastest, least accurate (~39M parameters)
- `base` - **Default** - Good balance (~74M parameters)
- `small` - Better accuracy (~244M parameters)
- `medium` - High accuracy (~769M parameters)
- `large` - Best accuracy (~1550M parameters, requires GPU)

**Note:** Larger models require more RAM and processing time.

### Server Configuration

```bash
# Default backend server settings
HOST=127.0.0.1
PORT=8000
```

**When to change:**
- Deploy to production: Change `HOST` to `0.0.0.0`
- Port conflict: Change `PORT` to another port (e.g., `8001`)

### Timezone

Used for timestamp formatting in database records.

```bash
# Default timezone
TIMEZONE=Europe/Amsterdam
```

**Common options:**
- `Europe/Amsterdam`
- `Europe/Madrid`
- `America/New_York`
- `America/Los_Angeles`
- `Asia/Tokyo`

Full list: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones

### Database

```bash
# SQLite database location
DATABASE_URL=sqlite+aiosqlite:///./babblr.db
```

**Default:** Creates `babblr.db` in the backend directory.

**To change location:**
```bash
# Absolute path
DATABASE_URL=sqlite+aiosqlite:////path/to/custom/location/babblr.db

# Relative path (from backend directory)
DATABASE_URL=sqlite+aiosqlite:///./data/babblr.db
```

### CORS (Frontend URL)

```bash
# Frontend URL for CORS
FRONTEND_URL=http://localhost:3000
```

**When to change:**
- Frontend runs on different port: Update to match
- Deploy to production: Set to your production frontend URL

## Complete `.env` File Example

```bash
# ============================================
# REQUIRED
# ============================================

# Anthropic Claude API Key (REQUIRED)
# Get your key from: https://console.anthropic.com/settings/keys
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here

# ============================================
# OPTIONAL (with defaults)
# ============================================

# Claude Model (defaults to claude-3-5-sonnet-20241022)
# CLAUDE_MODEL=claude-3-5-sonnet-20241022

# Whisper Model (defaults to base)
# WHISPER_MODEL=base

# Server Configuration
HOST=127.0.0.1
PORT=8000

# Timezone (defaults to Europe/Amsterdam)
TIMEZONE=Europe/Amsterdam

# Database
DATABASE_URL=sqlite+aiosqlite:///./babblr.db

# CORS Configuration
FRONTEND_URL=http://localhost:3000
```

## Troubleshooting

### Error: "Invalid Anthropic API key"

**Symptoms:**
- Backend logs show: `authentication_error: invalid x-api-key`
- Frontend shows: "Invalid Anthropic API key configured on the server"

**Solutions:**
1. Verify your API key is correct (check for extra spaces, typos)
2. Ensure the key starts with `sk-ant-api03-`
3. Verify the key is active in [Anthropic Console](https://console.anthropic.com/settings/keys)
4. Check you have available credits (free tier or paid)
5. Restart the backend after updating `.env`

### Error: ".env file not found"

**Symptoms:**
- Backend logs show warnings about missing environment variables
- API key defaults to empty string

**Solutions:**
1. Ensure `.env` file exists in `backend/` directory
2. Copy from example: `cp backend/.env.example backend/.env`
3. Verify file name is exactly `.env` (not `.env.txt` or similar)

### Environment variables not loading

**Symptoms:**
- Changes to `.env` don't take effect
- Settings still use defaults

**Solutions:**
1. Restart the backend completely (stop and start)
2. Check file encoding (should be UTF-8)
3. Verify no quotes around values: `KEY=value` not `KEY="value"`
4. Check for syntax errors (no spaces around `=`)

## Security Best Practices

1. **Never commit `.env` to version control**
   - Already in `.gitignore`
   - Keep API keys secret

2. **Don't share your API key**
   - Treat it like a password
   - Regenerate if exposed

3. **Use environment-specific files**
   - `.env.development` for development
   - `.env.production` for production
   - Never mix environments

4. **Monitor API usage**
   - Check [Anthropic Console](https://console.anthropic.com/) regularly
   - Set up billing alerts
   - Track credit usage

## Platform-Specific Notes

### Windows

- Use backslashes in file paths: `C:\path\to\babblr.db`
- Or forward slashes work too: `C:/path/to/babblr.db`
- Environment variable format is the same as Linux/macOS

### Linux/macOS

- Use forward slashes: `/path/to/babblr.db`
- Ensure file permissions are correct: `chmod 600 backend/.env`
- Use `source` or `.` to load in shell if needed

### Docker/Containers

If running in Docker, pass environment variables via:
```bash
docker run -e ANTHROPIC_API_KEY=your-key ...
```

Or use `--env-file`:
```bash
docker run --env-file backend/.env ...
```

## Additional Resources

- [Anthropic API Documentation](https://docs.anthropic.com/)
- [Anthropic Console (API Keys)](https://console.anthropic.com/settings/keys)
- [Anthropic Pricing](https://www.anthropic.com/pricing)
- [OpenAI Whisper Documentation](https://github.com/openai/whisper)
- [FastAPI Environment Variables](https://fastapi.tiangolo.com/advanced/settings/)
