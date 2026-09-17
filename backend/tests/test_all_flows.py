import datetime
import pytest

def test_auth_and_profile(client, db_session):
    # Register (status is PENDING, no token)
    res = client.post("/api/v1/auth/register", json={
        "email": "priya@college.edu",
        "password": "strongpassword123",
        "full_name": "Priya Patel",
        "currency": "INR"
    })
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "PENDING"
    assert "waiting for administrator approval" in data["message"]

    # Pending user cannot login
    login_fail = client.post("/api/v1/auth/login", json={
        "email": "priya@college.edu",
        "password": "strongpassword123"
    })
    assert login_fail.status_code == 403

    # Approve user
    from app.models.models import User
    u = db_session.query(User).filter(User.email == "priya@college.edu").first()
    u.status = "APPROVED"
    db_session.commit()

    # Approved user logs in
    login_ok = client.post("/api/v1/auth/login", json={
        "email": "priya@college.edu",
        "password": "strongpassword123"
    })
    assert login_ok.status_code == 200
    token = login_ok.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Profile
    me_res = client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "priya@college.edu"
    assert me_res.json()["status"] == "APPROVED"


def test_default_categories_and_accounts(client, auth_headers):
    # Categories
    cat_res = client.get("/api/v1/categories", headers=auth_headers)
    assert cat_res.status_code == 200
    categories = cat_res.json()
    cat_names = [c["name"] for c in categories]
    assert "Food" in cat_names
    assert "Petrol" in cat_names
    assert "Printing" in cat_names
    assert "College Fees" in cat_names
    assert "Books" in cat_names

    # Accounts
    acc_res = client.get("/api/v1/accounts", headers=auth_headers)
    assert acc_res.status_code == 200
    accounts = acc_res.json()
    acc_names = [a["name"] for a in accounts]
    assert any("Cash" in name for name in acc_names)
    assert any("UPI" in name for name in acc_names)

def test_expense_crud_and_dashboard_flow(client, auth_headers):
    # Get categories to find Food & Petrol
    cats = client.get("/api/v1/categories", headers=auth_headers).json()
    food_cat = next(c for c in cats if c["name"] == "Food")
    petrol_cat = next(c for c in cats if c["name"] == "Petrol")

    today_str = datetime.date.today().isoformat()

    # 1. Add Food Expense (₹180 = 18000 paise)
    res1 = client.post("/api/v1/expenses", headers=auth_headers, json={
        "amount_paise": 18000,
        "category_id": food_cat["id"],
        "date": today_str,
        "payment_method": "UPI",
        "description": "Lunch with friends",
        "note": "South Indian thali"
    })
    assert res1.status_code == 201
    exp1 = res1.json()
    assert exp1["amount_paise"] == 18000
    assert exp1["description"] == "Lunch with friends"

    # 2. Add Petrol Expense (₹500 = 50000 paise)
    res2 = client.post("/api/v1/expenses", headers=auth_headers, json={
        "amount_paise": 50000,
        "category_id": petrol_cat["id"],
        "date": today_str,
        "payment_method": "UPI",
        "description": "Petrol refill",
    })
    assert res2.status_code == 201

    # 3. Check Dashboard Summary (Today spent should be ₹680 = 68000 paise)
    dash_res = client.get("/api/v1/reports/dashboard", headers=auth_headers)
    assert dash_res.status_code == 200
    dash = dash_res.json()
    assert dash["today_spent_paise"] == 68000
    assert len(dash["recent_expenses"]) >= 2
    assert len(dash["category_breakdown"]) >= 2

    # 4. Edit Food Expense from ₹180 to ₹250 (25000 paise)
    edit_res = client.put(f"/api/v1/expenses/{exp1['id']}", headers=auth_headers, json={
        "amount_paise": 25000,
        "description": "Lunch and ice-cream"
    })
    assert edit_res.status_code == 200
    assert edit_res.json()["amount_paise"] == 25000

    # 5. Dashboard should now reflect 25000 + 50000 = 75000 paise (₹750)
    dash_res2 = client.get("/api/v1/reports/dashboard", headers=auth_headers)
    assert dash_res2.json()["today_spent_paise"] == 75000

    # 6. Delete Petrol expense
    del_res = client.delete(f"/api/v1/expenses/{res2.json()['id']}", headers=auth_headers)
    assert del_res.status_code == 200

    # 7. Dashboard now has only 25000 paise
    dash_res3 = client.get("/api/v1/reports/dashboard", headers=auth_headers)
    assert dash_res3.json()["today_spent_paise"] == 25000

def test_income_and_net_balance(client, auth_headers):
    today_str = datetime.date.today().isoformat()

    # Add Income: ₹10,000 (1000000 paise)
    inc_res = client.post("/api/v1/income", headers=auth_headers, json={
        "source": "Monthly Pocket Money",
        "amount_paise": 1000000,
        "date": today_str,
        "note": "From parents for September"
    })
    assert inc_res.status_code == 201

    # Check dashboard net balance
    dash = client.get("/api/v1/reports/dashboard", headers=auth_headers).json()
    assert dash["this_month_income_paise"] == 1000000
    assert dash["net_balance_paise"] > 0

def test_budget_and_insights(client, auth_headers):
    current_month = datetime.date.today().strftime("%Y-%m")
    
    # Set monthly budget: ₹8,000 (800000 paise)
    budget_res = client.post("/api/v1/budgets", headers=auth_headers, json={
        "month": current_month,
        "total_budget_paise": 800000,
        "alert_threshold_percent": 80
    })
    assert budget_res.status_code == 201

    # Get budget status
    b_status = client.get("/api/v1/budgets/current", headers=auth_headers).json()
    assert b_status is not None
    assert b_status["total_budget_paise"] == 800000
    assert b_status["remaining_paise"] <= 800000
    assert b_status["status"] in ["normal", "warning", "exceeded"]

def test_category_deletion_safeguard(client, auth_headers):
    # Create custom category
    cat_res = client.post("/api/v1/categories", headers=auth_headers, json={
        "name": "Hostel Fees",
        "group": "College",
        "icon": "home",
        "color": "#6366f1"
    })
    assert cat_res.status_code == 201
    cat_id = cat_res.json()["id"]

    # Create expense in this category
    client.post("/api/v1/expenses", headers=auth_headers, json={
        "amount_paise": 500000,
        "category_id": cat_id,
        "date": datetime.date.today().isoformat(),
        "description": "Hostel rent"
    })

    # Try to delete without reassigning -> should fail with 400
    del_attempt = client.delete(f"/api/v1/categories/{cat_id}", headers=auth_headers)
    assert del_attempt.status_code == 400
    assert "associated expenses" in del_attempt.json()["detail"]

    # Delete with reassigning to another category
    cats = client.get("/api/v1/categories", headers=auth_headers).json()
    other_cat = next(c for c in cats if c["name"] == "Other College" or c["name"] == "Other")
    del_success = client.delete(f"/api/v1/categories/{cat_id}?reassign_to_category_id={other_cat['id']}", headers=auth_headers)
    assert del_success.status_code == 200

def test_backup_and_restore(client, auth_headers):
    # Export backup
    backup_res = client.get("/api/v1/backup/export", headers=auth_headers)
    assert backup_res.status_code == 200
    backup_data = backup_res.json()
    assert "categories" in backup_data
    assert "expenses" in backup_data

    # Restore in merge mode
    restore_res = client.post("/api/v1/backup/restore", headers=auth_headers, json={
        "mode": "merge",
        "data": backup_data
    })
    assert restore_res.status_code == 200
    assert restore_res.json()["status"] == "success"
