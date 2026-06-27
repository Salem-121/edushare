# EduShare Backend

Node.js + Express + MySQL + Prisma API server.

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env
```

Required values:
- `DATABASE_URL` — your MySQL connection string
- `JWT_SECRET` — any long random string
- `ANTHROPIC_API_KEY` — from https://console.anthropic.com

### 3. Set up the database

Make sure MySQL is running, then run:
```bash
npx prisma migrate dev --name init
```

This creates all tables automatically.

### 4. Seed test data
```bash
node prisma/seed.js
```

This creates test accounts:
| Email | Password | Role |
|-------|----------|------|
| admin@edushare.com | admin123 | Admin |
| bob@edushare.com | teacher123 | Teacher |
| david@edushare.com | teacher123 | Teacher |
| alice@edushare.com | student123 | Student |
| eva@edushare.com | student123 | Student |

### 5. Start the server
```bash
npm run dev
```

Server runs on http://localhost:4000

Health check: http://localhost:4000/api/health

---

## API Endpoints

### Auth
| Method | URL | Description |
|--------|-----|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Get current user |

### Users (Admin only)
| Method | URL | Description |
|--------|-----|-------------|
| GET | /api/users | List all users |
| POST | /api/users | Create user |
| PUT | /api/users/:id | Update user |
| DELETE | /api/users/:id | Delete user |

### Modules
| Method | URL | Description |
|--------|-----|-------------|
| GET | /api/modules | List modules |
| POST | /api/modules | Create module (Admin) |
| PUT | /api/modules/:id | Update module (Admin) |
| DELETE | /api/modules/:id | Delete module (Admin) |

### Lessons
| Method | URL | Description |
|--------|-----|-------------|
| GET | /api/lessons | Browse all lessons |
| GET | /api/lessons/my | Teacher's own lessons |
| GET | /api/lessons/:id | Lesson detail |
| GET | /api/lessons/:id/download | Download file |
| POST | /api/lessons | Upload lesson (Teacher) |
| PUT | /api/lessons/:id | Edit lesson |
| DELETE | /api/lessons/:id | Delete lesson |

### Summaries
| Method | URL | Description |
|--------|-----|-------------|
| POST | /api/summaries/generate/:lessonId | Generate AI summary |
| GET | /api/summaries/lesson/:lessonId | Approved summaries |
| GET | /api/summaries/my | Student's summaries |
| GET | /api/summaries/pending | Pending reviews (Teacher) |
| PUT | /api/summaries/:id/review | Approve or reject |

### Notifications
| Method | URL | Description |
|--------|-----|-------------|
| GET | /api/notifications | Get my notifications |
| PUT | /api/notifications/:id/read | Mark as read |
| PUT | /api/notifications/read-all | Mark all as read |

---

## Deployment on Railway

1. Push this folder to a GitHub repo
2. Create a new Railway project
3. Add a MySQL database service
4. Connect your GitHub repo
5. Add environment variables in Railway dashboard
6. Railway auto-deploys on every push
