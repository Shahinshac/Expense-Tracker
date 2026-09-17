from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.models.models import User, Income, Account
from app.schemas.schemas import IncomeCreate, IncomeUpdate, IncomeResponse

router = APIRouter()

@router.get("/", response_model=List[IncomeResponse])
def get_incomes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    incomes = db.query(Income).filter(Income.user_id == current_user.id).order_by(Income.date.desc(), Income.id.desc()).all()
    return [IncomeResponse.model_validate(i) for i in incomes]

@router.post("/", response_model=IncomeResponse, status_code=status.HTTP_201_CREATED)
def create_income(
    income_in: IncomeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if income_in.account_id:
        acc = db.query(Account).filter(Account.id == income_in.account_id, Account.user_id == current_user.id).first()
        if acc:
            acc.balance_paise += income_in.amount_paise

    income = Income(
        user_id=current_user.id,
        source=income_in.source,
        amount_paise=income_in.amount_paise,
        date=income_in.date,
        account_id=income_in.account_id,
        note=income_in.note
    )
    db.add(income)
    db.commit()
    db.refresh(income)
    return IncomeResponse.model_validate(income)

@router.put("/{id}", response_model=IncomeResponse)
def update_income(
    id: int,
    income_in: IncomeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    income = db.query(Income).filter(Income.id == id, Income.user_id == current_user.id).first()
    if not income:
        raise HTTPException(status_code=404, detail="Income record not found")

    old_amount = income.amount_paise
    old_account_id = income.account_id

    if income_in.source is not None:
        income.source = income_in.source
    if income_in.amount_paise is not None:
        income.amount_paise = income_in.amount_paise
    if income_in.date is not None:
        income.date = income_in.date
    if income_in.account_id is not None:
        income.account_id = income_in.account_id
    if income_in.note is not None:
        income.note = income_in.note

    # Update account balances
    new_amount = income.amount_paise
    new_account_id = income.account_id

    if old_account_id == new_account_id and old_account_id is not None:
        diff = new_amount - old_amount
        acc = db.query(Account).filter(Account.id == old_account_id, Account.user_id == current_user.id).first()
        if acc:
            acc.balance_paise += diff
    else:
        if old_account_id:
            old_acc = db.query(Account).filter(Account.id == old_account_id, Account.user_id == current_user.id).first()
            if old_acc:
                old_acc.balance_paise -= old_amount
        if new_account_id:
            new_acc = db.query(Account).filter(Account.id == new_account_id, Account.user_id == current_user.id).first()
            if new_acc:
                new_acc.balance_paise += new_amount

    db.commit()
    db.refresh(income)
    return IncomeResponse.model_validate(income)

@router.delete("/{id}", status_code=status.HTTP_200_OK)
def delete_income(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    income = db.query(Income).filter(Income.id == id, Income.user_id == current_user.id).first()
    if not income:
        raise HTTPException(status_code=404, detail="Income record not found")

    if income.account_id:
        acc = db.query(Account).filter(Account.id == income.account_id, Account.user_id == current_user.id).first()
        if acc:
            acc.balance_paise -= income.amount_paise

    db.delete(income)
    db.commit()
    return {"message": "Income deleted successfully", "id": id}
