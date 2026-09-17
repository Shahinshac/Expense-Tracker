from typing import Optional, List
from datetime import date, datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict

# --- AUTH & USER ---
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str
    currency: Optional[str] = "INR"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    currency: str
    status: str = "PENDING"
    is_admin: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class RegisterResponse(BaseModel):
    message: str
    status: str
    email: EmailStr
    id: int

class AdminUserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    currency: str
    status: str
    is_admin: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class AdminStatsResponse(BaseModel):
    total_users: int
    pending_users: int
    approved_users: int
    rejected_users: int
    disabled_users: int

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse



# --- CATEGORY ---
class CategoryBase(BaseModel):
    name: str
    group: Optional[str] = "Other"
    icon: Optional[str] = "tag"
    color: Optional[str] = "#6366f1"

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    group: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None

class CategoryResponse(CategoryBase):
    id: int
    user_id: Optional[int] = None
    is_default: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- ACCOUNT ---
class AccountBase(BaseModel):
    name: str
    type: str = "upi" # cash, upi, bank, savings, other
    balance_paise: int = 0
    color: Optional[str] = "#10b981"
    icon: Optional[str] = "wallet"

class AccountCreate(AccountBase):
    pass

class AccountUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    balance_paise: Optional[int] = None
    color: Optional[str] = None
    icon: Optional[str] = None

class AccountResponse(AccountBase):
    id: int
    user_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- EXPENSE ---
class ExpenseBase(BaseModel):
    amount_paise: int = Field(..., gt=0, description="Amount in smallest unit (paise)")
    category_id: int
    account_id: Optional[int] = None
    date: date
    time: Optional[str] = None
    payment_method: str = "UPI"
    description: Optional[str] = None
    note: Optional[str] = None
    attachment_url: Optional[str] = None

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseUpdate(BaseModel):
    amount_paise: Optional[int] = Field(None, gt=0)
    category_id: Optional[int] = None
    account_id: Optional[int] = None
    date: Optional[date] = None
    time: Optional[str] = None
    payment_method: Optional[str] = None
    description: Optional[str] = None
    note: Optional[str] = None
    attachment_url: Optional[str] = None

class ExpenseResponse(ExpenseBase):
    id: int
    user_id: int
    is_recurring_instance: bool
    created_at: datetime
    updated_at: datetime
    category: Optional[CategoryResponse] = None
    account: Optional[AccountResponse] = None

    model_config = ConfigDict(from_attributes=True)


# --- INCOME ---
class IncomeBase(BaseModel):
    source: str
    amount_paise: int = Field(..., gt=0)
    date: date
    account_id: Optional[int] = None
    note: Optional[str] = None

class IncomeCreate(IncomeBase):
    pass

class IncomeUpdate(BaseModel):
    source: Optional[str] = None
    amount_paise: Optional[int] = Field(None, gt=0)
    date: Optional[date] = None
    account_id: Optional[int] = None
    note: Optional[str] = None

