import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.models.models import User, Expense
from app.services.export_service import generate_csv_export, generate_excel_export

router = APIRouter()

@router.get("/csv")
def export_csv(
    start_date: Optional[datetime.date] = Query(None),
    end_date: Optional[datetime.date] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Expense).filter(Expense.user_id == current_user.id)
    if start_date:
        query = query.filter(Expense.date >= start_date)
    if end_date:
        query = query.filter(Expense.date <= end_date)
    
    expenses = query.order_by(Expense.date.desc(), Expense.id.desc()).all()
    csv_data = generate_csv_export(expenses)

    filename = f"expenses_{current_user.full_name.replace(' ', '_')}_{datetime.date.today().isoformat()}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/excel")
def export_excel(
    start_date: Optional[datetime.date] = Query(None),
    end_date: Optional[datetime.date] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    today = datetime.date.today()
    sd = start_date or today.replace(day=1)
    ed = end_date or today

    query = db.query(Expense).filter(Expense.user_id == current_user.id, Expense.date >= sd, Expense.date <= ed)
    expenses = query.order_by(Expense.date.desc(), Expense.id.desc()).all()

    excel_file = generate_excel_export(expenses, sd, ed)
    filename = f"expense_report_{sd.isoformat()}_to_{ed.isoformat()}.xlsx"

    return Response(
        content=excel_file.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
