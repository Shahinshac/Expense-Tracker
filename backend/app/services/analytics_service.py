import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, extract

from app.models.models import Expense, Income, Budget, CategoryBudget, Category, Account
from app.schemas.schemas import (
    DashboardSummaryResponse, CategorySpendingItem, DailySpendingItem,
    BudgetInsightItem, ExpenseResponse, ReportsSummaryResponse, PaymentMethodSpendingItem
)

def get_dashboard_summary(db: Session, user_id: int, today: Optional[datetime.date] = None) -> DashboardSummaryResponse:
    if today is None:
        today = datetime.date.today()
    
    # Dates
    start_of_month = today.replace(day=1)
    # Start of week (Monday)
    start_of_week = today - datetime.timedelta(days=today.weekday())
    current_month_str = today.strftime("%Y-%m")

    # 1. Today's spending
    today_spent = db.query(func.coalesce(func.sum(Expense.amount_paise), 0))\
        .filter(Expense.user_id == user_id, Expense.date == today).scalar() or 0

    # 2. This week's spending
    week_spent = db.query(func.coalesce(func.sum(Expense.amount_paise), 0))\
        .filter(Expense.user_id == user_id, Expense.date >= start_of_week, Expense.date <= today).scalar() or 0

    # 3. This month's spending
    month_spent = db.query(func.coalesce(func.sum(Expense.amount_paise), 0))\
        .filter(Expense.user_id == user_id, Expense.date >= start_of_month, Expense.date <= today).scalar() or 0

    # 4. This month's income
    month_income = db.query(func.coalesce(func.sum(Income.amount_paise), 0))\
        .filter(Income.user_id == user_id, Income.date >= start_of_month, Income.date <= today).scalar() or 0

    net_balance = month_income - month_spent

    # 5. Monthly Budget
    budget_record = db.query(Budget).filter(Budget.user_id == user_id, Budget.month == current_month_str).first()
    monthly_budget_paise = budget_record.total_budget_paise if budget_record else 0
    remaining_budget_paise = max(0, monthly_budget_paise - month_spent) if monthly_budget_paise > 0 else 0
    budget_used_percentage = (month_spent / monthly_budget_paise * 100) if monthly_budget_paise > 0 else 0.0

    budget_status = "no_budget"
    if budget_record:
        if month_spent > monthly_budget_paise:
            budget_status = "exceeded"
        elif budget_used_percentage >= budget_record.alert_threshold_percent:
            budget_status = "warning"
        else:
            budget_status = "normal"

    # 6. Recent expenses (latest 8)
    recent_db = db.query(Expense)\
        .filter(Expense.user_id == user_id)\
        .order_by(Expense.date.desc(), Expense.id.desc())\
        .limit(8).all()
    recent_expenses = [ExpenseResponse.model_validate(e) for e in recent_db]

    # 7. Category breakdown for this month
    cat_query = db.query(
        Category.id,
        Category.name,
        Category.color,
        Category.icon,
        Category.group,
        func.coalesce(func.sum(Expense.amount_paise), 0).label("total"),
        func.count(Expense.id).label("cnt")
    ).join(Expense, Expense.category_id == Category.id)\
     .filter(Expense.user_id == user_id, Expense.date >= start_of_month, Expense.date <= today)\
     .group_by(Category.id)\
     .order_by(func.sum(Expense.amount_paise).desc()).all()

    category_breakdown: List[CategorySpendingItem] = []
    for cat in cat_query:
        pct = (cat.total / month_spent * 100) if month_spent > 0 else 0.0
        category_breakdown.append(CategorySpendingItem(
            category_id=cat.id,
            category_name=cat.name,
            color=cat.color,
            icon=cat.icon,
            group=cat.group,
            amount_paise=cat.total,
            percentage=round(pct, 1),
            count=cat.cnt
        ))

    # 8. Daily spending for the last 14 days
    daily_spending: List[DailySpendingItem] = []
    fourteen_days_ago = today - datetime.timedelta(days=13)
    daily_records = db.query(
        Expense.date,
        func.coalesce(func.sum(Expense.amount_paise), 0).label("total")
    ).filter(Expense.user_id == user_id, Expense.date >= fourteen_days_ago, Expense.date <= today)\
     .group_by(Expense.date).all()

    daily_dict = {r.date: r.total for r in daily_records}
    for i in range(14):
        d = fourteen_days_ago + datetime.timedelta(days=i)
        daily_spending.append(DailySpendingItem(
            date=d.isoformat(),
            day_name=d.strftime("%a"),
            amount_paise=daily_dict.get(d, 0)
        ))

    # 9. Smart Budget Insights (rule-based calculations)
    insights: List[BudgetInsightItem] = []
    
    # Insight 1: Budget threshold check
    if budget_record:
        if month_spent > monthly_budget_paise:
            insights.append(BudgetInsightItem(
                type="danger",
                message=f"Monthly budget exceeded by ₹{(month_spent - monthly_budget_paise) / 100:.2f} ({budget_used_percentage:.1f}% used).",
                metric=f"{budget_used_percentage:.0f}%"
            ))
        elif budget_used_percentage >= budget_record.alert_threshold_percent:
            insights.append(BudgetInsightItem(
                type="warning",
                message=f"You've used {budget_used_percentage:.1f}% of your monthly budget (₹{monthly_budget_paise / 100:.0f}).",
                metric=f"{budget_used_percentage:.0f}%"
            ))
        else:
            insights.append(BudgetInsightItem(
                type="success",
                message=f"On track! You have ₹{remaining_budget_paise / 100:.0f} remaining this month.",
                metric=f"₹{remaining_budget_paise / 100:.0f}"
            ))

    # Insight 2: Category budget checks
    if budget_record and budget_record.category_budgets:
        for cb in budget_record.category_budgets:
            cb_spent = db.query(func.coalesce(func.sum(Expense.amount_paise), 0))\
                .filter(Expense.user_id == user_id, Expense.category_id == cb.category_id,
                        Expense.date >= start_of_month, Expense.date <= today).scalar() or 0
            if cb.amount_paise > 0:
                cb_pct = cb_spent / cb.amount_paise * 100
                if cb_pct >= 80:
                    cat_name = cb.category.name if cb.category else "Category"
                    insights.append(BudgetInsightItem(
                        type="warning" if cb_pct < 100 else "danger",
                        message=f"You have spent {cb_pct:.0f}% of your {cat_name} budget (₹{cb_spent / 100:.0f}/₹{cb.amount_paise / 100:.0f}).",
                        metric=f"{cb_pct:.0f}%"
                    ))

    # Insight 3: 7-day trend comparison
    seven_days_ago = today - datetime.timedelta(days=7)
    past_7_days_spent = db.query(func.coalesce(func.sum(Expense.amount_paise), 0))\
        .filter(Expense.user_id == user_id, Expense.date >= seven_days_ago, Expense.date < today).scalar() or 0
    daily_7_avg = past_7_days_spent / 7 if past_7_days_spent > 0 else 0
    if daily_7_avg > 0 and today_spent > 0:
        if today_spent > daily_7_avg * 1.3:
            insights.append(BudgetInsightItem(
                type="info",
                message=f"Today's spending (₹{today_spent / 100:.0f}) is higher than your 7-day daily average (₹{daily_7_avg / 100:.0f}).",
                metric="Trend"
            ))
        elif today_spent < daily_7_avg * 0.7:
            insights.append(BudgetInsightItem(
                type="success",
                message=f"Great job! Today's spending is lower than your 7-day daily average (₹{daily_7_avg / 100:.0f}).",
                metric="Saved"
            ))

    # Insight 4: Top category
    if len(category_breakdown) >= 1:
        top_cat = category_breakdown[0]
        insights.append(BudgetInsightItem(
            type="info",
            message=f"{top_cat.category_name} is your highest expense category this month ({top_cat.percentage:.0f}% of total).",
            metric=f"{top_cat.percentage:.0f}%"
        ))

    return DashboardSummaryResponse(
        today_spent_paise=today_spent,
        this_week_spent_paise=week_spent,
        this_month_spent_paise=month_spent,
        this_month_income_paise=month_income,
        net_balance_paise=net_balance,
        monthly_budget_paise=monthly_budget_paise,
        remaining_budget_paise=remaining_budget_paise,
        budget_used_percentage=round(budget_used_percentage, 1),
        budget_status=budget_status,
        recent_expenses=recent_expenses,
        category_breakdown=category_breakdown,
        daily_spending=daily_spending,
        insights=insights
    )

