import pytest
from fastapi.testclient import TestClient
from tests.conftest import create_approved_user
from app.models.models import User
from app.core.config import settings

def test_01_new_registration_creates_pending_user(client: TestClient):
    """1. New registration creates PENDING user and does NOT return access_token."""
    res = client.post("/api/v1/auth/register", json={
        "email": "pending_student@college.edu",
        "password": "Password123!",
        "full_name": "Pending Student",
        "currency": "INR"
    })
    assert res.status_code == 201
    data = res.json()
    assert "access_token" not in data
    assert data["message"] == "Registration successful. Your account is waiting for administrator approval."
    assert data["email"] == "pending_student@college.edu"
    assert data["status"] == "PENDING"

def test_02_pending_user_cannot_login(client: TestClient):
    """2. Pending user cannot login and receives 403 with exact required message."""
    client.post("/api/v1/auth/register", json={
        "email": "pending_login@college.edu",
        "password": "Password123!",
        "full_name": "Pending Login"
    })

    res = client.post("/api/v1/auth/login", json={
        "email": "pending_login@college.edu",
        "password": "Password123!"
    })
    assert res.status_code == 403
    assert res.json()["detail"] == "Your account is awaiting administrator approval."

def test_03_rejected_user_cannot_login(client: TestClient, db_session):
    """3. Rejected user cannot login and receives 403 with exact required message."""
    client.post("/api/v1/auth/register", json={
        "email": "rejected_user@college.edu",
        "password": "Password123!",
        "full_name": "Rejected User"
    })
    user = db_session.query(User).filter(User.email == "rejected_user@college.edu").first()
    user.status = "REJECTED"
    db_session.commit()

    res = client.post("/api/v1/auth/login", json={
        "email": "rejected_user@college.edu",
        "password": "Password123!"
    })
    assert res.status_code == 403
    assert res.json()["detail"] == "Your registration request was rejected."

def test_04_disabled_user_cannot_login(client: TestClient, db_session):
    """4. Disabled user cannot login and receives 403 with exact required message."""
    client.post("/api/v1/auth/register", json={
        "email": "disabled_user@college.edu",
        "password": "Password123!",
        "full_name": "Disabled User"
    })
    user = db_session.query(User).filter(User.email == "disabled_user@college.edu").first()
    user.status = "DISABLED"
    db_session.commit()

    res = client.post("/api/v1/auth/login", json={
        "email": "disabled_user@college.edu",
        "password": "Password123!"
    })
    assert res.status_code == 403
    assert res.json()["detail"] == "Your account has been disabled."

