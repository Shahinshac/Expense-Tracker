import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.deps import get_db, get_current_user
from app.models.models import User, Budget, CategoryBudget, Expense, Category
from app.schemas.schemas import BudgetCreate, BudgetUpdate, BudgetResponse, BudgetStatusResponse, CategoryBudgetStatus

router = APIRouter()

def compute_budget_status(budget: Budget, db: Session, user_id: int) -> BudgetStatusResponse:
    # Compute start and end of budget month
    year, month = map(int, budget.month.split("-"))
    start_date = datetime.date(year, month, 1)
    if month == 12:
        end_date = datetime.date(year + 1, 1, 1) - datetime.timedelta(days=1)
    else:
        end_date = datetime.date(year, month + 1, 1) - datetime.timedelta(days=1)

    # Total spent in this month
    total_spent = db.query(func.coalesce(func.sum(Expense.amount_paise), 0))\
        .filter(Expense.user_id == user_id, Expense.date >= start_date, Expense.date <= end_date).scalar() or 0

    remaining = max(0, budget.total_budget_paise - total_spent)
    pct = (total_spent / budget.total_budget_paise * 100) if budget.total_budget_paise > 0 else 0.0

    if total_spent > budget.total_budget_paise:
        status_str = "exceeded"
    elif pct >= budget.alert_threshold_percent:
        status_str = "warning"
    else:
        status_str = "normal"

    # Category breakdowns
    category_statuses: List[CategoryBudgetStatus] = []
    for cb in budget.category_budgets:
        cat_spent = db.query(func.coalesce(func.sum(Expense.amount_paise), 0))\
            .filter(Expense.user_id == user_id, Expense.category_id == cb.category_id,
                    Expense.date >= start_date, Expense.date <= end_date).scalar() or 0
        
        cat_rem = max(0, cb.amount_paise - cat_spent)
        cat_pct = (cat_spent / cb.amount_paise * 100) if cb.amount_paise > 0 else 0.0
        
        if cat_spent > cb.amount_paise:
            cat_status = "exceeded"
        elif cat_pct >= budget.alert_threshold_percent:
            cat_status = "warning"
        else:
            cat_status = "normal"

        category_statuses.append(CategoryBudgetStatus(
            category_id=cb.category_id,
            category_name=cb.category.name if cb.category else "Category",
            category_color=cb.category.color if cb.category else "#6366f1",
            category_icon=cb.category.icon if cb.category else "tag",
            budget_paise=cb.amount_paise,
            spent_paise=cat_spent,
            remaining_paise=cat_rem,
            percentage_used=round(cat_pct, 1),
            status=cat_status
        ))

    return BudgetStatusResponse(
        month=budget.month,
        total_budget_paise=budget.total_budget_paise,
        spent_paise=total_spent,
        remaining_paise=remaining,
        percentage_used=round(pct, 1),
        status=status_str,
        alert_threshold_percent=budget.alert_threshold_percent,
        categories=category_statuses
    )

@router.get("/current", response_model=Optional[BudgetStatusResponse])
def get_current_budget_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    current_month = datetime.date.today().strftime("%Y-%m")
    budget = db.query(Budget).filter(Budget.user_id == current_user.id, Budget.month == current_month).first()
    if not budget:
        return None
    return compute_budget_status(budget, db, current_user.id)

@router.get("/{month}", response_model=Optional[BudgetStatusResponse])
def get_budget_by_month(
    month: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    budget = db.query(Budget).filter(Budget.user_id == current_user.id, Budget.month == month).first()
    if not budget:
        return None
    return compute_budget_status(budget, db, current_user.id)

@router.post("/", response_model=BudgetResponse, status_code=status.HTTP_201_CREATED)
def set_budget(
    budget_in: BudgetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if budget already exists for this month
    budget = db.query(Budget).filter(Budget.user_id == current_user.id, Budget.month == budget_in.month).first()
    if budget:
        budget.total_budget_paise = budget_in.total_budget_paise
        budget.alert_threshold_percent = budget_in.alert_threshold_percent
        # Clear existing category budgets
        db.query(CategoryBudget).filter(CategoryBudget.budget_id == budget.id).delete()
    else:
        budget = Budget(
            user_id=current_user.id,
            month=budget_in.month,
            total_budget_paise=budget_in.total_budget_paise,
            alert_threshold_percent=budget_in.alert_threshold_percent
        )
        db.add(budget)
        db.flush()

    if budget_in.category_budgets:
        for cb in budget_in.category_budgets:
            db.add(CategoryBudget(
                budget_id=budget.id,
                category_id=cb.category_id,
                amount_paise=cb.amount_paise
            ))

    db.commit()
    db.refresh(budget)
    return BudgetResponse.model_validate(budget)
