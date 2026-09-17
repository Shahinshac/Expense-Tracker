from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.deps import get_db, get_current_user
from app.models.models import User, Account, Expense, Income
from app.schemas.schemas import AccountCreate, AccountUpdate, AccountResponse

router = APIRouter()

@router.get("/", response_model=List[AccountResponse])
def get_accounts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    accounts = db.query(Account).filter(Account.user_id == current_user.id).order_by(Account.id.asc()).all()
    return [AccountResponse.model_validate(a) for a in accounts]

@router.post("/", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
def create_account(
    acc_in: AccountCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    account = Account(
        user_id=current_user.id,
        name=acc_in.name.strip(),
        type=acc_in.type,
        balance_paise=acc_in.balance_paise,
        color=acc_in.color or "#10b981",
        icon=acc_in.icon or "wallet"
    )
    db.add(account)
    db.commit()
    db.refresh(account)
    return AccountResponse.model_validate(account)

@router.put("/{id}", response_model=AccountResponse)
def update_account(
    id: int,
    acc_in: AccountUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    account = db.query(Account).filter(Account.id == id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    if acc_in.name is not None:
        account.name = acc_in.name.strip()
    if acc_in.type is not None:
        account.type = acc_in.type
    if acc_in.balance_paise is not None:
        account.balance_paise = acc_in.balance_paise
    if acc_in.color is not None:
        account.color = acc_in.color
    if acc_in.icon is not None:
        account.icon = acc_in.icon

    db.commit()
    db.refresh(account)
    return AccountResponse.model_validate(account)

@router.delete("/{id}", status_code=status.HTTP_200_OK)
def delete_account(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    account = db.query(Account).filter(Account.id == id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    # Nullify account_id on expenses and incomes to prevent foreign key errors
    db.query(Expense).filter(Expense.account_id == id).update({"account_id": None})
    db.query(Income).filter(Income.account_id == id).update({"account_id": None})

    db.delete(account)
    db.commit()
    return {"message": "Account deleted successfully", "id": id}
