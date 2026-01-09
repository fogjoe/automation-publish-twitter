# Automation Publish Twitter

Automate publishing your daily journal entries from Notion to Twitter (X.com). This tool fetches your journal, polishes it with AI, splits it into a thread, and posts it automatically.

## Features

- **Notion Integration**: Fetches daily journal entries from your Notion database
- **AI Polishing**: Transforms raw journal content into engaging social media posts using GPT-4o-mini
- **Smart Thread Splitting**: Automatically splits long content into tweet-sized chunks with proper numbering
- **Automated Posting**: Uses browser automation to post threads to Twitter/X
- **Status Tracking**: Updates Notion entry status from "Ready" to "Published"

## How It Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              WORKFLOW DIAGRAM                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐          │
│   │  Notion  │────▶│    AI    │────▶│  Split   │────▶│ Twitter  │          │
│   │  Fetch   │     │  Polish  │     │  Thread  │     │   Post   │          │
│   └──────────┘     └──────────┘     └──────────┘     └──────────┘          │
│        │                                                   │                │
│        │                                                   │                │
│        └───────────────────────────────────────────────────┘                │
│                    Update status to "Published"                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

1. **Fetch**: Queries Notion for entries with Status="Ready" and today's date
2. **Polish**: Sends content to AI to transform into engaging Twitter posts
3. **Split**: Breaks polished content into ~260 character chunks with thread numbering (1/N)
4. **Post**: Automates Twitter web UI to post the entire thread
5. **Update**: Marks the Notion entry as "Published"

## Prerequisites

Before you begin, ensure you have:

- **Node.js** (v18 or higher)
- **pnpm** (v10 or higher) - Package manager
- **A Notion account** with API access
- **A Twitter/X account**
- **An OpenRouter account** for AI API access

## Project Structure

```
automation-publish-twitter/
├── src/
│   ├── index.ts              # Main entry point - orchestrates workflow
│   ├── services/
│   │   ├── notion.ts         # Notion database integration
│   │   ├── ai.ts             # OpenAI/OpenRouter API integration
│   │   └── twitter.ts        # Twitter posting via Playwright
│   └── utils/
│       └── textSplitter.ts   # Text splitting logic for threads
├── tools/
│   └── login.ts              # Twitter authentication setup tool (optional)
├── package.json
├── tsconfig.json
├── .env.example              # Environment variable template
├── auth.example.json         # Twitter authentication template
└── README.md
```

## Setup Instructions

### Step 1: Clone and Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd automation-publish-twitter

# Install dependencies using pnpm
pnpm install
```

This will install:
- `@notionhq/client` - Notion API client
- `openai` - OpenAI client (used with OpenRouter)
- `playwright` - Browser automation
- `dotenv` - Environment variable management
- TypeScript and related dev dependencies

### Step 2: Set Up Notion

#### 2.1 Create a Notion Integration

1. Go to [Notion Developers](https://www.notion.so/my-integrations)
2. Click **"+ New integration"**
3. Give it a name (e.g., "Twitter Publisher")
4. Select the workspace where your journal database lives
5. Click **"Submit"**
6. Copy the **"Internal Integration Token"** (starts with `secret_`)

#### 2.2 Create Your Journal Database

Create a Notion database with the following properties:

| Property Name | Type | Description |
|--------------|------|-------------|
| **Title** | Title | The title of your journal entry |
| **Date** | Date | The date of the journal entry |
| **Status** | Select | Options: "Ready", "Published" |
| **Content** | Text/Rich Text | Your journal content |

#### 2.3 Connect Integration to Database

1. Open your Notion database
2. Click the **"..."** menu in the top-right corner
3. Click **"+ Add connections"**
4. Find and select your integration
5. Click **"Confirm"**

#### 2.4 Get Database ID

1. Open your database in Notion
2. Look at the URL: `https://www.notion.so/workspace/DATABASE_ID?v=...`
3. Copy the `DATABASE_ID` part (32 characters, looks like: `a1b2c3d4e5f6...`)

### Step 3: Set Up OpenRouter

OpenRouter provides access to various AI models including GPT-4o-mini.