def test_05_approved_user_can_login(client: TestClient, db_session):
    """5. Approved user can login normally and receives access_token."""
    client.post("/api/v1/auth/register", json={
        "email": "approved_user@college.edu",
        "password": "Password123!",
        "full_name": "Approved User"
    })
    user = db_session.query(User).filter(User.email == "approved_user@college.edu").first()
    user.status = "APPROVED"
    db_session.commit()

    res = client.post("/api/v1/auth/login", json={
        "email": "approved_user@college.edu",
        "password": "Password123!"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["status"] == "APPROVED"

def test_06_unapproved_user_token_rejected_by_get_current_user(client: TestClient, db_session):
    """6. Even if a user somehow has an old token, if their status is changed to DISABLED, get_current_user rejects."""
    approved = create_approved_user(client, db_session, "token_check@college.edu", "Password123!", "Token User")
    token = approved["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Verify works when APPROVED
    res1 = client.get("/api/v1/auth/me", headers=headers)
    assert res1.status_code == 200

    # Change status in DB to DISABLED
    user = db_session.query(User).filter(User.email == "token_check@college.edu").first()
    user.status = "DISABLED"
    db_session.commit()

    # Verify rejected
    res2 = client.get("/api/v1/auth/me", headers=headers)
    assert res2.status_code == 403
    assert res2.json()["detail"] == "Your account has been disabled."

def test_07_non_admin_cannot_access_admin_endpoints(client: TestClient, db_session):
    """7. Non-admin user receives 403 Forbidden when calling admin endpoints."""
    normal_user = create_approved_user(client, db_session, "normal@college.edu", "Password123!", "Normal User")
    headers = {"Authorization": f"Bearer {normal_user['access_token']}"}

    assert client.get("/api/v1/admin/users", headers=headers).status_code == 403
    assert client.get("/api/v1/admin/stats", headers=headers).status_code == 403
    assert client.post("/api/v1/admin/users/1/approve", headers=headers).status_code == 403
    assert client.post("/api/v1/admin/users/1/reject", headers=headers).status_code == 403
    assert client.post("/api/v1/admin/users/1/disable", headers=headers).status_code == 403
    assert client.post("/api/v1/admin/users/1/enable", headers=headers).status_code == 403
    assert client.delete("/api/v1/admin/users/1", headers=headers).status_code == 403

def test_08_admin_direct_login_with_correct_credentials_and_stats(client: TestClient, monkeypatch):
    """8. Admin logs in directly via /auth/admin/login using ADMIN_USERNAME and ADMIN_PASSWORD."""
    test_username = "Shahinsha"
    test_password = "testSecureAdminPass123"
    monkeypatch.setattr(settings, "ADMIN_USERNAME", test_username)
    monkeypatch.setattr(settings, "ADMIN_PASSWORD", test_password)

    login_res = client.post("/api/v1/auth/admin/login", json={
        "username": test_username,
        "password": test_password
    })
    assert login_res.status_code == 200
    data = login_res.json()
    assert "access_token" in data
    assert data["user"]["is_admin"] is True
    assert data["user"]["status"] == "APPROVED"
    assert data["user"]["full_name"] == test_username

    admin_headers = {"Authorization": f"Bearer {data['access_token']}"}

    # List users
    users_res = client.get("/api/v1/admin/users", headers=admin_headers)
    assert users_res.status_code == 200
    assert isinstance(users_res.json(), list)

    # Check stats
    stats_res = client.get("/api/v1/admin/stats", headers=admin_headers)
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert "total_users" in stats
    assert "pending_users" in stats
    assert "approved_users" in stats
    assert "disabled_users" in stats
    assert "rejected_users" in stats

def test_09_admin_login_with_wrong_password(client: TestClient, monkeypatch):
    """9. Admin login fails with wrong password (401 Unauthorized)."""
    monkeypatch.setattr(settings, "ADMIN_USERNAME", "Shahinsha")
    monkeypatch.setattr(settings, "ADMIN_PASSWORD", "correctPassword123")

    login_res = client.post("/api/v1/auth/admin/login", json={
        "username": "Shahinsha",
        "password": "wrongPassword"
    })
    assert login_res.status_code == 401
    assert "Incorrect admin username or password" in login_res.json()["detail"]

def test_10_admin_login_with_wrong_username(client: TestClient, monkeypatch):
    """10. Admin login fails with wrong username (401 Unauthorized)."""
    monkeypatch.setattr(settings, "ADMIN_USERNAME", "Shahinsha")
    monkeypatch.setattr(settings, "ADMIN_PASSWORD", "correctPassword123")

    login_res = client.post("/api/v1/auth/admin/login", json={
        "username": "WrongAdmin",
        "password": "correctPassword123"
    })
    assert login_res.status_code == 401
    assert "Incorrect admin username or password" in login_res.json()["detail"]

def test_11_admin_can_approve_pending_user(client: TestClient, db_session, monkeypatch):
    """11. Admin can approve a pending user."""
    monkeypatch.setattr(settings, "ADMIN_USERNAME", "Shahinsha")
    monkeypatch.setattr(settings, "ADMIN_PASSWORD", "adminSecret123")

    login_res = client.post("/api/v1/auth/admin/login", json={
        "username": "Shahinsha",
        "password": "adminSecret123"
    })
    admin_headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    # Register new user
    client.post("/api/v1/auth/register", json={
        "email": "to_approve@college.edu",
        "password": "UserPass123!",
        "full_name": "To Approve"
    })
    target_user = db_session.query(User).filter(User.email == "to_approve@college.edu").first()
    assert target_user.status == "PENDING"

    # Approve
    approve_res = client.post(f"/api/v1/admin/users/{target_user.id}/approve", headers=admin_headers)
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "APPROVED"

    # User can now login
    user_login = client.post("/api/v1/auth/login", json={"email": "to_approve@college.edu", "password": "UserPass123!"})
    assert user_login.status_code == 200

def test_12_admin_can_reject_pending_user(client: TestClient, db_session, monkeypatch):
    """12. Admin can reject a pending user."""
    monkeypatch.setattr(settings, "ADMIN_USERNAME", "Shahinsha")
    monkeypatch.setattr(settings, "ADMIN_PASSWORD", "adminSecret123")

    login_res = client.post("/api/v1/auth/admin/login", json={
        "username": "Shahinsha",
        "password": "adminSecret123"
    })
    admin_headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    client.post("/api/v1/auth/register", json={
        "email": "to_reject@college.edu",
        "password": "UserPass123!",
        "full_name": "To Reject"
    })
    target_user = db_session.query(User).filter(User.email == "to_reject@college.edu").first()

    reject_res = client.post(f"/api/v1/admin/users/{target_user.id}/reject", headers=admin_headers)
    assert reject_res.status_code == 200
    assert reject_res.json()["status"] == "REJECTED"

    user_login = client.post("/api/v1/auth/login", json={"email": "to_reject@college.edu", "password": "UserPass123!"})
    assert user_login.status_code == 403
    assert user_login.json()["detail"] == "Your registration request was rejected."

def test_13_admin_can_disable_and_enable_user(client: TestClient, db_session, monkeypatch):
    """13. Admin can disable an approved user and re-enable them."""
    monkeypatch.setattr(settings, "ADMIN_USERNAME", "Shahinsha")
    monkeypatch.setattr(settings, "ADMIN_PASSWORD", "adminSecret123")

    login_res = client.post("/api/v1/auth/admin/login", json={
        "username": "Shahinsha",
        "password": "adminSecret123"
    })
    admin_headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    target_res = create_approved_user(client, db_session, "toggle_user@college.edu", "UserPass123!", "Toggle User")
    target_id = target_res["user"]["id"]

    # Disable
    dis_res = client.post(f"/api/v1/admin/users/{target_id}/disable", headers=admin_headers)
    assert dis_res.status_code == 200
    assert dis_res.json()["status"] == "DISABLED"

    # User cannot login
    assert client.post("/api/v1/auth/login", json={"email": "toggle_user@college.edu", "password": "UserPass123!"}).status_code == 403

    # Enable
    en_res = client.post(f"/api/v1/admin/users/{target_id}/enable", headers=admin_headers)
    assert en_res.status_code == 200
    assert en_res.json()["status"] == "APPROVED"

    # User can login again
    assert client.post("/api/v1/auth/login", json={"email": "toggle_user@college.edu", "password": "UserPass123!"}).status_code == 200

def test_14_admin_can_delete_user(client: TestClient, db_session, monkeypatch):
    """14. Admin can delete a user."""
    monkeypatch.setattr(settings, "ADMIN_USERNAME", "Shahinsha")
    monkeypatch.setattr(settings, "ADMIN_PASSWORD", "adminSecret123")

    login_res = client.post("/api/v1/auth/admin/login", json={
        "username": "Shahinsha",
        "password": "adminSecret123"
    })
    admin_headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    target_res = create_approved_user(client, db_session, "victim@college.edu", "UserPass123!", "Victim")
    target_id = target_res["user"]["id"]

    del_res = client.delete(f"/api/v1/admin/users/{target_id}", headers=admin_headers)
    assert del_res.status_code == 200
    assert del_res.json()["message"] == "User deleted successfully"

    assert db_session.query(User).filter(User.id == target_id).first() is None

def test_15_user_cannot_modify_is_admin_or_status(client: TestClient, db_session):
    """15. Regular user cannot modify is_admin or status via PUT /me."""
    user_res = create_approved_user(client, db_session, "attacker@college.edu", "Password123!", "Attacker")
    headers = {"Authorization": f"Bearer {user_res['access_token']}"}

    res = client.put("/api/v1/auth/me", headers=headers, json={
        "full_name": "Elevated Attacker",
        "is_admin": True,
        "status": "APPROVED"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["full_name"] == "Elevated Attacker"
    assert data["is_admin"] is False

    db_user = db_session.query(User).filter(User.email == "attacker@college.edu").first()
    assert db_user.is_admin is False

def test_16_max_users_blocks_new_registration(client: TestClient, db_session, monkeypatch):
    """16. MAX_USERS blocks new registration when count is reached."""
    current_count = db_session.query(User).count()
    monkeypatch.setattr(settings, "MAX_USERS", current_count)

    res = client.post("/api/v1/auth/register", json={
        "email": "over_limit@college.edu",
        "password": "Password123!",
        "full_name": "Over Limit"
    })
    assert res.status_code == 403
    assert "Registration is currently closed because the maximum number of users has been reached." in res.json()["detail"]

def test_17_admin_endpoints_never_leak_password_or_secrets(client: TestClient, monkeypatch):
    """17. Admin user listing and detail endpoints never expose passwords, hashes, or sensitive keys."""
    monkeypatch.setattr(settings, "ADMIN_USERNAME", "Shahinsha")
    monkeypatch.setattr(settings, "ADMIN_PASSWORD", "adminSecret123")

    login_res = client.post("/api/v1/auth/admin/login", json={
        "username": "Shahinsha",
        "password": "adminSecret123"
    })
    admin_headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    users_res = client.get("/api/v1/admin/users", headers=admin_headers)
    assert users_res.status_code == 200
    for u in users_res.json():
        assert "password" not in u
        assert "hashed_password" not in u
        assert "password_hash" not in u
        assert "token" not in u
        assert "secret" not in u

def test_18_admin_get_me_returns_admin_profile(client: TestClient, monkeypatch):
    """18. Calling GET /api/v1/auth/me with admin token returns admin profile with is_admin=True."""
    monkeypatch.setattr(settings, "ADMIN_USERNAME", "Shahinsha")
    monkeypatch.setattr(settings, "ADMIN_PASSWORD", "adminSecret123")

    login_res = client.post("/api/v1/auth/admin/login", json={
        "username": "Shahinsha",
        "password": "adminSecret123"
    })
    admin_token = login_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    me_res = client.get("/api/v1/auth/me", headers=admin_headers)
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["is_admin"] is True
    assert me_data["full_name"] == "Shahinsha"
    assert me_data["status"] == "APPROVED"
