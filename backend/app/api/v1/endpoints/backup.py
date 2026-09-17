import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.models.models import (
    User, Category, Account, Expense, Income, Budget, CategoryBudget,
    RecurringExpense, SavingsGoal
)
from app.schemas.schemas import BackupData, RestoreRequest

router = APIRouter()

@router.get("/export", response_model=BackupData)
def export_backup(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Fetch all data for this user
    categories = db.query(Category).filter(Category.user_id == current_user.id).all()
    accounts = db.query(Account).filter(Account.user_id == current_user.id).all()
    expenses = db.query(Expense).filter(Expense.user_id == current_user.id).all()
    incomes = db.query(Income).filter(Income.user_id == current_user.id).all()
    budgets = db.query(Budget).filter(Budget.user_id == current_user.id).all()
    recurring = db.query(RecurringExpense).filter(RecurringExpense.user_id == current_user.id).all()
    savings = db.query(SavingsGoal).filter(SavingsGoal.user_id == current_user.id).all()

    budget_ids = [b.id for b in budgets]
    category_budgets = db.query(CategoryBudget).filter(CategoryBudget.budget_id.in_(budget_ids)).all() if budget_ids else []

    backup = BackupData(
        version="1.0",
        exported_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        user={
            "email": current_user.email,
            "full_name": current_user.full_name,
            "currency": current_user.currency
        },
        categories=[{
            "id": c.id, "name": c.name, "group": c.group, "icon": c.icon, "color": c.color, "is_default": c.is_default
        } for c in categories],
        accounts=[{
            "id": a.id, "name": a.name, "type": a.type, "balance_paise": a.balance_paise, "color": a.color, "icon": a.icon
        } for a in accounts],
        expenses=[{
            "id": e.id, "category_id": e.category_id, "account_id": e.account_id, "amount_paise": e.amount_paise,
            "date": e.date.isoformat(), "time": e.time, "payment_method": e.payment_method, "description": e.description,
            "note": e.note, "attachment_url": e.attachment_url, "is_recurring_instance": e.is_recurring_instance
        } for e in expenses],
        incomes=[{
            "id": i.id, "source": i.source, "amount_paise": i.amount_paise, "date": i.date.isoformat(),
            "account_id": i.account_id, "note": i.note
        } for i in incomes],
        budgets=[{
            "id": b.id, "month": b.month, "total_budget_paise": b.total_budget_paise, "alert_threshold_percent": b.alert_threshold_percent
        } for b in budgets],
        category_budgets=[{
            "id": cb.id, "budget_id": cb.budget_id, "category_id": cb.category_id, "amount_paise": cb.amount_paise
        } for cb in category_budgets],
        recurring_expenses=[{
            "id": r.id, "name": r.name, "category_id": r.category_id, "account_id": r.account_id, "amount_paise": r.amount_paise,
            "frequency": r.frequency, "start_date": r.start_date.isoformat(), "end_date": r.end_date.isoformat() if r.end_date else None,
            "payment_method": r.payment_method, "next_due_date": r.next_due_date.isoformat(), "is_active": r.is_active
        } for r in recurring],
        savings_goals=[{
            "id": s.id, "title": s.title, "target_amount_paise": s.target_amount_paise, "current_amount_paise": s.current_amount_paise,
            "target_date": s.target_date.isoformat() if s.target_date else None, "color": s.color, "icon": s.icon, "is_completed": s.is_completed
        } for s in savings]
    )
    return backup

@router.post("/restore")
def restore_backup(
    restore_req: RestoreRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    data = restore_req.data
    mode = restore_req.mode # "replace" or "merge"

    try:
        if mode == "replace":
            # Clear existing data for this user
            db.query(Expense).filter(Expense.user_id == current_user.id).delete()
            db.query(Income).filter(Income.user_id == current_user.id).delete()
            db.query(RecurringExpense).filter(RecurringExpense.user_id == current_user.id).delete()
            db.query(SavingsGoal).filter(SavingsGoal.user_id == current_user.id).delete()
            db.query(Budget).filter(Budget.user_id == current_user.id).delete()
            db.query(Category).filter(Category.user_id == current_user.id).delete()
            db.query(Account).filter(Account.user_id == current_user.id).delete()
            db.flush()

        # Category mapping: old_id -> new_id
        cat_map = {}
        for cat in data.categories:
            existing = db.query(Category).filter(Category.user_id == current_user.id, Category.name == cat["name"]).first()
            if existing:
                cat_map[cat["id"]] = existing.id
            else:
                new_cat = Category(
                    user_id=current_user.id,
                    name=cat["name"],
                    group=cat.get("group", "Other"),
                    icon=cat.get("icon", "tag"),
                    color=cat.get("color", "#6366f1"),
                    is_default=cat.get("is_default", False)
                )
                db.add(new_cat)
                db.flush()
                cat_map[cat["id"]] = new_cat.id

        # Account mapping: old_id -> new_id
        acc_map = {}
        for acc in data.accounts:
            existing = db.query(Account).filter(Account.user_id == current_user.id, Account.name == acc["name"]).first()
            if existing:
                acc_map[acc["id"]] = existing.id
            else:
                new_acc = Account(
                    user_id=current_user.id,
                    name=acc["name"],
                    type=acc.get("type", "upi"),
                    balance_paise=acc.get("balance_paise", 0),
                    color=acc.get("color", "#10b981"),
                    icon=acc.get("icon", "wallet")
                )
                db.add(new_acc)
                db.flush()
                acc_map[acc["id"]] = new_acc.id

        # Expenses
        for exp in data.expenses:
            cat_id = cat_map.get(exp.get("category_id"))
            if not cat_id:
                # fallback to first category
                first_cat = db.query(Category).filter(Category.user_id == current_user.id).first()
                cat_id = first_cat.id if first_cat else None
            if not cat_id:
                continue

            acc_id = acc_map.get(exp.get("account_id"))
            db.add(Expense(
                user_id=current_user.id,
                category_id=cat_id,
                account_id=acc_id,
                amount_paise=exp["amount_paise"],
                date=datetime.date.fromisoformat(exp["date"]),
                time=exp.get("time"),
                payment_method=exp.get("payment_method", "UPI"),
                description=exp.get("description"),
                note=exp.get("note"),
                attachment_url=exp.get("attachment_url"),
                is_recurring_instance=exp.get("is_recurring_instance", False)
            ))

        # Incomes
        for inc in data.incomes:
            acc_id = acc_map.get(inc.get("account_id"))
            db.add(Income(
                user_id=current_user.id,
                source=inc["source"],
                amount_paise=inc["amount_paise"],
                date=datetime.date.fromisoformat(inc["date"]),
                account_id=acc_id,
                note=inc.get("note")
            ))

        # Savings
        for s in data.savings_goals:
            db.add(SavingsGoal(
                user_id=current_user.id,
                title=s["title"],
                target_amount_paise=s["target_amount_paise"],
                current_amount_paise=s.get("current_amount_paise", 0),
                target_date=datetime.date.fromisoformat(s["target_date"]) if s.get("target_date") else None,
                color=s.get("color", "#3b82f6"),
                icon=s.get("icon", "target"),
                is_completed=s.get("is_completed", False)
            ))

        # Budgets
        for b in data.budgets:
            existing_b = db.query(Budget).filter(Budget.user_id == current_user.id, Budget.month == b["month"]).first()
            if not existing_b:
                new_b = Budget(
                    user_id=current_user.id,
                    month=b["month"],
                    total_budget_paise=b["total_budget_paise"],
                    alert_threshold_percent=b.get("alert_threshold_percent", 80)
                )
                db.add(new_b)

        db.commit()
        return {"status": "success", "message": f"Successfully restored data in {mode} mode"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to restore backup: {str(e)}")