def get_reports_summary(
    db: Session,
    user_id: int,
    start_date: datetime.date,
    end_date: datetime.date
) -> ReportsSummaryResponse:
    # Expenses total and count
    exp_stats = db.query(
        func.coalesce(func.sum(Expense.amount_paise), 0).label("total"),
        func.count(Expense.id).label("cnt"),
        func.coalesce(func.max(Expense.amount_paise), 0).label("max_amt"),
        func.coalesce(func.min(Expense.amount_paise), 0).label("min_amt")
    ).filter(Expense.user_id == user_id, Expense.date >= start_date, Expense.date <= end_date).first()

    total_expense = exp_stats.total or 0
    cnt = exp_stats.cnt or 0
    highest_exp = exp_stats.max_amt or 0
    lowest_exp = exp_stats.min_amt if cnt > 0 else 0

    # Income total
    total_income = db.query(func.coalesce(func.sum(Income.amount_paise), 0))\
        .filter(Income.user_id == user_id, Income.date >= start_date, Income.date <= end_date).scalar() or 0

    net_balance = total_income - total_expense

    # Days count for average calculation
    day_count = (end_date - start_date).days + 1
    avg_daily = int(total_expense / day_count) if day_count > 0 else 0

    # Category breakdown
    cat_query = db.query(
        Category.id,
        Category.name,
        Category.color,
        Category.icon,
        Category.group,
        func.coalesce(func.sum(Expense.amount_paise), 0).label("total"),
        func.count(Expense.id).label("cnt")
    ).join(Expense, Expense.category_id == Category.id)\
     .filter(Expense.user_id == user_id, Expense.date >= start_date, Expense.date <= end_date)\
     .group_by(Category.id)\
     .order_by(func.sum(Expense.amount_paise).desc()).all()

    category_breakdown: List[CategorySpendingItem] = []
    top_cat_name = None
    for idx, cat in enumerate(cat_query):
        if idx == 0:
            top_cat_name = cat.name
        pct = (cat.total / total_expense * 100) if total_expense > 0 else 0.0
        category_breakdown.append(CategorySpendingItem(
            category_id=cat.id,
            category_name=cat.name,
            color=cat.color,
            icon=cat.icon,
            group=cat.group,
            amount_paise=cat.total,
            percentage=round(pct, 1),
            count=cat.cnt
        ))

    # Daily breakdown
    daily_records = db.query(
        Expense.date,
        func.coalesce(func.sum(Expense.amount_paise), 0).label("total")
    ).filter(Expense.user_id == user_id, Expense.date >= start_date, Expense.date <= end_date)\
     .group_by(Expense.date).all()
    daily_dict = {r.date: r.total for r in daily_records}

    daily_spending: List[DailySpendingItem] = []
    curr = start_date
    while curr <= end_date:
        daily_spending.append(DailySpendingItem(
            date=curr.isoformat(),
            day_name=curr.strftime("%a"),
            amount_paise=daily_dict.get(curr, 0)
        ))
        curr += datetime.timedelta(days=1)

    # Payment method breakdown
    pay_records = db.query(
        Expense.payment_method,
        func.coalesce(func.sum(Expense.amount_paise), 0).label("total"),
        func.count(Expense.id).label("cnt")
    ).filter(Expense.user_id == user_id, Expense.date >= start_date, Expense.date <= end_date)\
     .group_by(Expense.payment_method)\
     .order_by(func.sum(Expense.amount_paise).desc()).all()

    payment_breakdown: List[PaymentMethodSpendingItem] = []
    for pr in pay_records:
        pct = (pr.total / total_expense * 100) if total_expense > 0 else 0.0
        payment_breakdown.append(PaymentMethodSpendingItem(
            method=pr.payment_method or "Other",
            amount_paise=pr.total,
            percentage=round(pct, 1),
            count=pr.cnt
        ))

    # Top expenses
    top_db = db.query(Expense)\
        .filter(Expense.user_id == user_id, Expense.date >= start_date, Expense.date <= end_date)\
        .order_by(Expense.amount_paise.desc())\
        .limit(5).all()
    top_expenses = [ExpenseResponse.model_validate(e) for e in top_db]

    return ReportsSummaryResponse(
        total_income_paise=total_income,
        total_expense_paise=total_expense,
        net_balance_paise=net_balance,
        avg_daily_expense_paise=avg_daily,
        highest_expense_paise=highest_exp,
        lowest_expense_paise=lowest_exp,
        transaction_count=cnt,
        top_category_name=top_cat_name,
        category_breakdown=category_breakdown,
        daily_spending=daily_spending,
        payment_breakdown=payment_breakdown,
        top_expenses=top_expenses
    )
