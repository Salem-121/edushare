# EduShare

EduShare is a web platform where **teachers** share lesson materials and **students**
learn from them — with AI-generated summaries and quizzes to help studying, plus an
**admin** area to manage everyone. It's split into two parts that run together:

- **`edushare-frontend/`** — the website users see (React + Vite + Tailwind CSS)
- **`edushare-backend/`** — the server/API that stores data and handles logins (Node.js + Express + MySQL)

---

## What it can do

- 👩‍🏫 **Teachers** upload lessons (PDF / Word files), organized into modules and *filières* (study tracks).
- 🎓 **Students** browse and download lessons, take quizzes, and request AI summaries.
- 🤖 **AI summaries & quizzes** — generated from lesson content by an LLM; summaries need teacher approval before students see them.
- 💬 **Chat** between users.
- 🔔 **Notifications** for things like new lessons or approved summaries.
- 🛡️ **Admin dashboard** to manage users, modules, and view site stats.
- 🔐 **Secure login** with JWT tokens and role-based access (Admin / Teacher / Student).

---

## Tech stack

| Part | Technologies |
|------|--------------|
| Frontend | React 18, Vite, Tailwind CSS, React Router, Axios |
| Backend | Node.js, Express, Prisma ORM, JWT auth, Multer (file uploads) |
| Database | MySQL 8 |
| AI | LLM via API key (Groq / Anthropic / Google) |
| Deployment | Docker / Docker Compose |

---

## Quick start

You need **Node.js** and a **MySQL** database installed (or use Docker — see below).

### Option 1 — Run everything with Docker (easiest)

This starts the database, backend, and frontend together with one command.

1. Create a `.env` file in the project root with at least:
   ```env
   DB_PASSWORD=changeme
   JWT_SECRET=replace-with-a-long-random-string-at-least-32-chars
   GROQ_API_KEY=your-key-from-https://console.groq.com/keys
   ```
2. Start it:
   ```bash
   docker compose up --build
   ```
3. Open the app:
   - Frontend → http://localhost:5173
   - Backend API → http://localhost:4000

### Option 2 — Run each part manually

**Backend** (see [`edushare-backend/README.md`](edushare-backend/README.md) for full details):
```bash
cd edushare-backend
npm install
cp .env.example .env      # then fill in DATABASE_URL, JWT_SECRET, GROQ_API_KEY
npx prisma migrate dev    # create database tables
node prisma/seed.js       # add test accounts (see below)
npm run dev               # runs on http://localhost:4000
```

**Frontend** (in a second terminal):
```bash
cd edushare-frontend
npm install
npm run dev               # runs on http://localhost:5173
```

---

## Test accounts

After seeding the database (`node prisma/seed.js`), you can log in with:

| Email | Password | Role |
|-------|----------|------|
| admin@edushare.com | admin123 | Admin |
| bob@edushare.com | teacher123 | Teacher |
| alice@edushare.com | student123 | Student |

> ⚠️ These are **demo accounts** — change or remove them before any real deployment.

---

## Project structure

```
edushare/
├── docker-compose.yml      # runs db + backend + frontend together
├── edushare-backend/       # Express API, Prisma schema, routes, controllers
│   ├── src/                # application code
│   ├── prisma/             # database schema, migrations, seed data
│   └── README.md           # backend setup + full API endpoint list
└── edushare-frontend/      # React app
    └── src/                # pages, components, contexts, services
```

For the complete list of API endpoints, see the backend README:
[`edushare-backend/README.md`](edushare-backend/README.md).

---

## Important notes

- **Secrets are not committed.** Each part has a `.env` file (ignored by git). Copy from the
  provided `.env.example` and fill in your own values.
- Uploaded files live in `edushare-backend/uploads/` and are also not committed.
