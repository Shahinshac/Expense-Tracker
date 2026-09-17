import io
import pytest
from fastapi.testclient import TestClient

def test_health_endpoint(client: TestClient):
    """Verify production health check endpoint returns exact required response."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_user_data_isolation_expenses(client: TestClient):
    """Verify strict data isolation: User A cannot read, update, delete, or duplicate User B's expenses."""
    # 1. Register User A
    res_a = client.post("/api/v1/auth/register", json={
        "email": "user_a@isolate.edu",
        "password": "passwordA123",
        "full_name": "User Alpha",
        "currency": "INR"
    })
    assert res_a.status_code == 201
    token_a = res_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 2. Register User B
    res_b = client.post("/api/v1/auth/register", json={
        "email": "user_b@isolate.edu",
        "password": "passwordB123",
        "full_name": "User Beta",
        "currency": "INR"
    })
    assert res_b.status_code == 201
    token_b = res_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Get available categories for each user
    cats_a = client.get("/api/v1/categories/", headers=headers_a).json()
    cat_id_a = cats_a[0]["id"]
    cats_b = client.get("/api/v1/categories/", headers=headers_b).json()
    cat_id_b = cats_b[0]["id"]

    # 3. User A creates an expense: Petrol ₹500 (50000 paise)
    exp_a_res = client.post("/api/v1/expenses/", headers=headers_a, json={
        "amount_paise": 50000,
        "category_id": cat_id_a,
        "date": "2026-09-17",
        "description": "User A Petrol",
        "payment_method": "UPI"
    })
    assert exp_a_res.status_code == 201
    exp_a_id = exp_a_res.json()["id"]

    # 4. User B creates an expense: Textbook ₹850 (85000 paise)
    exp_b_res = client.post("/api/v1/expenses/", headers=headers_b, json={
        "amount_paise": 85000,
        "category_id": cat_id_b,
        "date": "2026-09-17",
        "description": "User B Textbook",
        "payment_method": "Cash"
    })
    assert exp_b_res.status_code == 201
    exp_b_id = exp_b_res.json()["id"]

    # 5. User A lists expenses -> MUST only see Expense A
    list_a = client.get("/api/v1/expenses/", headers=headers_a).json()
    ids_a = [e["id"] for e in list_a]
    assert exp_a_id in ids_a
    assert exp_b_id not in ids_a

    # 6. User B lists expenses -> MUST only see Expense B
    list_b = client.get("/api/v1/expenses/", headers=headers_b).json()
    ids_b = [e["id"] for e in list_b]
    assert exp_b_id in ids_b
    assert exp_a_id not in ids_b

    # 7. User A tries to GET User B's expense directly by ID -> MUST return 404
    get_cross = client.get(f"/api/v1/expenses/{exp_b_id}", headers=headers_a)
    assert get_cross.status_code == 404

    # 8. User A tries to UPDATE User B's expense -> MUST return 404
    put_cross = client.put(f"/api/v1/expenses/{exp_b_id}", headers=headers_a, json={
        "amount_paise": 10000,
        "description": "Hacked Expense"
    })
    assert put_cross.status_code == 404

    # 9. User A tries to DELETE User B's expense -> MUST return 404
    del_cross = client.delete(f"/api/v1/expenses/{exp_b_id}", headers=headers_a)
    assert del_cross.status_code == 404

    # 10. User A tries to DUPLICATE User B's expense -> MUST return 404
    dup_cross = client.post(f"/api/v1/expenses/{exp_b_id}/duplicate", headers=headers_a)
    assert dup_cross.status_code == 404

def test_accounts_and_categories_isolation(client: TestClient):
    """Verify custom categories and accounts are isolated between users."""
    token_a = client.post("/api/v1/auth/register", json={
        "email": "user_cats_a@college.edu",
        "password": "passwordA123",
        "full_name": "Alice Cats",
        "currency": "INR"
    }).json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    token_b = client.post("/api/v1/auth/register", json={
        "email": "user_cats_b@college.edu",
        "password": "passwordB123",
        "full_name": "Bob Cats",
        "currency": "INR"
    }).json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A creates a custom category
    cat_a_res = client.post("/api/v1/categories/", headers=headers_a, json={
        "name": "Robotics Club Alice",
        "group": "College",
        "icon": "bot",
        "color": "#6366f1"
    })
    assert cat_a_res.status_code == 201
    cat_a_id = cat_a_res.json()["id"]

    # User B should NOT see User A's custom category
    cats_b = client.get("/api/v1/categories/", headers=headers_b).json()
    b_cat_names = [c["name"] for c in cats_b]
    assert "Robotics Club Alice" not in b_cat_names

    # User B cannot edit User A's category
    edit_cross = client.put(f"/api/v1/categories/{cat_a_id}", headers=headers_b, json={
        "name": "Modified Name"
    })
    assert edit_cross.status_code == 404

    # User A creates an account
    acc_a_res = client.post("/api/v1/accounts/", headers=headers_a, json={
        "name": "Alice HDFC",
        "type": "bank",
        "balance_paise": 150000
    })
    assert acc_a_res.status_code == 201
    acc_a_id = acc_a_res.json()["id"]

    # User B should NOT see User A's account
    accs_b = client.get("/api/v1/accounts/", headers=headers_b).json()
    b_acc_ids = [a["id"] for a in accs_b]
    assert acc_a_id not in b_acc_ids

