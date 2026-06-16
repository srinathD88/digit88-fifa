# FIFA 2026 Prediction App

Welcome to the FIFA 2026 Prediction App! This is a full-stack Next.js web application built to allow football fans to predict match outcomes, climb the leaderboard, and stay updated with AI-generated match insights and daily highlights during the 2026 World Cup.

## 🌟 Features

- **Google Authentication**: Secure and seamless sign-in using Google Workspace accounts via Auth.js.
- **Team Selection**: Users choose their favorite national team during onboarding, customizing their dashboard experience.
- **Match Predictions**: Predict the home goals, away goals, and maximum goals by a single player for every upcoming match.
- **Dynamic Leaderboard**: Climb the ranks based on prediction accuracy (automatically scored when match results are synced) and administrative bonus points.
- **AI Highlights**: Daily generated recaps of tournament action using the Hugging Face Inference API.
- **Match Insights**: On-demand AI insights about venues, team histories, and standout players for any given match.
- **Admin Dashboard**: Comprehensive tools to manage users, manually trigger API syncs, generate highlights, and override points.
- **WorldCup26 Sync**: Automated background synchronization of fixtures, live scores, and results via the free `worldcup26.ir` API.

---

## 📸 Screenshots

### Login Page
<img width="3048" height="1542" alt="image" src="https://github.com/user-attachments/assets/29c5cc8b-fad1-4421-89f3-17dddddb7dce" />

### Match Dashboard
<img width="3018" height="1718" alt="image" src="https://github.com/user-attachments/assets/2245afba-78d2-4838-8bda-0930a70b3e51" />

### Leaderboard
<img width="2920" height="1712" alt="image" src="https://github.com/user-attachments/assets/c33be656-6d82-42a8-9ec1-3e85ba8424d4" />

### Admin Portal
<img width="3014" height="1378" alt="image" src="https://github.com/user-attachments/assets/52064802-e4d2-435e-a574-93422d5e402c" />

---

## ⚙️ Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or newer)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- A PostgreSQL database (local or cloud-hosted like Supabase/Neon).

## 🚀 Setup & Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/fifa-2026-predictions.git
   cd fifa-2026-predictions
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Database Setup**
   Ensure your database is running, then apply the Prisma schema to create the tables:
   ```bash
   npx prisma db push
   ```

## 🔐 Environment Variables

Create a `.env` file in the root directory. You must provide the following variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Your PostgreSQL connection string. |
| `AUTH_SECRET` | A random 32-character string for NextAuth encryption. Generate one using `openssl rand -base64 32`. |
| `GOOGLE_CLIENT_ID` | Your Google OAuth App Client ID. |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth App Client Secret. |
| `AI_MODEL` | The Hugging Face model identifier (e.g., `meta-llama/Meta-Llama-3.1-8B-Instruct`). |
| `HUGGINGFACE_API_KEY` | Your Hugging Face Inference API token. |
| `CRON_SYNC_FIXTURES` | Schedule for syncing fixtures (Default: `"0 0 * * *"`). |
| `CRON_SYNC_RESULTS` | Schedule for syncing live match results (Default: `"*/15 * * * *"`). |
| `CRON_PROCESS_SCORES` | Schedule for evaluating and awarding points (Default: `"*/20 * * * *"`). |
| `CRON_AI_HIGHLIGHTS` | Schedule for daily AI recap generation (Default: `"0 5 * * *"`). |

## 🏃 Running Locally

To start the development server with automated background CRON jobs enabled:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
