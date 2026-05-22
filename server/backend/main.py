from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Auth Routes
from backend.routes.signup import router as signup_router
from backend.routes.login import router as login_router

# Admin Routes
from backend.routes.admin.dashboard import router as dashboard_router
from backend.routes.admin.customers import router as customers_router
from backend.routes.admin.files import router as files_router

app = FastAPI(title="AutoNidhi API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # React frontend
    allow_credentials=True,
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

# Admin Dashboard & Data
app.include_router(dashboard_router)
app.include_router(customers_router)
app.include_router(files_router)