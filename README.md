# FinStudent 🎓 • Personal Student Expense Tracker

FinStudent is a modern, lightning-fast, mobile-first **Personal Student Expense Tracker Web Application** designed specifically for college students to record, manage, analyze, and control daily expenses.

The application is engineered to run seamlessly across both your smartphone and laptop with real-time cloud data synchronization, zero cost (**₹0/month**), and rock-solid user data isolation.

> **Adding an expense takes only 3 seconds, while the dashboard clearly shows where your money is going.**

---

## 🚀 Live Production URLs

| Component | Service | URL |
|---|---|---|
| **Frontend** | Vercel Free | `https://finstudent.vercel.app` (or your personal Vercel deployment) |
| **Backend API** | Render / Koyeb Free | `https://finstudent-api.onrender.com` |
| **Interactive API Docs** | Swagger UI | `https://finstudent-api.onrender.com/api/v1/docs` |
| **Database** | Supabase PostgreSQL | Free Tier (500MB DB + 1GB Storage) |
| **PWA** | Installable Web App | Supported (iOS Safari / Android Chrome) |

---

## ✨ Highlights & Key Features

* **⚡ 3-Second Quick Expense Logging**: Instant auto-focused numeric input, 1-tap quick amount chips (`₹10`, `₹20`, `₹50`, `₹100`, `₹200`, `₹500`), pre-seeded student categories, and one-tap UPI / Cash toggle. Keyboard shortcut: press <kbd>N</kbd> anywhere to open.
* **💰 Strict Financial Accuracy (Integer Paise)**: All financial balances and calculations are stored and computed in integer paise (`₹1.00 = 100 paise`), preventing floating-point precision loss.
* **📊 Visual Student Dashboard**: Contextual college greeting, today/week/month metric cards, liquid net balance, dynamic budget progress bar, donut category breakdown, 7-day spending trends, and rule-based insights.
* **🎯 Monthly & Category Budgets**: Set an overall monthly ceiling (e.g., ₹8,000/mo) with custom alert thresholds (e.g., 80%) and category-level caps (Food, Stationery, Fuel, Printing).
* **📈 Reports & Analytics**: Date range filters, average daily spending, top spending categories, payment method distribution, and 1-click **CSV** and **Excel (.xlsx)** exports.
* **📅 Spending Calendar**: Month-by-month heatmap grid displaying days with activity and transaction breakdowns.
* **💳 Wallets & Accounts**: Track physical Cash in pocket separately from UPI accounts (Google Pay, PhonePe, Paytm) and Bank savings.
* **🔄 Recurring Expenses**: Automatically track repeating monthly bills (hostel mess fees, mobile data recharge, subscriptions).
* **💵 Income Tracking**: Record family pocket money, scholarships, tutoring, and freelance earnings.
* **🎯 Savings Goals**: Track progress toward student targets (new laptop, semester trip, exam fees).
* **📎 Receipt Attachments**: Optional receipt upload to **Supabase Storage** with strict validation (JPEG, PNG, WebP, PDF up to 5MB) and one-click deletion.
* **🔒 Total User Data Isolation**: Strict user ownership on all endpoints. User A can never view, update, delete, or export User B's records.
* **🛡️ Non-Destructive JSON Backup & Restore**: Export all your categories, expenses, wallets, and budgets to JSON; safely restore with replace or merge modes.
* **📱 Progressive Web App (PWA)**: Installable directly to home screen on iOS and Android with standalone view, offline app shell caching, and theme color.

---

## 🛠️ Technology Stack

* **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, Recharts.
* **Backend**: FastAPI, Python 3.11, SQLAlchemy 2.0, Pydantic v2, Uvicorn, Alembic.
* **Database**: **Supabase PostgreSQL** (Production) / SQLite (Local Development & Testing).
* **Storage**: **Supabase Storage** (Receipt attachments bucket `receipts`).
* **Deployment**: **Vercel Free** (Frontend) + **Render / Koyeb Free Tier** (Backend Docker Container).

---

## 💻 Local Development Setup

### Prerequisites
* Python 3.11+
* Node.js 18+ and npm
* Git

### 1. Backend Setup

```bash
# Navigate to project root
cd "Expense Tracker"

# Activate virtual environment (Windows)
.\venv\Scripts\Activate.ps1
# On Linux/macOS: source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Run database migrations (or creates SQLite tables automatically)
cd backend
alembic upgrade head
cd ..

# Start FastAPI backend server
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation will be live at: `http://127.0.0.1:8000/api/v1/docs`

