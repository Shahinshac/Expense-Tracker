from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth, expenses, income, categories, accounts, budgets,
    recurring, savings, reports, export, backup, uploads
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(expenses.router, prefix="/expenses", tags=["expenses"])
api_router.include_router(income.router, prefix="/income", tags=["income"])
api_router.include_router(categories.router, prefix="/categories", tags=["categories"])
api_router.include_router(accounts.router, prefix="/accounts", tags=["accounts"])
api_router.include_router(budgets.router, prefix="/budgets", tags=["budgets"])
api_router.include_router(recurring.router, prefix="/recurring", tags=["recurring"])
api_router.include_router(savings.router, prefix="/savings", tags=["savings"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(export.router, prefix="/export", tags=["export"])
api_router.include_router(backup.router, prefix="/backup", tags=["backup"])
api_router.include_router(uploads.router, prefix="/uploads", tags=["uploads"])
