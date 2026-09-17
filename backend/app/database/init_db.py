from sqlalchemy.orm import Session
from app.database.session import Base, engine
from app.models.models import Category, Account

DEFAULT_CATEGORIES = [
    # College
    {"name": "College Fees", "group": "College", "icon": "graduation-cap", "color": "#4f46e5"},
    {"name": "Printing", "group": "College", "icon": "printer", "color": "#0ea5e9"},
    {"name": "Record", "group": "College", "icon": "file-text", "color": "#0284c7"},
    {"name": "Notes", "group": "College", "icon": "book-open", "color": "#2563eb"},
    {"name": "Books", "group": "College", "icon": "book", "color": "#3b82f6"},
    {"name": "Stationery", "group": "College", "icon": "pen-tool", "color": "#6366f1"},
    {"name": "Assignments", "group": "College", "icon": "clipboard-list", "color": "#8b5cf6"},
    {"name": "Other College", "group": "College", "icon": "school", "color": "#a855f7"},

    # Daily
    {"name": "Food", "group": "Daily", "icon": "utensils", "color": "#f97316"},
    {"name": "Snacks", "group": "Daily", "icon": "cookie", "color": "#fb923c"},
    {"name": "Tea/Coffee", "group": "Daily", "icon": "coffee", "color": "#d97706"},
    {"name": "Petrol", "group": "Daily", "icon": "fuel", "color": "#ef4444"},
    {"name": "Parking", "group": "Daily", "icon": "car", "color": "#f59e0b"},
    {"name": "Travel", "group": "Daily", "icon": "bus", "color": "#10b981"},
    {"name": "Mobile Recharge", "group": "Daily", "icon": "smartphone", "color": "#14b8a6"},

    # Personal
    {"name": "Shopping", "group": "Personal", "icon": "shopping-bag", "color": "#ec4899"},
    {"name": "Entertainment", "group": "Personal", "icon": "film", "color": "#8b5cf6"},
    {"name": "Health", "group": "Personal", "icon": "activity", "color": "#06b6d4"},
    {"name": "Personal", "group": "Personal", "icon": "user", "color": "#64748b"},
    {"name": "Subscriptions", "group": "Personal", "icon": "calendar-check", "color": "#6366f1"},

    # Other
    {"name": "Other", "group": "Other", "icon": "more-horizontal", "color": "#94a3b8"},
]

DEFAULT_ACCOUNTS = [
    {"name": "Cash", "type": "cash", "balance_paise": 0, "color": "#10b981", "icon": "banknote"},
    {"name": "UPI (GPay/PhonePe)", "type": "upi", "balance_paise": 0, "color": "#6366f1", "icon": "smartphone"},
    {"name": "Bank Account", "type": "bank", "balance_paise": 0, "color": "#3b82f6", "icon": "building"},
    {"name": "Savings", "type": "savings", "balance_paise": 0, "color": "#8b5cf6", "icon": "piggy-bank"},
]

def init_db():
    Base.metadata.create_all(bind=engine)

def seed_user_defaults(db: Session, user_id: int):
    # Check if user already has categories
    existing_cat = db.query(Category).filter(Category.user_id == user_id).first()
    if not existing_cat:
        for cat in DEFAULT_CATEGORIES:
            db.add(Category(
                user_id=user_id,
                name=cat["name"],
                group=cat["group"],
                icon=cat["icon"],
                color=cat["color"],
                is_default=True,
            ))
    
    # Check if user has accounts
    existing_acc = db.query(Account).filter(Account.user_id == user_id).first()
    if not existing_acc:
        for acc in DEFAULT_ACCOUNTS:
            db.add(Account(
                user_id=user_id,
                name=acc["name"],
                type=acc["type"],
                balance_paise=acc["balance_paise"],
                color=acc["color"],
                icon=acc["icon"],
            ))
    
    db.commit()
