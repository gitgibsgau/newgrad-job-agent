# 🎓 New Grad Job Agent

An agentic AI built for graduating students to **discover new grad job opportunities across the US** and **craft personalized LinkedIn posts** to attract recruiters — all powered by Claude AI with live web search.

## ✨ Features

- 🔍 **Live Job Search** — Searches the web in real-time for new grad job postings (SWE, finance, and more)
- 🗂 **Job Board** — Displays company, role, location, and direct links in a clean card layout
- ✍️ **LinkedIn Post Generator** — Writes a personalized, human-sounding post based on current openings
- 🤖 **Agentic Loop** — Uses Claude + web search tool in a multi-step agent loop
- 👤 **Profile Customization** — Tailors posts to your name, major, and skills

---

## 🚀 Deploy to Vercel (Free) — Step by Step

### Step 1: Get your Anthropic API Key
1. Go to https://console.anthropic.com
2. Sign up / log in
3. Click **API Keys** → **Create Key**
4. Copy the key (starts with `sk-ant-...`)

### Step 2: Push this project to GitHub
1. Go to https://github.com and create a **New Repository** (name it `newgrad-job-agent`)
2. On your computer, open a terminal in this project folder and run:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/newgrad-job-agent.git
git push -u origin main
```

### Step 3: Deploy on Vercel
1. Go to https://vercel.com and sign up with your GitHub account
2. Click **Add New Project**
3. Import your `newgrad-job-agent` GitHub repo
4. On the configuration screen, click **Environment Variables**
5. Add:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** your key from Step 1
6. Click **Deploy**

✅ Done! Vercel gives you a free URL like `https://newgrad-job-agent.vercel.app` to share!

---

## 💻 Run Locally (Optional)

```bash
# Install dependencies
npm install

# Create your local env file
cp .env.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY

# Start the dev server
npm run dev
```

Open http://localhost:3000

---

## 📁 Project Structure

```
app/
  api/chat/route.js   ← Secure backend (API key lives here, never exposed)
  Agent.js            ← Frontend UI
  page.js             ← Next.js page entry
  layout.js           ← HTML shell
package.json
next.config.js
```

---

## ⚠️ API Cost Note
Each agent run uses Claude Sonnet + web search. Estimated cost: ~$0.01–0.03 per query.
Consider adding usage limits if sharing widely.
