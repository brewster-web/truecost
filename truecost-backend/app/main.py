from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.auth import verify_token
from app.database import engine
from app.routes import budget, nudge


app = FastAPI(title="TrueCost API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"], 
)

app.include_router(budget.router)
app.include_router(nudge.router)

@app.get("/health")
def health_check():
    return {"status": "ok", "service":"truecost"}


@app.get("/health/secure")
def secure_health_check(user=Depends(verify_token)):
    return {"status": "ok", "user": user}


@app.on_event("startup")
async def startup():
    async with engine.connect() as conn:
        print("✅ Database connected!")