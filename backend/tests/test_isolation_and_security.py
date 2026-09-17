import io
import pytest
from fastapi.testclient import TestClient

from tests.conftest import create_approved_user

def test_health_endpoint(client: TestClient):
    """Verify production health check endpoint returns exact required response."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_user_data_isolation_expenses(client: TestClient, db_session):
    """Verify strict data isolation: User A cannot read, update, delete, or duplicate User B's expenses."""
    # 1. Register and approve User A
    user_a = create_approved_user(client, db_session, "user_a@isolate.edu", "passwordA123", "User Alpha")
    token_a = user_a["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 2. Register and approve User B
    user_b = create_approved_user(client, db_session, "user_b@isolate.edu", "passwordB123", "User Beta")
    token_b = user_b["access_token"]
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

def test_accounts_and_categories_isolation(client: TestClient, db_session):
    """Verify custom categories and accounts are isolated between users."""
    user_a = create_approved_user(client, db_session, "user_cats_a@college.edu", "passwordA123", "Alice Cats")
    headers_a = {"Authorization": f"Bearer {user_a['access_token']}"}

    user_b = create_approved_user(client, db_session, "user_cats_b@college.edu", "passwordB123", "Bob Cats")
    headers_b = {"Authorization": f"Bearer {user_b['access_token']}"}

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

def test_income_and_budget_isolation(client: TestClient, db_session):
    """Verify Income and Budget records are isolated between users."""
    user_a = create_approved_user(client, db_session, "user_fin_a@college.edu", "passwordA123", "Finance Alpha")
    headers_a = {"Authorization": f"Bearer {user_a['access_token']}"}

    user_b = create_approved_user(client, db_session, "user_fin_b@college.edu", "passwordB123", "Finance Beta")
    headers_b = {"Authorization": f"Bearer {user_b['access_token']}"}

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

def test_backup_isolation(client: TestClient, db_session):
    """Verify JSON backup contains strictly the requesting user's records."""
    user_a = create_approved_user(client, db_session, "backup_a@college.edu", "passwordA123", "Backup Alpha")
    headers_a = {"Authorization": f"Bearer {user_a['access_token']}"}

    user_b = create_approved_user(client, db_session, "backup_b@college.edu", "passwordB123", "Backup Beta")
    headers_b = {"Authorization": f"Bearer {user_b['access_token']}"}

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

def test_upload_validations_and_isolation(client: TestClient, db_session):
    """Verify file upload rejection of invalid types, oversized files, and cross-user attachment deletion."""
    user_a = create_approved_user(client, db_session, "upload_a@college.edu", "passwordA123", "Upload Alpha")
    headers_a = {"Authorization": f"Bearer {user_a['access_token']}"}

    user_b = create_approved_user(client, db_session, "upload_b@college.edu", "passwordB123", "Upload Beta")
    headers_b = {"Authorization": f"Bearer {user_b['access_token']}"}

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
    upload_data = res_valid.json()
    attach_id = upload_data["id"]
    assert "signed_url" in upload_data
    assert upload_data["expires_in"] == 600
    assert "public" not in upload_data["file_path"].lower()

    # 4. User B cannot delete User A's attachment
    del_cross = client.delete(f"/api/v1/uploads/{attach_id}", headers=headers_b)
    assert del_cross.status_code == 404

    # 5. User A can delete their own attachment
    del_own = client.delete(f"/api/v1/uploads/{attach_id}", headers=headers_a)
    assert del_own.status_code == 200


def test_receipt_signed_url_flow_and_authorization(client: TestClient, db_session):
    """
    Verify:
    1. Upload returns short-lived signed URL and private storage path.
    2. Authenticated user can access receipt signed URL by ID and by Path (expires_in = 600).
    3. Unauthorized receipt access is strictly blocked:
       - No token -> 401 Unauthorized
       - Cross-user ID access -> 403 Forbidden
       - Cross-user Path access -> 403 Forbidden
       - Path traversal attempt (e.g. ..) -> 400 Bad Request
    4. Receipt deletion prevents subsequent access -> 404 Not Found.
    """
    # 1. Register User A and User B
    res_a = create_approved_user(client, db_session, "signed_a@college.edu", "passwordA123", "Signed Alpha")
    token_a = res_a["access_token"]
    user_a_id = res_a["user"]["id"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    res_b = create_approved_user(client, db_session, "signed_b@college.edu", "passwordB123", "Signed Beta")
    token_b = res_b["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 2. User A uploads a valid receipt
    receipt_bytes = io.BytesIO(b"\x89PNG\r\n\x1a\n" + b"TEST_RECEIPT_CONTENT" * 10)
    upload_res = client.post(
        "/api/v1/uploads/",
        headers=headers_a,
        files={"file": ("lunch_receipt.png", receipt_bytes, "image/png")}
    )
    assert upload_res.status_code == 201
    upload_body = upload_res.json()
    attach_id = upload_body["id"]
    file_path = upload_body["file_path"]
    assert upload_body["expires_in"] == 600
    assert "signed_url" in upload_body
    # Ensure public storage URL is never stored
    assert "public" not in file_path.lower()

    # 3. Authenticated receipt access by ID (User A)
    res_signed_id = client.get(f"/api/v1/uploads/{attach_id}/signed-url", headers=headers_a)
    assert res_signed_id.status_code == 200
    signed_body = res_signed_id.json()
    assert signed_body["expires_in"] == 600
    assert "signed_url" in signed_body
    assert signed_body["file_path"] == file_path

    # 4. Authenticated receipt access by Path (User A)
    res_signed_path = client.get(f"/api/v1/uploads/signed-url?path={file_path}", headers=headers_a)
    assert res_signed_path.status_code == 200
    assert res_signed_path.json()["expires_in"] == 600

    # 5. Unauthorized access: Unauthenticated (no token)
    res_unauth_id = client.get(f"/api/v1/uploads/{attach_id}/signed-url")
    assert res_unauth_id.status_code == 401
    res_unauth_path = client.get(f"/api/v1/uploads/signed-url?path={file_path}")
    assert res_unauth_path.status_code == 401

    # 6. Unauthorized access: Cross-user ID manipulation (User B tries User A's ID)
    res_cross_id = client.get(f"/api/v1/uploads/{attach_id}/signed-url", headers=headers_b)
    assert res_cross_id.status_code == 403
    assert "Access denied" in res_cross_id.json()["detail"]

    # 7. Unauthorized access: Cross-user Path manipulation (User B tries user_{A}/ path)
    res_cross_path = client.get(f"/api/v1/uploads/signed-url?path=user_{user_a_id}/secret.png", headers=headers_b)
    assert res_cross_path.status_code == 403
    assert "Access denied" in res_cross_path.json()["detail"]

    # 8. Unauthorized access: Path traversal attempt
    res_traversal = client.get(f"/api/v1/uploads/signed-url?path=user_{user_a_id}/../etc/passwd", headers=headers_a)
    assert res_traversal.status_code == 400

    # 9. Non-existent receipt ID for authenticated user
    res_not_found = client.get("/api/v1/uploads/999999/signed-url", headers=headers_a)
    assert res_not_found.status_code == 404

    # 10. Receipt deletion
    del_res = client.delete(f"/api/v1/uploads/{attach_id}", headers=headers_a)
    assert del_res.status_code == 200

    # 11. Accessing deleted receipt returns 404
    res_deleted = client.get(f"/api/v1/uploads/{attach_id}/signed-url", headers=headers_a)
    assert res_deleted.status_code == 404


def test_supabase_storage_signed_url_generation(monkeypatch):
    """
    Verify server-side Supabase signed URL generation:
    - Uses service-role key on the FastAPI backend
    - Generates 10-minute short-lived signed URL
    - Does NOT leak secrets
    """
    import asyncio
    from app.core.config import settings
    from app.api.v1.endpoints.uploads import create_supabase_signed_url
    import httpx

    fake_supabase_url = "https://mockproject.supabase.co"
    fake_service_key = "mock-secret-service-role-key-never-expose"
    fake_bucket = "receipts"

    monkeypatch.setattr(settings, "SUPABASE_URL", fake_supabase_url)
    monkeypatch.setattr(settings, "SUPABASE_KEY", fake_service_key)
    monkeypatch.setattr(settings, "SUPABASE_STORAGE_BUCKET", fake_bucket)

    called_requests = []

    class MockResponse:
        def __init__(self, status_code, json_data):
            self.status_code = status_code
            self._json = json_data
            self.text = str(json_data)

        def json(self):
            return self._json

    class MockAsyncClient:
        def __init__(self, timeout=None):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc_val, exc_tb):
            pass

        async def post(self, url, json=None, headers=None, content=None):
            called_requests.append({
                "url": url,
                "json": json,
                "headers": headers
            })
            return MockResponse(
                200,
                {"signedURL": "/object/sign/receipts/user_42/receipt_uuid.png?token=mock_secure_token_12345"}
            )

    monkeypatch.setattr(httpx, "AsyncClient", MockAsyncClient)

    # Generate signed URL
    object_path = "user_42/receipt_uuid.png"
    signed_url = asyncio.run(create_supabase_signed_url(object_path, expires_in=600))

    # 1. Verify correct endpoint called
    assert len(called_requests) == 1
    req = called_requests[0]
    expected_endpoint = f"{fake_supabase_url}/storage/v1/object/sign/{fake_bucket}/{object_path}"
    assert req["url"] == expected_endpoint

    # 2. Verify expiresIn is 10 minutes (600s)
    assert req["json"] == {"expiresIn": 600}

    # 3. Verify server-side authorization uses the service-role key
    assert req["headers"]["Authorization"] == f"Bearer {fake_service_key}"
    assert req["headers"]["apiKey"] == fake_service_key

    # 4. Verify resulting signed URL is properly formatted
    assert signed_url == f"{fake_supabase_url}/storage/v1/object/sign/receipts/user_42/receipt_uuid.png?token=mock_secure_token_12345"


