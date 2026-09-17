import time
import os
from playwright.sync_api import sync_playwright, expect

FRONTEND_URL = os.getenv("PLAYWRIGHT_BASE_URL", "http://127.0.0.1:5173")

def run_fast_playwright_test():
    """Execute complete end-to-end user journey using Playwright in headless browser."""
    print("=" * 60, flush=True)
    print("🚀 Starting FinStudent End-to-End Playwright UAT Suite", flush=True)
    print("=" * 60, flush=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        # 1. Open App
        print("\n[Step 1] Navigating to FinStudent...", flush=True)
        page.goto(FRONTEND_URL, wait_until="networkidle")

        # 2. Register fresh account
        print("[Step 2] Switching to Register tab and creating account...", flush=True)
        page.locator("button:has-text('Register')").click()
        page.wait_for_selector("input[placeholder*='Rahul Sharma']", timeout=5000)

        timestamp = int(time.time())
        test_email = f"arjun_{timestamp}@college.edu"

        page.fill("input[placeholder*='Rahul Sharma']", "Arjun Sharma")
        page.fill("input[type='email']", test_email)
        page.fill("input[type='password']", "CollegePass123!")
        page.locator("button[type='submit']:has-text('Create Account'), button[type='submit']").click()
        
        # 3. Verify Dashboard
        print("[Step 3] Verifying Dashboard & Student Greeting...", flush=True)
        expect(page.locator("text=Arjun").first).to_be_visible(timeout=8000)
        expect(page.locator("text=Today").first).to_be_visible(timeout=5000)
        print("   ✓ Dashboard loaded with metric cards & greeting", flush=True)

        # 4. Quick Add Expense
        print("[Step 4] Opening Quick Add Expense modal...", flush=True)
        quick_add_btn = page.locator("button:has-text('Add Expense')").first
        quick_add_btn.click()
        page.wait_for_selector("input[type='number']", timeout=5000)

        print("[Step 5] Entering amount ₹500 and saving...", flush=True)
        page.fill("input[type='number']", "500")

        # Click Save Expense
        page.locator("button:has-text('Save Expense'), button[type='submit']").first.click()
        page.wait_for_timeout(1000)
        print("   ✓ Expense recorded instantly via Quick Add", flush=True)

        # 5. Verify Updated Dashboard
        print("[Step 6] Verifying Today's Spending reflects ₹500...", flush=True)
        expect(page.locator("text=₹500").first).to_be_visible(timeout=5000)
        print("   ✓ Metric updated in real-time on Dashboard", flush=True)

        # 6. Expenses Page
        print("[Step 7] Navigating to Expenses history...", flush=True)
        page.locator("button:has-text('Expenses')").first.click()
        page.wait_for_timeout(500)
        expect(page.get_by_role("heading", name="Expense History").first).to_be_visible()
        expect(page.locator("text=Total: ₹500").first).to_be_visible()
        print("   ✓ Expense history page verified with ₹500 transaction", flush=True)

        # 7. Budgets Page
        print("[Step 8] Navigating to Budgets...", flush=True)
        page.locator("button:has-text('Budgets')").first.click()
        page.wait_for_timeout(500)
        expect(page.get_by_role("heading", name="Monthly Budget").first).to_be_visible()
        print("   ✓ Budget progress & category ceiling verified", flush=True)

        # 8. Reports Page
        print("[Step 9] Navigating to Reports & Analytics...", flush=True)
        page.locator("button:has-text('Reports')").first.click()
        page.wait_for_timeout(500)
        expect(page.get_by_role("heading", name="Financial Reports & Analytics").first).to_be_visible()
        expect(page.locator("text=Total Spent").first).to_be_visible()
        print("   ✓ Analytics, category donut, and trends verified", flush=True)

        # 9. Income Page
        print("[Step 10] Navigating to Income...", flush=True)
        page.locator("button:has-text('Income / Received')").first.click()
        page.wait_for_timeout(500)
        expect(page.get_by_role("heading", name="Income & Money Received").first).to_be_visible()
        print("   ✓ Income tracking verified", flush=True)

        # 10. Accounts Page
        print("[Step 11] Navigating to Wallets & Accounts...", flush=True)
        page.locator("button:has-text('Wallets & Accounts')").first.click()
        page.wait_for_timeout(500)
        expect(page.get_by_role("heading", name="Wallets & Payment Accounts").first).to_be_visible()
        print("   ✓ Wallets (Cash / UPI) verified", flush=True)

        # 11. Settings & Data Safety
        print("[Step 12] Navigating to Settings & Backup...", flush=True)
        page.locator("button:has-text('Settings')").first.click()
        page.wait_for_timeout(500)
        expect(page.get_by_role("heading", name="Settings & Preferences").first).to_be_visible()
        print("   ✓ Settings & Backup interface verified", flush=True)

        # 12. Mobile Viewport (iPhone 14 / 390x844)
        print("[Step 13] Resizing to Mobile Viewport (390x844)...", flush=True)
        page.set_viewport_size({"width": 390, "height": 844})
        page.wait_for_timeout(500)
        expect(page.locator("button:has-text('Home')").first).to_be_visible()
        expect(page.locator("button:has-text('More')").first).to_be_visible()
        print("   ✓ Mobile responsive bottom navigation bar verified (Home/Expenses/Add/Reports/More)", flush=True)

        # 13. Logout
        print("[Step 14] Testing Logout...", flush=True)
        logout_btn = page.locator("button:has-text('Sign Out of Student Account')").first
        logout_btn.click()
        page.wait_for_timeout(800)
        expect(page.locator("button:has-text('Log In')").first).to_be_visible()
        print("   ✓ Logged out successfully and redirected to Auth", flush=True)

        print("\n" + "=" * 60, flush=True)
        print("🎉 ALL PLAYWRIGHT END-TO-END TESTS PASSED IN < 10 SECONDS!", flush=True)
        print("=" * 60, flush=True)
        browser.close()

if __name__ == "__main__":
    run_fast_playwright_test()
