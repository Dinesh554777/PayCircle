# PayCircle

**PayCircle – AI-Powered Shared Expense Management System**

## Problem Statement

Splitting bills, rent, trips, and group outings is tedious. Friends and roommates
constantly argue over who owes whom, and there is no simple way to see spending
patterns, get reminders to settle up, or understand where money goes. Existing
expense splitter apps are generic and lack personalized, AI-driven guidance.

## Project Overview

PayCircle is a web application that lets a group of people record shared
expenses, split them fairly, and track who owes whom. On top of the core
expense-splitting workflow, it uses AI/GenAI to:

- Automatically categorize expenses.
- Provide personalized spending insights and suggestions.
- Answer questions through an AI chatbot.
- Predict future spending based on history.

It also includes role-based admin management, JWT authentication, and automatic
notifications so members stay informed when expenses and settlements happen.

The project is built as a college mini project: a single React frontend, a
single FastAPI backend, PostgreSQL for storage (SQLite also supported for quick
local runs), and Python-based AI components.

## Features

- User registration, login (JWT), and profile management
- Group creation, joining, and member management (add/remove/leave)
- Expense recording with equal, exact, and percentage split methods
- Split calculation preview before saving
- Balance calculation across a group (who owes whom)
- Settlement recording with pending/completed status
- Transaction history feed (expenses + settlements)
- Dashboard with spending overview and recent activity
- AI expense categorization (auto when no category is chosen)
- AI spending insights and personalized suggestions
- AI chatbot that answers questions about your own expenses
- AI next-month spending prediction
- Notifications with unread count and mark-as-read (bell in the header)
- Admin dashboard with system stats, user management, and group overview
- Input validation, centralized error handling, and secure password hashing

## Technology Stack

| Layer      | Technology                              |
| ---------- | --------------------------------------- |
| Frontend   | React.js (Vite)                         |
| Backend    | Python FastAPI                          |
| Database   | PostgreSQL (dev) / SQLite (tests, quick run) via SQLAlchemy |
| Auth       | JWT (HS256) + bcrypt password hashing   |
| AI/GenAI   | Groq LLM (Llama 3.3 70B) with local rule-based fallback |
| Migrations | Alembic                                 |
| API        | REST (JSON), auto docs at `/docs`       |
| Infra      | Docker Compose (optional DB)            |
| Versioning | Git + GitHub                            |

## Project Structure

```
PayCircle/
├── frontend/                  # React application (Vite)
│   └── src/
│       ├── pages/             # Route-level screens
│       ├── components/        # Reusable UI + AI widgets
│       ├── context/           # Auth context
│       ├── api/               # API client
│       ├── utils/             # Shared formatters
│       └── styles/            # Global CSS
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app entrypoint
│   │   ├── core/              # Config, security, database
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── routes/            # API routers
│   │   ├── services/          # Business logic
│   │   └── utils/             # Bootstrap, error handlers
│   ├── ai/                    # AI/GenAI components (categorizer, chatbot)
│   ├── alembic/               # Database migrations
│   ├── alembic.ini
│   ├── requirements.txt
│   ├── requirements-dev.txt   # Test dependencies
│   ├── Dockerfile
│   └── .env.example
├── tests/                     # Pytest suite
├── docs/                      # Documentation
├── pytest.ini
├── docker-compose.yml
└── README.md
```

## How to Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## How to Run the Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# Linux / macOS
source .venv/bin/activate