1. Go to [OpenRouter](https://openrouter.ai/)
2. Sign up or log in
3. Navigate to **Keys** section
4. Create a new API key
5. Copy the API key

### Step 4: Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env
```

Edit `.env` and fill in your credentials:

```env
# Notion Configuration
NOTION_KEY=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# OpenRouter Configuration
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
LLM_MODEL_NAME=openai/gpt-4o-mini
```

#### Environment Variables Explained

| Variable | Description |
|----------|-------------|
| `NOTION_KEY` | Your Notion integration token (starts with `secret_`) |
| `NOTION_DATABASE_ID` | The ID of your Notion database |
| `OPENROUTER_API_KEY` | Your OpenRouter API key |
| `OPENROUTER_BASE_URL` | OpenRouter API endpoint (keep as default) |
| `LLM_MODEL_NAME` | AI model to use (default: `openai/gpt-4o-mini`) |

### Step 5: Authenticate with Twitter (Manual Method)

The tool needs your Twitter session cookies to post tweets. You'll need to extract three cookie values from your browser manually.

#### 5.1 Create Auth File

```bash
# Copy the example auth file
cp auth.example.json auth.json
```

#### 5.2 Log in to Twitter in Your Browser

1. Open your browser (Chrome, Firefox, Edge, etc.)
2. Go to [https://x.com](https://x.com) or [https://twitter.com](https://twitter.com)
3. Log in to your Twitter/X account
4. Complete any 2FA if required
5. Make sure you're fully logged in and can see your home timeline

#### 5.3 Extract Cookie Values

You need to extract 3 specific cookies: `auth_token`, `ct0`, and `twid`.

**For Chrome/Edge:**
1. Press `F12` or right-click and select **"Inspect"** to open Developer Tools
2. Go to the **"Application"** tab (you may need to click `>>` to see it)
3. In the left sidebar, expand **"Cookies"**
4. Click on **"https://x.com"** or **"https://twitter.com"**
5. Find and copy the values for these three cookies:
   - `auth_token`
   - `ct0`
   - `twid`

**For Firefox:**
1. Press `F12` or right-click and select **"Inspect"** to open Developer Tools
2. Go to the **"Storage"** tab
3. In the left sidebar, expand **"Cookies"**
4. Click on **"https://x.com"** or **"https://twitter.com"**
5. Find and copy the values for the same three cookies

**For Safari:**
1. Enable Developer menu: Safari > Preferences > Advanced > "Show Develop menu in menu bar"
2. Go to **Develop > Show Web Inspector**
3. Click on the **"Storage"** tab
4. Expand **"Cookies"** and select the Twitter domain
5. Find and copy the three cookie values

#### 5.4 Update auth.json

Open `auth.json` and replace the placeholder values with your actual cookie values:

```json
{
  "cookies": [
    {
      "name": "auth_token",
      "value": "YOUR_AUTH_TOKEN_VALUE_HERE",
      "domain": ".x.com",
      "path": "/"
    },
    {
      "name": "ct0",
      "value": "YOUR_CT0_VALUE_HERE",
      "domain": ".x.com",
      "path": "/"
    },
    {
      "name": "twid",
      "value": "YOUR_TWID_VALUE_HERE",
      "domain": ".x.com",
      "path": "/"
    }
  ],
  "origins": []
}
```

**Example with actual values (DO NOT use these, they are just examples):**

```json
{
  "cookies": [
    {
      "name": "auth_token",
      "value": "abc123def456ghi789jkl012mno345pqr678stu",
      "domain": ".x.com",
      "path": "/"
    },
    {
      "name": "ct0",
      "value": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6",
      "domain": ".x.com",
      "path": "/"
    },
    {
      "name": "twid",
      "value": "u%3D1234567890123456789",
      "domain": ".x.com",
      "path": "/"
    }
  ],
  "origins": []
}
```

**Important Security Notes:**
- Never share your `auth.json` file with anyone
- Never commit it to version control (it's already in `.gitignore`)
- These cookies give full access to your Twitter account
- Cookies may expire - you'll need to repeat this process if authentication fails

### Step 6: Verify Setup

Before running the automation, verify:

- [ ] `.env` file exists with all credentials filled in
- [ ] `auth.json` file exists with your Twitter cookie values
- [ ] Your Notion database has at least one entry with:
  - Today's date in the Date field
  - Status set to "Ready"
  - Content filled in

## Usage

### Running the Automation

```bash
# Run the automation
pnpm run dev

# Or use the start alias
pnpm start
```

### What Happens When You Run

1. The tool connects to Notion and looks for entries where:
   - Date = Today
   - Status = "Ready"

2. If found, it fetches the content and sends it to AI for polishing

3. The AI transforms your journal into an engaging Twitter post with:
   - Casual, first-person language
   - Relevant emojis
   - Witty tech blogger style

4. Long content is split into a thread (each tweet ~260 characters)

5. A headless browser opens, navigates to Twitter, and posts the thread

6. The Notion entry status is updated to "Published"

### Available Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `pnpm run dev` | Run the automation |
| `start` | `pnpm start` | Alias for dev |
| `login` | `pnpm run login` | (Optional) Automated Twitter auth setup |
| `build` | `pnpm run build` | Compile TypeScript to JavaScript |

## Notion Database Requirements

Your Notion database must have these exact property names:

### Required Properties

| Property | Type | Values/Format |
|----------|------|---------------|
| `Title` | Title | Any text |
| `Date` | Date | Date format (e.g., 2024-01-15) |
| `Status` | Select | Must include "Ready" and "Published" options |
| `Content` | Text | The journal content to be posted |

### Example Entry

| Title | Date | Status | Content |
|-------|------|--------|---------|
| My Tech Journey Day 1 | 2024-01-15 | Ready | Today I learned about TypeScript generics... |

## Customization

### Changing the AI Prompt

Edit `src/services/ai.ts` to customize how AI polishes your content:

```typescript
const response = await openai.chat.completions.create({
  model: process.env.LLM_MODEL_NAME || "openai/gpt-4o-mini",
  messages: [
    {
      role: "system",
      content:
        "You are a witty tech blogger. Polish the diary into an engaging social media post. Use emojis, first-person perspective, and casual language. Keep it under 280 characters per chunk if possible.",
    },
    {
      role: "user",
      content: rawText,
    },
  ],
});
```

Modify the `content` in the system message to change the style.

### Adjusting Tweet Length

Edit `src/utils/textSplitter.ts` to change the maximum characters per tweet:

```typescript
const MAX_TWEET_LENGTH = 260; // Change this value
```

### Using Different AI Models

Change `LLM_MODEL_NAME` in your `.env` file. Available models on OpenRouter include:
- `openai/gpt-4o-mini` (default, fast and cheap)
- `openai/gpt-4o` (more capable)
- `anthropic/claude-3-haiku` (fast alternative)
- `anthropic/claude-3-sonnet` (balanced)

## Troubleshooting

### Common Issues

#### "No journal entry found"

**Problem**: The automation can't find any entries to post.

**Solutions**:
1. Check your Notion database has an entry with today's date
2. Verify the Status is set to "Ready" (exact match)
3. Ensure your Notion integration is connected to the database
4. Check `NOTION_DATABASE_ID` in `.env` is correct

#### "Twitter authentication failed"

**Problem**: The browser can't access Twitter.

**Solutions**:
1. Re-extract your cookie values from the browser (they may have expired)
2. Make sure all three cookies (`auth_token`, `ct0`, `twid`) are correct
3. Verify the cookie values in `auth.json` are properly formatted JSON
4. Try logging out and back into Twitter, then re-extract cookies
5. Check if Twitter changed their UI (may need code updates)

#### "Cookie expired" or "Session invalid"

**Problem**: Twitter cookies have expired.

**Solution**:
Twitter cookies typically last several weeks but can expire. Repeat Step 5 to get fresh cookie values:
1. Log in to Twitter in your browser
2. Extract the three cookie values
3. Update `auth.json` with the new values

#### "OpenRouter API error"

**Problem**: AI polishing fails.

**Solutions**:
1. Verify your `OPENROUTER_API_KEY` is valid
2. Check you have credits in your OpenRouter account
3. Try a different model if one is unavailable

#### "Playwright browser errors"

**Problem**: Browser automation issues.

**Solutions**:
```bash
# Reinstall Playwright browsers
pnpm exec playwright install chromium
```

#### "Permission denied" on auth.json

**Problem**: Can't write to auth.json file.

**Solutions**:
```bash
# Fix file permissions
chmod 644 auth.json
```

### Debug Mode

To see what's happening during execution, you can modify `src/services/twitter.ts` to run in non-headless mode:

```typescript
const browser = await chromium.launch({
  headless: false, // Change from true to false
});
```

This will show the browser window during posting.

## Scheduling (Optional)

To run this automation daily, you can use cron (Linux/Mac) or Task Scheduler (Windows).

### Using Cron (Linux/Mac)

```bash
# Edit crontab
crontab -e

# Add this line to run at 9:00 AM daily
0 9 * * * cd /path/to/automation-publish-twitter && /path/to/pnpm run dev >> /var/log/twitter-automation.log 2>&1
```

### Using macOS launchd

Create `~/Library/LaunchAgents/com.twitter.automation.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.twitter.automation</string>
    <key>ProgramArguments</key>
    <array>
        <string>/path/to/pnpm</string>
        <string>run</string>
        <string>dev</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/path/to/automation-publish-twitter</string>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>9</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
</dict>
</plist>
```

Load it:
```bash
launchctl load ~/Library/LaunchAgents/com.twitter.automation.plist
```

## Security Best Practices

1. **Never commit secrets**: `.env` and `auth.json` are in `.gitignore`
2. **Rotate API keys**: Periodically regenerate your API keys
3. **Limit Notion permissions**: Give your integration only necessary access
4. **Monitor usage**: Check OpenRouter dashboard for unexpected API usage
5. **Session security**: Re-extract Twitter cookies periodically for security

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Notion SDK**: @notionhq/client
- **AI**: OpenAI SDK with OpenRouter
- **Browser Automation**: Playwright
- **Package Manager**: pnpm

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - Feel free to use and modify as needed.

---

## Quick Start Checklist

```
[ ] 1. Clone repo and run `pnpm install`
[ ] 2. Create Notion integration and get API key
[ ] 3. Create Notion database with required properties (Title, Date, Status, Content)
[ ] 4. Connect integration to database and get Database ID
[ ] 5. Get OpenRouter API key
[ ] 6. Copy .env.example to .env and fill in credentials
[ ] 7. Copy auth.example.json to auth.json
[ ] 8. Log in to Twitter in your browser
[ ] 9. Extract cookies (auth_token, ct0, twid) from browser Developer Tools
[ ] 10. Paste cookie values into auth.json
[ ] 11. Add a journal entry in Notion with today's date and Status="Ready"
[ ] 12. Run `pnpm run dev` to test
[ ] 13. (Optional) Set up cron for daily automation
```

Happy automating!
