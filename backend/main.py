from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routes.signup import router as signup_router
from backend.routes.login import router as login_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "Backend running"}

@app.get("/api/test")
def test():
    return {"status": "success", "message": "API working"}

# ✅ register routers
app.include_router(signup_router, prefix="/api")
app.include_router(login_router, prefix="/api")