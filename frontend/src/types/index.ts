export interface User {
  id: number;
  email: string;
  full_name: string;
  currency: string;
  college_name?: string;
  course?: string;
  month_starts_on_day?: number;
  created_at: string;
}

export interface Category {
  id: number;
  user_id?: number | null;
  name: string;
  group: string; // College, Daily, Personal, Other
  icon: string;
  color: string;
  is_default: boolean;
  created_at: string;
}

export interface Account {
  id: number;
  user_id: number;
  name: string;
  type: string; // cash, upi, bank, savings, other
  balance_paise: number;
  color: string;
  icon: string;
  created_at: string;
}

export interface Expense {
  id: number;
  user_id: number;
  category_id: number;
  account_id?: number | null;
  amount_paise: number;
  date: string;
  time?: string | null;
  payment_method: string;
  description?: string | null;
  note?: string | null;
  attachment_url?: string | null;
  is_recurring_instance: boolean;
  created_at: string;
  updated_at: string;
  category?: Category;
  account?: Account;
}

export interface Income {
  id: number;
  user_id: number;
  source: string;
  amount_paise: number;
  date: string;
  account_id?: number | null;
  note?: string | null;
  created_at: string;
  updated_at: string;
  account?: Account;
}

export interface CategoryBudget {
  id: number;
  budget_id: number;
  category_id: number;
  amount_paise: number;
  category?: Category;
}

export interface CategoryBudgetStatus {
  category_id: number;
  category_name: string;
  category_color: string;
  category_icon: string;
  budget_paise: number;
  spent_paise: number;
  remaining_paise: number;
  percentage_used: number;
  status: 'normal' | 'warning' | 'exceeded';
}

export interface BudgetStatus {
  month: string;
  total_budget_paise: number;
  spent_paise: number;
  remaining_paise: number;
  percentage_used: number;
  status: 'normal' | 'warning' | 'exceeded';
  alert_threshold_percent: number;
  categories: CategoryBudgetStatus[];
}

export interface RecurringExpense {
  id: number;
  user_id: number;
  name: string;
  category_id: number;
  account_id?: number | null;
  amount_paise: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  start_date: string;
  end_date?: string | null;
  payment_method: string;
  next_due_date: string;
  last_processed_date?: string | null;
  is_active: boolean;
  created_at: string;
  category?: Category;
  account?: Account;
}

export interface SavingsGoal {
  id: number;
  user_id: number;
  title: string;
  target_amount_paise: number;
  current_amount_paise: number;
  target_date?: string | null;
  color: string;
  icon: string;
  is_completed: boolean;
  percentage_achieved: number;
  created_at: string;
  updated_at: string;
}

export interface CategorySpendingItem {
  category_id: number;
  category_name: string;
  color: string;
  icon: string;
  group: string;
  amount_paise: number;
  percentage: number;
  count: number;
}

export interface DailySpendingItem {
  date: string;
  day_name: string;
  amount_paise: number;
}

export interface PaymentMethodSpendingItem {
  method: string;
  amount_paise: number;
  percentage: number;
  count: number;
}

export interface BudgetInsightItem {
  type: 'info' | 'warning' | 'success' | 'danger';
  message: string;
  metric?: string;
}

export interface DashboardSummary {
  today_spent_paise: number;
  this_week_spent_paise: number;
  this_month_spent_paise: number;
  this_month_income_paise: number;
  net_balance_paise: number;
  monthly_budget_paise: number;
  remaining_budget_paise: number;
  budget_used_percentage: number;
  budget_status: 'normal' | 'warning' | 'exceeded' | 'no_budget';
  recent_expenses: Expense[];
  category_breakdown: CategorySpendingItem[];
  daily_spending: DailySpendingItem[];
  insights: BudgetInsightItem[];
}

export interface ReportsSummary {
  total_income_paise: number;
  total_expense_paise: number;
  net_balance_paise: number;
  avg_daily_expense_paise: number;
  highest_expense_paise: number;
  lowest_expense_paise: number;
  transaction_count: number;
  top_category_name?: string | null;
  category_breakdown: CategorySpendingItem[];
  daily_spending: DailySpendingItem[];
  payment_breakdown: PaymentMethodSpendingItem[];
  top_expenses: Expense[];
}

export interface CalendarResponse {
  month: string;
  start_date: string;
  end_date: string;
  days: Record<string, {
    date: string;
    total_spent_paise: number;
    transaction_count: number;
  }>;
}
