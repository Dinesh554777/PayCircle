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
│   │   ├── core/             # Config & settings
│   │   ├── models/           # SQLAlchemy models (Phase 2)
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── routes/           # API routers
│   │   ├── services/         # Business logic
│   │   └── utils/            # Shared helpers / error handlers
│   ├── requirements.txt
│   └── .env.example
├── ai/                       # AI/GenAI components
├── docs/                     # Documentation
├── tests/                    # Tests
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
```

Create your environment file (never commit the real one):

```bash
cp .env.example .env
```

Start PostgreSQL (requires Docker):

```bash
docker compose up -d db
```

Run the API server:

```bash
uvicorn app.main:app --reload
```

The API docs are available at http://localhost:8000/docs and the health check
at http://localhost:8000/api/health.
