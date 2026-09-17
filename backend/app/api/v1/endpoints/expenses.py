import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.deps import get_db, get_current_user
from app.models.models import User, Expense, Category, Account
from app.schemas.schemas import ExpenseCreate, ExpenseUpdate, ExpenseResponse

router = APIRouter()

@router.get("/", response_model=List[ExpenseResponse])
def get_expenses(
    q: Optional[str] = Query(None, description="Search term in description or note"),
    category_id: Optional[int] = Query(None),
    account_id: Optional[int] = Query(None),
    payment_method: Optional[str] = Query(None),
    date_from: Optional[datetime.date] = Query(None),
    date_to: Optional[datetime.date] = Query(None),
    min_amount: Optional[int] = Query(None, description="In paise"),
    max_amount: Optional[int] = Query(None, description="In paise"),
    sort_by: str = Query("newest", pattern="^(newest|oldest|highest|lowest)$"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Expense).filter(Expense.user_id == current_user.id)

    if q:
        search_pattern = f"%{q.strip()}%"
        query = query.filter(
            or_(
                Expense.description.ilike(search_pattern),
                Expense.note.ilike(search_pattern),
                Expense.payment_method.ilike(search_pattern)
            )
        )
    if category_id:
        query = query.filter(Expense.category_id == category_id)
    if account_id:
        query = query.filter(Expense.account_id == account_id)
    if payment_method:
        query = query.filter(Expense.payment_method == payment_method)
    if date_from:
        query = query.filter(Expense.date >= date_from)
    if date_to:
        query = query.filter(Expense.date <= date_to)
    if min_amount is not None:
        query = query.filter(Expense.amount_paise >= min_amount)
    if max_amount is not None:
        query = query.filter(Expense.amount_paise <= max_amount)

    if sort_by == "newest":
        query = query.order_by(Expense.date.desc(), Expense.id.desc())
    elif sort_by == "oldest":
        query = query.order_by(Expense.date.asc(), Expense.id.asc())
    elif sort_by == "highest":
        query = query.order_by(Expense.amount_paise.desc(), Expense.id.desc())
    elif sort_by == "lowest":
        query = query.order_by(Expense.amount_paise.asc(), Expense.id.asc())

    expenses = query.offset(offset).limit(limit).all()
    return [ExpenseResponse.model_validate(e) for e in expenses]

@router.post("/", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def create_expense(
    expense_in: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify category
    cat = db.query(Category).filter(
        Category.id == expense_in.category_id,
        or_(Category.user_id == current_user.id, Category.user_id == None)
    ).first()
    if not cat:
        raise HTTPException(status_code=400, detail="Invalid category selected.")

    # Optional account verification & balance deduction
    if expense_in.account_id:
        account = db.query(Account).filter(
            Account.id == expense_in.account_id,
            Account.user_id == current_user.id
        ).first()
        if account:
            account.balance_paise -= expense_in.amount_paise

    expense = Expense(
        user_id=current_user.id,
        category_id=expense_in.category_id,
        account_id=expense_in.account_id,
        amount_paise=expense_in.amount_paise,
        date=expense_in.date,
        time=expense_in.time or datetime.datetime.now().strftime("%H:%M"),
        payment_method=expense_in.payment_method,
        description=expense_in.description,
        note=expense_in.note,
        attachment_url=expense_in.attachment_url,
        is_recurring_instance=False
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return ExpenseResponse.model_validate(expense)

@router.get("/{id}", response_model=ExpenseResponse)
def get_expense(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    expense = db.query(Expense).filter(Expense.id == id, Expense.user_id == current_user.id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return ExpenseResponse.model_validate(expense)

@router.put("/{id}", response_model=ExpenseResponse)
def update_expense(
    id: int,
    expense_in: ExpenseUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    expense = db.query(Expense).filter(Expense.id == id, Expense.user_id == current_user.id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    old_amount = expense.amount_paise
    old_account_id = expense.account_id

    # Validate category if changed
    if expense_in.category_id is not None:
        cat = db.query(Category).filter(
            Category.id == expense_in.category_id,
            or_(Category.user_id == current_user.id, Category.user_id == None)
        ).first()
        if not cat:
            raise HTTPException(status_code=400, detail="Invalid category selected.")
        expense.category_id = expense_in.category_id

    if expense_in.amount_paise is not None:
        expense.amount_paise = expense_in.amount_paise
    if expense_in.date is not None:
        expense.date = expense_in.date
    if expense_in.time is not None:
        expense.time = expense_in.time
    if expense_in.payment_method is not None:
        expense.payment_method = expense_in.payment_method
    if expense_in.description is not None:
        expense.description = expense_in.description
    if expense_in.note is not None:
        expense.note = expense_in.note
    if expense_in.attachment_url is not None:
        expense.attachment_url = expense_in.attachment_url
    if expense_in.account_id is not None:
        expense.account_id = expense_in.account_id

    # Balance adjustment
    new_account_id = expense.account_id
    new_amount = expense.amount_paise

    if old_account_id == new_account_id and old_account_id is not None:
        diff = new_amount - old_amount
        acc = db.query(Account).filter(Account.id == old_account_id, Account.user_id == current_user.id).first()
        if acc:
            acc.balance_paise -= diff
    else:
        # Revert old account
        if old_account_id:
            old_acc = db.query(Account).filter(Account.id == old_account_id, Account.user_id == current_user.id).first()
            if old_acc:
                old_acc.balance_paise += old_amount
        # Deduct from new account
        if new_account_id:
            new_acc = db.query(Account).filter(Account.id == new_account_id, Account.user_id == current_user.id).first()
            if new_acc:
                new_acc.balance_paise -= new_amount

    db.commit()
    db.refresh(expense)
    return ExpenseResponse.model_validate(expense)

@router.delete("/{id}", status_code=status.HTTP_200_OK)
def delete_expense(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    expense = db.query(Expense).filter(Expense.id == id, Expense.user_id == current_user.id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    # Refund balance to account if applicable
    if expense.account_id:
        acc = db.query(Account).filter(Account.id == expense.account_id, Account.user_id == current_user.id).first()
        if acc:
            acc.balance_paise += expense.amount_paise

    db.delete(expense)
    db.commit()
    return {"message": "Expense deleted successfully", "id": id}

@router.post("/{id}/duplicate", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def duplicate_expense(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    original = db.query(Expense).filter(Expense.id == id, Expense.user_id == current_user.id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Expense not found")

    new_expense = Expense(
        user_id=current_user.id,
        category_id=original.category_id,
        account_id=original.account_id,
        amount_paise=original.amount_paise,
        date=datetime.date.today(),
        time=datetime.datetime.now().strftime("%H:%M"),
        payment_method=original.payment_method,
        description=original.description,
        note=original.note,
        attachment_url=original.attachment_url,
        is_recurring_instance=False
    )
    if original.account_id:
        acc = db.query(Account).filter(Account.id == original.account_id, Account.user_id == current_user.id).first()
        if acc:
            acc.balance_paise -= original.amount_paise

    db.add(new_expense)
    db.commit()
    db.refresh(new_expense)
    return ExpenseResponse.model_validate(new_expense)
