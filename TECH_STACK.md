# Tech Stack Rationale

The FIFA 2026 Prediction App was built using modern web development standards to ensure type-safety, rapid iteration, and maintainability. This document explains *why* specific tools were chosen.

## ⚛️ Frontend / Core Framework

### Next.js (App Router)
- **Why**: Next.js provides a robust foundation for React applications. The App Router allows us to fetch data directly in Server Components (e.g., querying the database securely before sending HTML to the client). This minimizes client-side JavaScript, improves load times, and heavily simplifies state management.
- **Server Actions**: We utilize Server Actions to handle form submissions without needing to write dedicated API endpoints, keeping frontend forms and backend validation tightly coupled and type-safe.

### Tailwind CSS & Shadcn/UI
- **Why**: Tailwind allows for incredibly fast styling without context-switching between CSS files. Shadcn/UI provides beautifully designed, accessible (Radix UI) component blueprints that are fully customizable, avoiding the bloat and rigidness of traditional component libraries like Material-UI or Bootstrap.

## 🔐 Authentication

### Auth.js (NextAuth) with Google OAuth
- **Why Auth.js instead of Clerk**: While Clerk is powerful, Auth.js is entirely free, open-source, and allows us to own our user data directly in our PostgreSQL database without vendor lock-in. 
- **Google Workspace Integration**: Utilizing Google OAuth provides a seamless, passwordless login experience, preventing users from needing to remember yet another password and keeping onboarding friction near zero.

## 🗄️ Database & ORM

### PostgreSQL
- **Why**: The application relies on relational data—Users have Predictions, Predictions belong to Matches, Matches belong to Teams. Relational databases like Postgres are uniquely suited for this structure, especially when querying aggregations like Leaderboard sums and rankings.

### Prisma ORM
- **Why**: Prisma provides unparalleled developer productivity and end-to-end type safety. By defining the schema in `schema.prisma`, Prisma generates a strictly typed TypeScript client. If a database column changes, TypeScript instantly flags all broken queries across the application. It also handles database migrations smoothly.

## 🤖 AI & External APIs

### WorldCup26 API (`worldcup26.ir`)
- **Why**: A free, dedicated REST API built specifically for World Cup tracking.
- **Benefits**: It requires no API keys, has no aggressive rate limits, and provides all necessary data (fixtures, live scores, standings, and stadium info) natively without parsing overly complex broader sports APIs.

### Hugging Face Inference API (Llama-3.1)
- **Why**: Generating Match Insights and Daily Highlights requires natural language generation. The Hugging Face serverless inference API allows us to utilize state-of-the-art open-source LLMs (like Meta's Llama 3) without the overhead or cost of hosting our own models or relying on expensive proprietary APIs like OpenAI.