### 2. Frontend Setup

In a second terminal window:

```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Frontend will be live at: `http://localhost:5173`

---

## 🐘 Supabase Setup Guide

Follow these exact steps to set up your free cloud database and receipt storage on Supabase:

1. **Create Supabase Account**: Visit [supabase.com](https://supabase.com) and sign in for free.
2. **Create New Project**:
   - Click **New Project**.
   - Name: `finstudent` (or your preferred name).
   - Generate a strong database password (keep this safe!).
   - Region: Select the region closest to you (e.g. `ap-south-1` Mumbai).
   - Select the **Free Tier** ($0/month).
3. **Obtain Connection String**:
   - In your project dashboard, go to **Project Settings** ➔ **Database**.
   - Under **Connection string**, select **URI**.
   - Copy the URI:
     ```text
     postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
     ```
   - (Optional for serverless/container pooling): Under **Connection Pooling**, choose Mode `Transaction` (port 6543) if you experience connection limits.
4. **Create Receipt Storage Bucket**:
   - In the left sidebar, click **Storage** ➔ **New Bucket**.
   - Name: `receipts` (lowercase).
   - Set bucket to **Public** (recommended so uploaded receipt URLs can be viewed in the browser) or private with authenticated access.
   - Click **Save**.
5. **Obtain Supabase API Keys**:
   - In **Project Settings** ➔ **API**, copy:
     - **Project URL** (`https://[PROJECT-REF].supabase.co`)
     - **anon public key** or **service_role secret key** (Used strictly in the backend `.env`, NEVER in frontend!).
6. **Apply Schema / Migrations**:
   Run the Alembic migration directly against Supabase:
   ```bash
   cd backend
   $env:DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
   alembic upgrade head
   ```
7. **Test Database Connection**:
   Start the backend with `DATABASE_URL` set to your Supabase connection string.
   Check `http://localhost:8000/health` ➔ `{"status": "ok"}`.

---

## 🔄 SQLite to Supabase Migration Script

If you have existing expenses in your local `expense_tracker.db`, migrate them safely without deleting or losing records:

```bash
cd backend

# Step 1: Preview migration in dry-run mode (does not modify anything)
python scripts/migrate_sqlite_to_pg.py --dry-run --sqlite-path ../expense_tracker.db

# Step 2: Run safe migration to Supabase PostgreSQL
python scripts/migrate_sqlite_to_pg.py \
  --sqlite-path ../expense_tracker.db \
  --pg-url "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

What this script does:
1. Creates an automatic timestamped backup file: `expense_tracker.db.bak_YYYYMMDD_HHMMSS`.
2. Inserts all rows preserving IDs, dates, and paise amounts.
3. Automatically updates PostgreSQL sequences (`setval`) so future records never encounter ID conflicts.
4. Compares table counts before and after to verify 100% data integrity.

---

## ☁️ Free-Tier Deployment Guide (₹0/Month)

### 1. Backend Deployment (Render Free Web Service)

Render provides free container hosting with 750 free hours/month.

1. Push your repository to GitHub (ensure `.env` and `expense_tracker.db` are excluded by `.gitignore`).
2. Go to [render.com](https://render.com) and click **New +** ➔ **Web Service**.
3. Connect your GitHub repository.
4. Settings:
   - **Root Directory**: `backend`
   - **Environment**: `Docker` (or Python 3: Build Command `pip install -r requirements.txt`, Start Command `uvicorn app.main:app --host 0.0.0.0 --port $PORT`)
   - **Plan**: Free ($0/month)
5. Add **Environment Variables** in Render:
   - `DATABASE_URL`: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`
   - `SECRET_KEY`: (generate 32+ character random string)
   - `FRONTEND_URL`: `https://your-finstudent.vercel.app`
   - `SUPABASE_URL`: `https://[PROJECT-REF].supabase.co`
   - `SUPABASE_KEY`: `[YOUR-SUPABASE-KEY]`
   - `SUPABASE_STORAGE_BUCKET`: `receipts`
6. Click **Deploy Web Service**.
7. Once deployed, verify your health check:
   `https://[YOUR-RENDER-APP].onrender.com/health` ➔ `{"status": "ok"}`.

### 2. Frontend Deployment (Vercel Free)

1. Go to [vercel.com](https://vercel.com) and click **Add New...** ➔ **Project**.
2. Import your GitHub repository.
3. Configuration:
   - **Root Directory**: Click edit and select `frontend`.
   - **Framework Preset**: Vite.
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add **Environment Variables**:
   - `VITE_API_URL`: `https://[YOUR-RENDER-APP].onrender.com`
5. Click **Deploy**.
6. Instant SSL and global edge CDN are automatically provisioned at `https://[YOUR-PROJECT].vercel.app`.

---

## 📱 PWA Installation Guide

Install FinStudent as a native app on your phone:

### On iPhone (iOS Safari)
1. Open your Vercel URL in Safari (e.g. `https://finstudent.vercel.app`).
2. Tap the **Share** icon (square with arrow up) at the bottom toolbar.
3. Scroll down and tap **Add to Home Screen**.
4. Confirm the name **FinStudent** and tap **Add**.
5. Tap the new app icon on your home screen for full-screen standalone mode.

### On Android (Chrome)
1. Open your Vercel URL in Google Chrome.
2. Tap the **three dots menu** (⋮) in the top right corner.
3. Tap **Install app** or **Add to Home screen**.
4. Tap **Install** to add FinStudent to your app drawer and home screen.

---

## 🔐 Environment Variables Reference

| Variable | Scope | Description | Example |
|---|---|---|---|
| `DATABASE_URL` | Backend | Supabase PostgreSQL or SQLite connection string | `postgresql://postgres:pass@db.xxx.supabase.co:5432/postgres` |
| `SECRET_KEY` | Backend | 32+ char secret for signing JWT auth tokens | `f7a6b9...` |
| `ALGORITHM` | Backend | JWT signing algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Backend | Token validity period (default: 7 days) | `10080` |
| `FRONTEND_URL` | Backend | Allowed origin for CORS headers | `https://finstudent.vercel.app` |
| `SUPABASE_URL` | Backend | Supabase project URL | `https://xyzcompany.supabase.co` |
| `SUPABASE_KEY` | Backend | Supabase service/anon key (Keep server-side only!) | `eyJhbGciOi...` |
| `SUPABASE_STORAGE_BUCKET` | Backend | Storage bucket for receipt files | `receipts` |
| `MAX_UPLOAD_SIZE_MB` | Backend | Maximum allowed receipt size | `5` |
| `VITE_API_URL` | Frontend | Deployed backend API domain | `https://finstudent-api.onrender.com` |

> [!CAUTION]
> **Never commit your Supabase Service Role Key or database password to GitHub.** Always use environment variables in Render and Vercel dashboards.

---

## ⚖️ Free-Tier Limitations & Quotas

| Service | Free Tier Allocation | What Happens If Limit Is Reached? |
|---|---|---|
| **Supabase PostgreSQL** | 500 MB database size | Exceeding 500MB restricts further writes until old data is exported/pruned. (500MB holds ~1,000,000+ text expense rows). |
| **Supabase Inactivity** | Paused after 7 days without queries | Free projects pause after 7 consecutive days of inactivity. Simply logging into the Supabase dashboard and clicking "Restore" unpauses it in ~1 minute. Logging 1 expense/week keeps it active indefinitely. |
| **Supabase Storage** | 1 GB file storage | Reject new image uploads when full. Delete old receipts directly from the app to free space. |
| **Render Web Service** | 750 free hours/month | Instances spin down after 15 minutes of inactivity. The first request after sleep experiences a ~45-50 second cold start. Subsequent requests respond in milliseconds. |
| **Vercel Frontend** | 100 GB bandwidth / month | Sufficient for hundreds of thousands of personal page visits monthly. |

---

## 🧪 Automated Testing

Run the test suite covering authentication, CRUD, user data isolation, financial calculations, and upload validations:

```bash
# Run all tests
.\venv\Scripts\python.exe -m pytest backend/tests/ -v
```

Test coverage includes:
- `test_health_endpoint`: Verifies `GET /health` returns `{"status": "ok"}`.
- `test_user_data_isolation_expenses`: Verifies User A cannot read, edit, delete, or duplicate User B's expenses.
- `test_accounts_and_categories_isolation`: Verifies custom categories and wallets cannot be viewed or modified across accounts.
- `test_income_and_budget_isolation`: Verifies cross-user budget and income isolation.
- `test_backup_isolation`: Verifies exported JSON backups contain only the requesting user's records.
- `test_upload_validations_and_isolation`: Rejects invalid file formats (e.g. `.exe`) and oversized files (>5MB); verifies cross-user attachment deletion protection.
- `test_all_flows`: Complete end-to-end user workflows.

---

## 📄 License
MIT License. Free for students and personal use.
