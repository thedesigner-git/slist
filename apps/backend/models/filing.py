from datetime import date, datetime
from sqlalchemy import String, Date, DateTime, Integer, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column
from db import Base


class Filing(Base):
    __tablename__ = "filings"

    id: Mapped[int] = mapped_column(primary_key=True)
    company_id: Mapped[int] = mapped_column(Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    form_type: Mapped[str] = mapped_column(String(10), nullable=False)   # 10-Q or 10-K
    accession_number: Mapped[str] = mapped_column(String(25), unique=True, nullable=False)
    filed_date: Mapped[date] = mapped_column(Date, nullable=True)
    doc_url: Mapped[str] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