def test_income_and_budget_isolation(client: TestClient):
    """Verify Income and Budget records are isolated between users."""
    token_a = client.post("/api/v1/auth/register", json={
        "email": "user_fin_a@college.edu",
        "password": "passwordA123",
        "full_name": "Finance Alpha",
        "currency": "INR"
    }).json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    token_b = client.post("/api/v1/auth/register", json={
        "email": "user_fin_b@college.edu",
        "password": "passwordB123",
        "full_name": "Finance Beta",
        "currency": "INR"
    }).json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A records Income
    inc_a = client.post("/api/v1/income/", headers=headers_a, json={
        "source": "Scholarship",
        "amount_paise": 500000,
        "date": "2026-09-01"
    }).json()

    # User B records Income
    inc_b = client.post("/api/v1/income/", headers=headers_b, json={
        "source": "Pocket Money",
        "amount_paise": 200000,
        "date": "2026-09-01"
    }).json()

    # User A cannot see User B's income
    incomes_a = client.get("/api/v1/income/", headers=headers_a).json()
    inc_ids_a = [i["id"] for i in incomes_a]
    assert inc_a["id"] in inc_ids_a
    assert inc_b["id"] not in inc_ids_a

    # User A cannot update User B's income
    res_cross = client.put(f"/api/v1/income/{inc_b['id']}", headers=headers_a, json={
        "amount_paise": 99999
    })
    assert res_cross.status_code == 404

def test_backup_isolation(client: TestClient):
    """Verify JSON backup contains strictly the requesting user's records."""
    token_a = client.post("/api/v1/auth/register", json={
        "email": "backup_a@college.edu",
        "password": "passwordA123",
        "full_name": "Backup Alpha",
        "currency": "INR"
    }).json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    token_b = client.post("/api/v1/auth/register", json={
        "email": "backup_b@college.edu",
        "password": "passwordB123",
        "full_name": "Backup Beta",
        "currency": "INR"
    }).json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User B creates a secret expense
    cats_b = client.get("/api/v1/categories/", headers=headers_b).json()
    client.post("/api/v1/expenses/", headers=headers_b, json={
        "amount_paise": 123400,
        "category_id": cats_b[0]["id"],
        "date": "2026-09-17",
        "description": "User B Secret Expense"
    })

    # User A exports backup
    backup_a = client.get("/api/v1/backup/export", headers=headers_a).json()
    assert backup_a["user"]["email"] == "backup_a@college.edu"
    for exp in backup_a["expenses"]:
        assert exp["description"] != "User B Secret Expense"

def test_upload_validations_and_isolation(client: TestClient):
    """Verify file upload rejection of invalid types, oversized files, and cross-user attachment deletion."""
    token_a = client.post("/api/v1/auth/register", json={
        "email": "upload_a@college.edu",
        "password": "passwordA123",
        "full_name": "Upload Alpha",
        "currency": "INR"
    }).json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    token_b = client.post("/api/v1/auth/register", json={
        "email": "upload_b@college.edu",
        "password": "passwordB123",
        "full_name": "Upload Beta",
        "currency": "INR"
    }).json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 1. Reject invalid mime type (e.g. text/plain or executable)
    fake_exe = io.BytesIO(b"MZ\x90\x00\x03\x00\x00\x00")
    res_bad_type = client.post(
        "/api/v1/uploads/",
        headers=headers_a,
        files={"file": ("malicious.exe", fake_exe, "application/x-msdownload")}
    )
    assert res_bad_type.status_code == 400
    assert "Unsupported file format" in res_bad_type.json()["detail"]

    # 2. Reject oversized file (> 5MB)
    huge_data = io.BytesIO(b"0" * (6 * 1024 * 1024))
    res_huge = client.post(
        "/api/v1/uploads/",
        headers=headers_a,
        files={"file": ("huge_receipt.png", huge_data, "image/png")}
    )
    assert res_huge.status_code == 400
    assert "File too large" in res_huge.json()["detail"]

    # 3. Accept valid PNG file
    valid_png = io.BytesIO(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR" + b"A" * 100)
    res_valid = client.post(
        "/api/v1/uploads/",
        headers=headers_a,
        files={"file": ("receipt.png", valid_png, "image/png")}
    )
    assert res_valid.status_code == 201
    attach_id = res_valid.json()["id"]

    # 4. User B cannot delete User A's attachment
    del_cross = client.delete(f"/api/v1/uploads/{attach_id}", headers=headers_b)
    assert del_cross.status_code == 404

    # 5. User A can delete their own attachment
    del_own = client.delete(f"/api/v1/uploads/{attach_id}", headers=headers_a)
    assert del_own.status_code == 200
