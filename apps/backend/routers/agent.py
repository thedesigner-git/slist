import json
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session

from agent.runner import run_all, run_single
from auth import get_current_user
from db import get_db
from models.agent_run import AgentRun

router = APIRouter(prefix="/api/agent", tags=["agent"])
SEED_PATH = Path(__file__).parent.parent / "data" / "seed_companies.json"


@router.post("/run")
def trigger_full_run(
    background_tasks: BackgroundTasks,
    _user=Depends(get_current_user),
):
    """Trigger a full agent run for all companies."""
    background_tasks.add_task(run_all)
    return {"status": "started", "message": "Agent run triggered"}


@router.post("/run/{ticker}")
def trigger_single_run(
    ticker: str,
    background_tasks: BackgroundTasks,
    _user=Depends(get_current_user),
):
    """Trigger a single-company refresh."""
    seed = json.loads(SEED_PATH.read_text())
    company = next((c for c in seed if c["ticker"] == ticker.upper()), None)
    market = company["market"] if company else "US"
    background_tasks.add_task(run_single, ticker.upper(), market)
    return {"status": "started", "ticker": ticker.upper()}


@router.get("/last-run")
def get_last_run(
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    """Return the most recent agent run or null."""
    run = (
        db.query(AgentRun)
        .order_by(AgentRun.started_at.desc())
        .first()
    )
    if run is None:
        return None
    return {
        "id": run.id,
        "started_at": run.started_at,
        "completed_at": run.completed_at,
        "status": run.status,
        "companies_total": run.companies_total,
        "companies_success": run.companies_success,
        "companies_failed": run.companies_failed,
    }


@router.get("/runs")
def list_runs(
    limit: int = 10,
    db: Session = Depends(get_db),
    _user=Depends(get_current_user),
):
    """Return recent agent run history."""
    runs = (
        db.query(AgentRun)
        .order_by(AgentRun.started_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": r.id,
            "started_at": r.started_at,
            "completed_at": r.completed_at,
            "status": r.status,
            "companies_total": r.companies_total,
            "companies_success": r.companies_success,
            "companies_failed": r.companies_failed,
        }
        for r in runs
    ]
