import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.deps import get_db, get_current_user
from app.models.models import User, Expense, Income
from app.schemas.schemas import DashboardSummaryResponse, ReportsSummaryResponse
from app.services.analytics_service import get_dashboard_summary, get_reports_summary

router = APIRouter()

@router.get("/dashboard", response_model=DashboardSummaryResponse)
def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    today = datetime.date.today()
    return get_dashboard_summary(db, current_user.id, today)

@router.get("/analytics", response_model=ReportsSummaryResponse)
def get_analytics(
    period: str = Query("this_month", pattern="^(today|this_week|this_month|last_month|custom)$"),
    start_date: Optional[datetime.date] = Query(None),
    end_date: Optional[datetime.date] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    today = datetime.date.today()
    if period == "today":
        sd, ed = today, today
    elif period == "this_week":
        sd = today - datetime.timedelta(days=today.weekday())
        ed = today
    elif period == "this_month":
        sd = today.replace(day=1)
        ed = today
    elif period == "last_month":
        first_of_this_month = today.replace(day=1)
        ed = first_of_this_month - datetime.timedelta(days=1)
        sd = ed.replace(day=1)
    else: # custom
        sd = start_date or today.replace(day=1)
        ed = end_date or today

    return get_reports_summary(db, current_user.id, sd, ed)

@router.get("/calendar")
def get_calendar_expenses(
    month: str = Query(..., pattern=r"^\d{4}-\d{2}$", description="Format: YYYY-MM"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    year, m = map(int, month.split("-"))
    start_date = datetime.date(year, m, 1)
    if m == 12:
        end_date = datetime.date(year + 1, 1, 1) - datetime.timedelta(days=1)
    else:
        end_date = datetime.date(year, m + 1, 1) - datetime.timedelta(days=1)

    daily_totals = db.query(
        Expense.date,
        func.coalesce(func.sum(Expense.amount_paise), 0).label("total_spent_paise"),
        func.count(Expense.id).label("transaction_count")
    ).filter(
        Expense.user_id == current_user.id,
        Expense.date >= start_date,
        Expense.date <= end_date
    ).group_by(Expense.date).all()

    calendar_data: Dict[str, Any] = {}
    for item in daily_totals:
        calendar_data[item.date.isoformat()] = {
            "date": item.date.isoformat(),
            "total_spent_paise": item.total_spent_paise,
            "transaction_count": item.transaction_count
        }

    return {
        "month": month,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "days": calendar_data
    }