class IncomeResponse(IncomeBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    account: Optional[AccountResponse] = None

    model_config = ConfigDict(from_attributes=True)


# --- BUDGET ---
class CategoryBudgetBase(BaseModel):
    category_id: int
    amount_paise: int = Field(..., gt=0)

class CategoryBudgetCreate(CategoryBudgetBase):
    pass

class CategoryBudgetResponse(CategoryBudgetBase):
    id: int
    budget_id: int
    category: Optional[CategoryResponse] = None

    model_config = ConfigDict(from_attributes=True)

class BudgetBase(BaseModel):
    month: str = Field(..., pattern=r"^\d{4}-\d{2}$", description="Format: YYYY-MM")
    total_budget_paise: int = Field(..., gt=0)
    alert_threshold_percent: int = Field(80, ge=1, le=100)

class BudgetCreate(BudgetBase):
    category_budgets: Optional[List[CategoryBudgetCreate]] = []

class BudgetUpdate(BaseModel):
    total_budget_paise: Optional[int] = Field(None, gt=0)
    alert_threshold_percent: Optional[int] = Field(None, ge=1, le=100)
    category_budgets: Optional[List[CategoryBudgetCreate]] = None

class BudgetResponse(BudgetBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    category_budgets: List[CategoryBudgetResponse] = []

    model_config = ConfigDict(from_attributes=True)

class CategoryBudgetStatus(BaseModel):
    category_id: int
    category_name: str
    category_color: str
    category_icon: str
    budget_paise: int
    spent_paise: int
    remaining_paise: int
    percentage_used: float
    status: str # "normal", "warning", "exceeded"

class BudgetStatusResponse(BaseModel):
    month: str
    total_budget_paise: int
    spent_paise: int
    remaining_paise: int
    percentage_used: float
    status: str # "normal", "warning", "exceeded"
    alert_threshold_percent: int
    categories: List[CategoryBudgetStatus] = []


# --- RECURRING EXPENSES ---
class RecurringExpenseBase(BaseModel):
    name: str
    category_id: int
    account_id: Optional[int] = None
    amount_paise: int = Field(..., gt=0)
    frequency: str = "monthly" # daily, weekly, monthly, yearly
    start_date: date
    end_date: Optional[date] = None
    payment_method: str = "UPI"
    is_active: bool = True

class RecurringExpenseCreate(RecurringExpenseBase):
    pass

class RecurringExpenseUpdate(BaseModel):
    name: Optional[str] = None
    category_id: Optional[int] = None
    account_id: Optional[int] = None
    amount_paise: Optional[int] = Field(None, gt=0)
    frequency: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    payment_method: Optional[str] = None
    is_active: Optional[bool] = None

class RecurringExpenseResponse(RecurringExpenseBase):
    id: int
    user_id: int
    next_due_date: date
    last_processed_date: Optional[date] = None
    created_at: datetime
    category: Optional[CategoryResponse] = None
    account: Optional[AccountResponse] = None

    model_config = ConfigDict(from_attributes=True)


# --- SAVINGS GOAL ---
class SavingsGoalBase(BaseModel):
    title: str
    target_amount_paise: int = Field(..., gt=0)
    current_amount_paise: int = 0
    target_date: Optional[date] = None
    color: Optional[str] = "#3b82f6"
    icon: Optional[str] = "target"

class SavingsGoalCreate(SavingsGoalBase):
    pass

class SavingsGoalUpdate(BaseModel):
    title: Optional[str] = None
    target_amount_paise: Optional[int] = Field(None, gt=0)
    current_amount_paise: Optional[int] = None
    target_date: Optional[date] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    is_completed: Optional[bool] = None

class SavingsGoalDeposit(BaseModel):
    amount_paise: int = Field(..., description="Amount to add (positive) or withdraw (negative)")

class SavingsGoalResponse(SavingsGoalBase):
    id: int
    user_id: int
    is_completed: bool
    percentage_achieved: float
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- DASHBOARD & REPORTS ---
class CategorySpendingItem(BaseModel):
    category_id: int
    category_name: str
    color: str
    icon: str
    group: str
    amount_paise: int
    percentage: float
    count: int

class DailySpendingItem(BaseModel):
    date: str # YYYY-MM-DD
    day_name: str # Mon, Tue, etc.
    amount_paise: int

class PaymentMethodSpendingItem(BaseModel):
    method: str
    amount_paise: int
    percentage: float
    count: int

class BudgetInsightItem(BaseModel):
    type: str # "info", "warning", "success", "danger"
    message: str
    metric: Optional[str] = None

class DashboardSummaryResponse(BaseModel):
    today_spent_paise: int
    this_week_spent_paise: int
    this_month_spent_paise: int
    this_month_income_paise: int
    net_balance_paise: int
    monthly_budget_paise: int
    remaining_budget_paise: int
    budget_used_percentage: float
    budget_status: str # "normal", "warning", "exceeded", "no_budget"
    recent_expenses: List[ExpenseResponse]
    category_breakdown: List[CategorySpendingItem]
    daily_spending: List[DailySpendingItem]
    insights: List[BudgetInsightItem]

class ReportsSummaryResponse(BaseModel):
    total_income_paise: int
    total_expense_paise: int
    net_balance_paise: int
    avg_daily_expense_paise: int
    highest_expense_paise: int
    lowest_expense_paise: int
    transaction_count: int
    top_category_name: Optional[str] = None
    category_breakdown: List[CategorySpendingItem]
    daily_spending: List[DailySpendingItem]
    payment_breakdown: List[PaymentMethodSpendingItem]
    top_expenses: List[ExpenseResponse]

# --- BACKUP / RESTORE ---
class BackupData(BaseModel):
    version: str = "1.0"
    exported_at: str
    user: dict
    categories: List[dict]
    accounts: List[dict]
    expenses: List[dict]
    incomes: List[dict]
    budgets: List[dict]
    category_budgets: List[dict]
    recurring_expenses: List[dict]
    savings_goals: List[dict]

class RestoreRequest(BaseModel):
    mode: str = "replace" # "replace" or "merge"
    data: BackupData

# --- ATTACHMENT & UPLOADS ---
class UploadResponse(BaseModel):
    id: int
    file_name: str
    file_path: str
    file_url: str
    signed_url: Optional[str] = None
    expires_in: Optional[int] = None
    file_size: int
    mime_type: str

class SignedUrlResponse(BaseModel):
    signed_url: str
    expires_in: int
    file_path: str
    attachment_id: Optional[int] = None

