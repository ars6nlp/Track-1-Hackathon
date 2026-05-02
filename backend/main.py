from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api import routes_batch

app = FastAPI(
    title="Jewelry CAD Optimizer API (Elite)",
    description="Backend for Jewelry 3D Scanning artifacts removal and analysis.",
    version="1.0.0"
)

# Настройка CORS для работы с Vite Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes_batch.router, prefix="/api/v1/jobs", tags=["Jobs"])

@app.get("/")
def read_root():
    return {
        "status": "ok", 
        "message": "Jewelry CAD Optimizer API (Elite) is running. Engine: PyMeshLab + Trimesh"
    }
