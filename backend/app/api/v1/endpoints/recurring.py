from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.models.models import User, RecurringExpense
from app.schemas.schemas import RecurringExpenseCreate, RecurringExpenseUpdate, RecurringExpenseResponse
from app.services.recurring_service import process_due_recurring_expenses

router = APIRouter()

@router.get("/", response_model=List[RecurringExpenseResponse])
def get_recurring_expenses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Process any due first
    process_due_recurring_expenses(db, current_user.id)
    items = db.query(RecurringExpense).filter(RecurringExpense.user_id == current_user.id).order_by(RecurringExpense.next_due_date.asc()).all()
    return [RecurringExpenseResponse.model_validate(i) for i in items]

@router.post("/", response_model=RecurringExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_recurring_expense(
    rec_in: RecurringExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = RecurringExpense(
        user_id=current_user.id,
        name=rec_in.name.strip(),
        category_id=rec_in.category_id,
        account_id=rec_in.account_id,
        amount_paise=rec_in.amount_paise,
        frequency=rec_in.frequency,
        start_date=rec_in.start_date,
        end_date=rec_in.end_date,
        payment_method=rec_in.payment_method,
        next_due_date=rec_in.start_date,
        is_active=rec_in.is_active
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    
    # Process if already due
    process_due_recurring_expenses(db, current_user.id)
    db.refresh(item)
    return RecurringExpenseResponse.model_validate(item)

@router.put("/{id}", response_model=RecurringExpenseResponse)
def update_recurring_expense(
    id: int,
    rec_in: RecurringExpenseUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(RecurringExpense).filter(RecurringExpense.id == id, RecurringExpense.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Recurring expense not found")

    if rec_in.name is not None:
        item.name = rec_in.name.strip()
    if rec_in.category_id is not None:
        item.category_id = rec_in.category_id
    if rec_in.account_id is not None:
        item.account_id = rec_in.account_id
    if rec_in.amount_paise is not None:
        item.amount_paise = rec_in.amount_paise
    if rec_in.frequency is not None:
        item.frequency = rec_in.frequency
    if rec_in.start_date is not None:
        item.start_date = rec_in.start_date
    if rec_in.end_date is not None:
        item.end_date = rec_in.end_date
    if rec_in.payment_method is not None:
        item.payment_method = rec_in.payment_method
    if rec_in.is_active is not None:
        item.is_active = rec_in.is_active

    db.commit()
    db.refresh(item)
    return RecurringExpenseResponse.model_validate(item)

@router.delete("/{id}", status_code=status.HTTP_200_OK)
def delete_recurring_expense(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    item = db.query(RecurringExpense).filter(RecurringExpense.id == id, RecurringExpense.user_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Recurring expense not found")

    db.delete(item)
    db.commit()
    return {"message": "Recurring expense rule deleted", "id": id}

@router.post("/process", status_code=status.HTTP_200_OK)
def trigger_process_recurring(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    count = process_due_recurring_expenses(db, current_user.id)
    return {"message": f"Processed {count} due recurring expenses", "count": count}
