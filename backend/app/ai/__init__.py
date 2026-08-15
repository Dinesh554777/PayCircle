"""AI package: models the AI-ready capabilities of PayCircle.

Layout
------
categorization/
    Groq-backed expense categorization with keyword fallback.
insights/
    AI spending insights built on the analytics service.
chatbot/
    Conversational expense assistant (Groq + local fallback).
prediction/
    Future spending estimation built on the analytics service.
assistant/
    Lightweight agentic assistant that answers questions via tools.
safety.py
    Rules and helpers that keep AI access scoped to the authenticated user.

Everything here operates on data retrieved by services; the AI layer never
queries the database directly and never exposes passwords or API keys.
"""
