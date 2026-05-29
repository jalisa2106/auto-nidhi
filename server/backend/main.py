from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Auth Routes
from backend.routes.signup import router as signup_router
from backend.routes.login import router as login_router
from backend.routes.forgot_password import router as forgot_password_router
from backend.routes.profile import router as profile_router
from backend.routes.auth.profile import router as auth_profile_router
# Admin Routes
from backend.routes.admin.dashboard import router as dashboard_router
from backend.routes.admin.customers import router as customers_router
from backend.routes.admin.files import router as files_router
from backend.routes.admin.payments_in import router as payments_in_router
from backend.routes.admin.loans import router as loans_router
from backend.routes.admin.payments_out import router as payments_out_router
from backend.routes.admin.rto_payments import router as rto_payments_router
from backend.routes.admin.commissions_in import router as commissions_in_router
from backend.routes.admin.commissions_out import router as commissions_out_router
from backend.routes.admin.expenses import router as expenses_router
from backend.routes.admin.advances import router as advances_router
from backend.routes.admin.insurance_payments import router as insurance_payments_router

from backend.routes.admin.notifications import router as notifications_router

# Customer Routes
from backend.routes.customer.dashboard import router as customer_dashboard_router
from backend.routes.customer.profile import router as customer_profile_router
from backend.routes.customer.insurance import router as customer_insurance_router
from backend.routes.customer.settings import router as customer_settings_router
from backend.routes.customer.payments import router as customer_payments_router
from backend.routes.customer.documents import router as customer_documents_router

#Masters Routes
from backend.routes.admin.brokers import router as brokers_router
from backend.routes.admin.insurance_companies import router as insurance_companies_router
from backend.routes.admin.insurance_types import router as insurance_types_router
from backend.routes.admin.finance_banks import router as finance_banks_router
from backend.routes.admin.dealers import router as dealers_router
from backend.routes.admin.expense_categories import router as expense_categories_router

# Settings Routes
from backend.routes.admin.company_settings import router as company_settings_router
from backend.routes.admin.bank_accounts import router as bank_accounts_router
from backend.routes.admin.users_settings import router as users_settings_router
from backend.routes.admin.admin_settings import router as admin_settings_router


app = FastAPI(title="AutoNidhi API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "AutoNidhi Backend running"}

@app.get("/api/test")
def test():
    return {"status": "success", "message": "API working"}

# ================= Register Routers =================

# Auth
app.include_router(signup_router, prefix="/api/v1/auth")
app.include_router(login_router, prefix="/api/v1/auth")
app.include_router(forgot_password_router, prefix="/api/v1/auth")
app.include_router(profile_router)
app.include_router(auth_profile_router)

# Admin Dashboard & Data
app.include_router(dashboard_router)
app.include_router(customers_router)
app.include_router(files_router)
app.include_router(payments_in_router)
app.include_router(loans_router)
app.include_router(payments_out_router)
app.include_router(rto_payments_router)
app.include_router(commissions_in_router)
app.include_router(commissions_out_router)
app.include_router(expenses_router)
app.include_router(advances_router)
app.include_router(insurance_payments_router)

app.include_router(notifications_router)

# Customer Dashboard
app.include_router(customer_dashboard_router)
app.include_router(customer_profile_router)
app.include_router(customer_insurance_router)
app.include_router(customer_settings_router)
app.include_router(customer_payments_router)
app.include_router(customer_documents_router)

# Masters   
app.include_router(brokers_router)
app.include_router(insurance_companies_router)
app.include_router(insurance_types_router)
app.include_router(dealers_router)
app.include_router(finance_banks_router)
app.include_router(expense_categories_router)

# Settings
app.include_router(company_settings_router)
app.include_router(bank_accounts_router)
app.include_router(users_settings_router)
app.include_router(admin_settings_router)
