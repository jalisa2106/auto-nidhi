from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routes.signup import router as signup_router
from backend.routes.login import router as login_router
from backend.routes.home import router as home_router
from backend.routes.applications import router as applications_router

app = FastAPI(title="AutoNidhi API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React frontend
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

# Register routers
app.include_router(signup_router, prefix="/api")
app.include_router(login_router, prefix="/api")
app.include_router(home_router, prefix="/api")
app.include_router(applications_router, prefix="/api")
