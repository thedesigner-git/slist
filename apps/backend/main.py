import os
from contextlib import asynccontextmanager

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from sqlalchemy import text

from agent.runner import run_all
from db import engine
from routers import agent as agent_router
from routers import companies, criteria, users

scheduler = BackgroundScheduler(timezone="America/New_York")

# Allowed origins — extend with your production domain when deploying
_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
]
for _url in os.environ.get("PRODUCTION_URL", "").split(","):
    _url = _url.strip()
    if _url:
        _ALLOWED_ORIGINS.append(_url)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Safe migration: add per-preset criteria count columns if not present
    try:
        with engine.connect() as conn:
            conn.execute(text(
                "ALTER TABLE shortlist_scores "
                "ADD COLUMN IF NOT EXISTS growth_criteria_passed INTEGER, "
                "ADD COLUMN IF NOT EXISTS value_criteria_passed INTEGER"
            ))
            # Add company profile columns for description, location, employees, founded
            conn.execute(text(
                "ALTER TABLE companies "
                "ADD COLUMN IF NOT EXISTS description TEXT, "
                "ADD COLUMN IF NOT EXISTS location VARCHAR(200), "
                "ADD COLUMN IF NOT EXISTS employees INTEGER, "
                "ADD COLUMN IF NOT EXISTS founded VARCHAR(10)"
            ))
            conn.commit()
    except Exception as e:
        print(f"WARNING: Startup migration skipped — DB not reachable: {e}")

    scheduler.add_job(
        run_all,
        CronTrigger(hour=6, minute=0),
        id="daily_agent_run",
        replace_existing=True,
    )
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(title="Alphascreen API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next) -> Response:
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    return response

app.include_router(users.router)
app.include_router(agent_router.router)
app.include_router(criteria.router)
app.include_router(companies.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "alphascreen-api"}
