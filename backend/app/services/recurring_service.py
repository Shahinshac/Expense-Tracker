import datetime
from typing import List
from sqlalchemy.orm import Session
from app.models.models import RecurringExpense, Expense

def advance_due_date(current_due: datetime.date, frequency: str) -> datetime.date:
    if frequency == "daily":
        return current_due + datetime.timedelta(days=1)
    elif frequency == "weekly":
        return current_due + datetime.timedelta(days=7)
    elif frequency == "monthly":
        year = current_due.year + (1 if current_due.month == 12 else 0)
        month = 1 if current_due.month == 12 else current_due.month + 1
        day = min(current_due.day, 28) # handle varying month lengths safely
        return datetime.date(year, month, day)
    elif frequency == "yearly":
        try:
            return current_due.replace(year=current_due.year + 1)
        except ValueError: # Feb 29 leap year
            return current_due.replace(year=current_due.year + 1, day=28)
    return current_due + datetime.timedelta(days=30)

def process_due_recurring_expenses(db: Session, user_id: int) -> int:
    today = datetime.date.today()
    active_recurring = db.query(RecurringExpense).filter(
        RecurringExpense.user_id == user_id,
        RecurringExpense.is_active == True,
        RecurringExpense.next_due_date <= today
    ).all()

    generated_count = 0
    for item in active_recurring:
        # Prevent generation if past end_date
        if item.end_date and item.next_due_date > item.end_date:
            item.is_active = False
            continue

        # Check duplicate expense for this day and recurring rule
        existing = db.query(Expense).filter(
            Expense.user_id == user_id,
            Expense.category_id == item.category_id,
            Expense.amount_paise == item.amount_paise,
            Expense.date == item.next_due_date,
            Expense.is_recurring_instance == True
        ).first()

        if not existing:
            new_expense = Expense(
                user_id=user_id,
                category_id=item.category_id,
                account_id=item.account_id,
                amount_paise=item.amount_paise,
                date=item.next_due_date,
                time=datetime.datetime.now().strftime("%H:%M"),
                payment_method=item.payment_method,
                description=f"[Recurring] {item.name}",
                note=f"Automatically generated from recurring rule: {item.name}",
                is_recurring_instance=True
            )
            db.add(new_expense)
            generated_count += 1

        item.last_processed_date = item.next_due_date
        item.next_due_date = advance_due_date(item.next_due_date, item.frequency)
        
        if item.end_date and item.next_due_date > item.end_date:
            item.is_active = False

    if generated_count > 0:
        db.commit()
    return generated_count
