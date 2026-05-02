from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse
from typing import List
import uuid
import os
import shutil
from pathlib import Path
from core.geometry_engine import JewelryProcessor

router = APIRouter()

JOBS_DB = {}
UPLOAD_DIR = Path("./storage")
UPLOAD_DIR.mkdir(exist_ok=True)

def process_batch_background(job_id: str, file_paths: dict):
    JOBS_DB[job_id]["status"] = "processing"
    
    processor = JewelryProcessor(work_dir=str(UPLOAD_DIR / job_id))
    results = []
    
    for item_id, file_path in file_paths.items():
        res = processor.process(file_path, item_id)
        # Сохраняем путь к исходнику (желательно GLB), чтобы Фронтенд мог запросить Raw-версию
        if res.get("status") == "success":
            res["raw_path"] = res.get("raw_glb_path") or file_path
            # Дублируем физические метрики на верхний уровень для удобства фронтенда
            res["area_mm2"] = res.get("mcp_params", {}).get("area_mm2", 0.0)
        results.append({
            "item_id": item_id,
            "result": res
        })
        
    JOBS_DB[job_id]["status"] = "completed"
    JOBS_DB[job_id]["results"] = results

@router.post("/upload")
async def upload_batch(background_tasks: BackgroundTasks, files: List[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="Файлы не загружены.")
        
    job_id = str(uuid.uuid4())
    job_dir = UPLOAD_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    
    file_paths = {}
    
    for file in files:
        if not file.filename.lower().endswith(('.stl', '.obj', '.ply')):
            raise HTTPException(status_code=400, detail=f"Неподдерживаемый формат: {file.filename}. Поддерживаются: .stl, .obj, .ply")
            
        item_id = str(uuid.uuid4())
        file_path = job_dir / f"{item_id}_{file.filename}"
        
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            file_paths[item_id] = str(file_path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Ошибка сохранения файла {file.filename}: {str(e)}")
            
    JOBS_DB[job_id] = {
        "status": "pending",
        "items_count": len(files)
    }
    
    background_tasks.add_task(process_batch_background, job_id, file_paths)
    
    return {
        "job_id": job_id,
        "items_count": len(files),
        "status": "processing"
    }

@router.get("/{job_id}")
async def get_job_status(job_id: str):
    job = JOBS_DB.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

# Эндпоинт для отдачи файлов
@router.get("/items/{item_id}/download")
async def download_item(item_id: str, type: str = "clean_lod"):
    file_path = None
    
    for job in JOBS_DB.values():
        if "results" in job:
            for res in job["results"]:
                if res["item_id"] == item_id:
                    result_data = res["result"]
                    if type == "clean_lod":
                        file_path = result_data.get("lod_path")
                    elif type == "raw_lod" or type == "raw":
                        file_path = result_data.get("raw_path")
                    elif type == "clean_hires":
                        file_path = result_data.get("hires_path")
                    break
        if file_path:
            break
            
    if not file_path or not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Файл не найден или еще обрабатывается")
        
    return FileResponse(file_path)
