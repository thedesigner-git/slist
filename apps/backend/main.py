from contextlib import asynccontextmanager

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from agent.runner import run_all
from routers import agent as agent_router
from routers import criteria, users

scheduler = BackgroundScheduler(timezone="America/New_York")


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.add_job(
        run_all,
        CronTrigger(hour=6, minute=0),
        id="daily_agent_run",
        replace_existing=True,
    )
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(title="InvestIQ API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(agent_router.router)
app.include_router(criteria.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "investiq-api"}
