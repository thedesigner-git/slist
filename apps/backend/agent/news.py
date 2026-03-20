import logging

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from models.news import News

logger = logging.getLogger(__name__)


def save_news(db: Session, company_id: int, news_items: list[dict]) -> int:
    """Insert news items, skipping duplicates by URL. Returns count saved."""
    if not news_items:
        return 0
    saved = 0
    for item in news_items:
        if not item.get("url"):
            continue
        stmt = pg_insert(News).values(**item)
        stmt = stmt.on_conflict_do_nothing(index_elements=["url"])
        db.execute(stmt)
        saved += 1
    db.commit()
    return saved
