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

The project is built as a college mini project: a single React frontend, a
single FastAPI backend, PostgreSQL for storage, and Python-based AI components.

## Technology Stack

| Layer      | Technology                        |
| ---------- | --------------------------------- |
| Frontend   | React.js (Vite)                   |
| Backend    | Python FastAPI                    |
| Database   | PostgreSQL                        |
| AI/GenAI   | Python (OpenAI/LLM-based helpers) |
| API        | REST (JSON)                       |
| Infra      | Docker Compose (local dev)        |
| Versioning | Git + GitHub                      |

## Planned Modules

- User Login & Registration
- User Profile Management
- Group Creation & Member Management
- Expense Recording & Splitting (equal/custom/percentage)
- Balance Calculation & Settlement Tracking
- Transaction History
- AI Expense Categorization
- AI Spending Insights & Personalized Suggestions
- AI Chatbot
- Expense Analysis / Prediction
- Notifications & Reminders
- Dashboard & Reports
- Basic Admin Management

## Project Structure

```
PayCircle/
├── frontend/                 # React application
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app entrypoint
│   │   ├── core/             # Config, settings & database
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── routes/           # API routers
│   │   ├── services/         # Business logic
│   │   └── utils/            # Shared helpers / error handlers
│   ├── alembic/              # Database migrations
│   ├── alembic.ini
│   ├── requirements.txt
│   ├── requirements-dev.txt  # Test dependencies
│   └── .env.example
├── ai/                       # AI/GenAI components
├── docs/                     # Documentation
├── tests/                    # Tests
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
python -m venv venv

# Windows
venv\Scripts\activate

# Linux / macOS
source venv/bin/activate

pip install -r requirements.txt
pip install -r requirements-dev.txt   # test dependencies
```

Create your environment file (never commit the real one):

```bash
cp .env.example .env
```

Start PostgreSQL (local native install, default):

```bash
# Create the database (if it does not exist yet)
psql -U postgres -h localhost -p 5432 -c "CREATE DATABASE `"PayCircle`" OWNER postgres;"
```

or with Docker (alternative, published on host port 5433):

```bash
docker compose up -d db
```

> By default `DATABASE_URL` points at a local PostgreSQL on port 5432. If you
> run the Docker database instead, use
> `postgresql://paycircle:paycircle@localhost:5433/paycircle`. Adjust the
> credentials in `backend/.env` (never commit the real file).

Apply database migrations (creates all tables):

```bash
alembic upgrade head
```

To generate a new migration after changing models:

```bash
alembic revision --autogenerate -m "describe the change"
alembic upgrade head
```

Run the API server:

```bash
uvicorn app.main:app --reload
```

The API docs are available at http://localhost:8000/docs and the health check
at http://localhost:8000/api/health.

## Running Tests

```bash
cd backend
pip install -r requirements-dev.txt
python -m pytest
```

Tests cover the health endpoint, database connectivity, model creation, and
the main user → group → expense → settlement → transaction flow.

## Database Models

| Model         | Purpose                                      |
| ------------- | -------------------------------------------- |
| `User`        | People using the app                         |
| `Group`       | Shared expense group                         |
| `GroupMember` | Membership of a user in a group              |
| `Expense`     | An expense paid by one member                |
| `ExpenseSplit`| How an expense is divided among members      |
| `Settlement`  | A payment made to settle a balance           |
| `Transaction` | History log of expenses and settlements      |

## API Endpoints

| Method | Path                              | Description                     |
| ------ | --------------------------------- | ------------------------------- |
| GET    | `/api/health`                     | Health check incl. DB status    |
| GET    | `/api/db/check`                   | DB connectivity + table list    |
| POST   | `/api/users`                      | Create a user                   |
| GET    | `/api/users`                      | List users                      |
| GET    | `/api/users/{user_id}`            | Get a user                      |
| POST   | `/api/groups`                     | Create a group (owner added)    |
| GET    | `/api/groups`                     | List groups                     |
| GET    | `/api/groups/{group_id}`          | Get a group with its members    |
| POST   | `/api/groups/{group_id}/members`  | Add a member                    |
| POST   | `/api/groups/{group_id}/expenses` | Create an expense with splits   |
| GET    | `/api/groups/{group_id}/expenses` | List a group's expenses         |
| POST   | `/api/groups/{group_id}/settlements` | Record a settlement         |
| GET    | `/api/groups/{group_id}/settlements` | List a group's settlements   |
| GET    | `/api/groups/{group_id}/transactions` | List a group's transaction history |
| GET    | `/api/ai/insights`                    | AI spending insights & personalized suggestions |