pip install -r requirements.txt
pip install -r requirements-dev.txt   # test dependencies
```

Create your environment file (never commit the real one):

```bash
cp .env.example .env
```

Edit `backend/.env` and set at least `SECRET_KEY`. Other variables:

| Variable        | Description                                                    |
| --------------- | -------------------------------------------------------------- |
| `DATABASE_URL`  | SQLAlchemy database URL (PostgreSQL by default, SQLite allowed) |
| `SECRET_KEY`    | Secret used to sign JWT tokens (required)                      |
| `AI_API_KEY`    | Groq API key. Optional: AI falls back to local heuristics      |
| `DEBUG`         | `true`/`false`                                                 |
| `CORS_ORIGINS`  | Comma-separated list of allowed frontend origins               |
| `ADMIN_EMAILS`  | Comma-separated emails promoted to admin on startup            |

### Database

Option A – SQLite (simplest, no install):

```bash
# backend/.env
DATABASE_URL=sqlite:///paycircle.db
```

Option B – PostgreSQL (native install):

```bash
psql -U postgres -h localhost -p 5432 -c "CREATE DATABASE PayCircle OWNER postgres;"
```

Option C – PostgreSQL via Docker (published on host port 5433):

```bash
docker compose up -d db
# backend/.env
DATABASE_URL=postgresql://paycircle:paycircle@localhost:5433/paycircle
```

Apply migrations (creates all tables):

```bash
alembic upgrade head
```

To generate a new migration after changing models:

```bash
alembic revision --autogenerate -m "describe the change"
alembic upgrade head
```

### Run the API server

```bash
uvicorn app.main:app --reload
```

- API docs: http://localhost:8000/docs
- Health check: http://localhost:8000/api/health
- On startup, users listed in `ADMIN_EMAILS` are promoted to admin.

## AI Features

All AI components live in `backend/ai/` and are used through services in
`backend/app/services/`. When no `AI_API_KEY` is configured, they degrade
gracefully to local rule-based logic instead of failing:

- **Expense categorization** – `ai/categorizer.py`: classifies expense titles
  into categories (Food, Transport, Entertainment, Shopping, Utilities,
  Healthcare, Education, Travel, Rent, Other).
- **Spending insights** – `backend/app/services/insights_service.py`:
  summarizes spending and gives personalized suggestions.
- **Chatbot** – `ai/chatbot.py`: answers questions about your expenses using a
  rule-based engine with LLM support.
- **Prediction** – `backend/app/services/prediction_service.py`: estimates
  next-month spending from history (needs at least ~2 months of data).

## Running Tests

```bash
cd backend
pip install -r requirements-dev.txt
python -m pytest
```

The suite (127 tests) uses an in-memory SQLite database and stubs out all AI
network calls, so it runs offline and deterministically. It covers:

- Authentication (register, login, disabled users, password hashing, protected
  endpoints)
- Groups, memberships, expenses, splits, balances, settlements, transactions
- Dashboard, AI insights, chatbot, prediction, categorization
- Notifications and admin endpoints
- Health check, database connectivity, and models

## Database Models

| Model            | Purpose                                      |
| ---------------- | -------------------------------------------- |
| `User`           | People using the app (with `is_admin`)       |
| `Group`          | Shared expense group                         |
| `GroupMember`    | Membership of a user in a group              |
| `Expense`        | An expense paid by one member                |
| `ExpenseSplit`   | How an expense is divided among members      |
| `Settlement`     | A payment made to settle a balance           |
| `Transaction`    | History log of expenses and settlements      |
| `Notification`   | Activity alerts for a user (read/unread)     |

## API Endpoints

All endpoints live under `/api`. Auth-protected endpoints require
`Authorization: Bearer <token>`.

| Method | Path                                | Description                                  | Auth |
| ------ | ----------------------------------- | -------------------------------------------- | ---- |
| GET    | `/health`                           | Health check incl. DB status                 | –    |
| GET    | `/db/check`                         | DB connectivity + table list                 | –    |
| POST   | `/auth/register`                    | Register (name, email, password)             | –    |
| POST   | `/auth/login`                       | Login, returns JWT + user                    | –    |
| POST   | `/users`                            | Create a user                                | –    |
| GET    | `/users`                            | List users (admin directory)                 | ✓    |
| GET    | `/users/me`                         | Current user profile                         | ✓    |
| PUT    | `/users/me`                         | Update profile / password                    | ✓    |
| GET    | `/users/{user_id}`                  | Get a user                                   | ✓    |
| POST   | `/groups`                           | Create a group (owner added)                 | ✓    |
| GET    | `/groups`                           | List the user's groups                       | ✓    |
| GET    | `/groups/{group_id}`                | Get a group with its members                 | ✓    |
| GET    | `/groups/{group_id}/members`        | List members                                 | ✓    |
| POST   | `/groups/{group_id}/members`        | Add a member by email                        | ✓    |
| DELETE | `/groups/{group_id}/members/{user_id}` | Remove a member                            | ✓    |
| DELETE | `/groups/{group_id}/leave`          | Leave a group                                | ✓    |
| POST   | `/groups/{group_id}/expenses`       | Create an expense with splits                | ✓    |
| GET    | `/groups/{group_id}/expenses`       | List a group's expenses                      | ✓    |
| POST   | `/groups/{group_id}/expenses/calculate` | Preview split amounts without saving      | ✓    |
| GET    | `/groups/{group_id}/expenses/{expense_id}` | Get one expense                        | ✓    |
| PUT    | `/groups/{group_id}/expenses/{expense_id}` | Update an expense                     | ✓    |
| DELETE | `/groups/{group_id}/expenses/{expense_id}` | Delete an expense                     | ✓    |
| GET    | `/groups/{group_id}/balances`       | Who owes whom                               | ✓    |
| POST   | `/groups/{group_id}/settlements`    | Record a settlement                          | ✓ |
| GET    | `/groups/{group_id}/settlements`    | List settlements                             | ✓ |
| PATCH  | `/groups/{group_id}/settlements/{settlement_id}` | Update a settlement (e.g. mark completed) | ✓ |
| GET    | `/groups/{group_id}/transactions`   | Transaction history feed                     | ✓    |
| GET    | `/dashboard`                        | Spending overview + recent activity          | ✓    |
| GET    | `/notifications`                    | List notifications                           | ✓    |
| GET    | `/notifications/unread-count`       | Unread notification count                    | ✓    |
| POST   | `/notifications/read-all`           | Mark all notifications read                  | ✓    |
| GET    | `/admin/stats`                      | System statistics                            | ✓ + admin |
| GET    | `/admin/users`                      | All users with group/expense counts          | ✓ + admin |
| GET    | `/admin/groups`                     | All groups with member/expense counts        | ✓ + admin |
| PATCH  | `/admin/users/{user_id}/status`     | Enable/disable a user account                | ✓ + admin |
| GET    | `/ai/insights`                      | AI spending insights & suggestions           | ✓ |
| POST   | `/ai/chat`                          | AI chatbot answer for a user question        | ✓ |
| GET    | `/ai/prediction`                    | Next-month spending estimate                 | ✓ |

## Admin & Notifications

- **Admin bootstrap**: any email listed in `ADMIN_EMAILS` is promoted to admin
  automatically when the backend starts.
- **Admin endpoints** are protected by an `is_admin` check on top of JWT auth.
- **Notifications** are created automatically when you are added to a group,
  when an expense is added to one of your groups, and when a settlement is
  recorded. Unread counts appear on the bell icon in the app header.

## Security Notes

- Passwords are hashed with bcrypt; plaintext is never stored or returned.
- JWT tokens are signed with `SECRET_KEY` (HS256) and expire after 24 hours.
- Disabled users cannot log in, and their existing tokens are rejected.
- CORS is restricted to the origins in `CORS_ORIGINS`.
- The real `backend/.env` is git-ignored; only `.env.example` is committed.
