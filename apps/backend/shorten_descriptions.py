"""
Shorten company descriptions to max 4 sentences.
Takes the first 4 sentences from the existing longBusinessSummary.

Run: python shorten_descriptions.py
"""
import re
import logging
from sqlalchemy.orm import Session as OrmSession
from db import Session as DBSession
from models.company import Company

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def split_sentences(text: str) -> list[str]:
    """Split text into sentences using '. ' as delimiter, skipping common abbreviations."""
    # Simple approach: split on '. ' then rejoin
    abbrevs = {'Inc', 'Corp', 'Ltd', 'Co', 'Mr', 'Ms', 'Dr', 'Jr', 'Sr', 'vs', 'etc', 'approx'}
    parts = re.split(r'\.\s+', text)
    sentences = []
    buf = ""
    for p in parts:
        if buf:
            buf += ". " + p
        else:
            buf = p
        # Check if this ends with an abbreviation
        last_word = buf.rsplit(None, 1)[-1] if buf else ""
        if last_word.rstrip('.') in abbrevs:
            continue
        sentences.append(buf.rstrip('.') + '.')
        buf = ""
    if buf:
        sentences.append(buf.rstrip('.') + '.')
    return sentences


def shorten():
    db: OrmSession = DBSession()
    try:
        companies = db.query(Company).filter(Company.description.isnot(None)).all()
        logger.info("Processing %d companies", len(companies))

        for company in companies:
            if not company.description:
                continue

            sentences = split_sentences(company.description)
            if len(sentences) <= 4:
                logger.info("%s — already short (%d sentences)", company.ticker, len(sentences))
                continue

            short = " ".join(sentences[:4])
            company.description = short
            logger.info("%s — trimmed from %d to 4 sentences", company.ticker, len(sentences))

        db.commit()
        logger.info("Done")
    finally:
        db.close()


if __name__ == "__main__":
    shorten()
