# 🚀 Как запустить проект локально

## Требования

- **Python 3.10+** (проверить: `python --version`)
- **Node.js 18+** и **npm** (проверить: `node --version` и `npm --version`)
- **Windows OS**

---

## 📁 Структура проекта

```
Hackaton Track 1/
├── backend/          ← FastAPI сервер (Python)
│   ├── main.py       ← Точка входа
│   ├── requirements.txt
│   ├── venv/         ← Виртуальное окружение Python
│   ├── api/          ← Роуты API
│   ├── core/         ← Геометрический движок
│   └── storage/      ← Хранилище загруженных файлов
├── frontend/         ← Vite + React (JavaScript)
│   ├── package.json
│   ├── src/          ← Исходники React
│   └── node_modules/ ← Зависимости Node.js
└── HOW_TO_RUN.md     ← Этот файл
```

---

## ⚙️ Первоначальная настройка (только один раз)

### 1. Backend — создание виртуального окружения и установка зависимостей

Откройте **PowerShell** или **Терминал** и выполните:

```powershell
# Перейти в папку backend
cd "c:\Alex Hirsch\Hackaton Track 1\backend"

# Создать виртуальное окружение (если ещё нет)
python -m venv venv

# Активировать виртуальное окружение
venv\Scripts\activate

# Установить зависимости
pip install -r requirements.txt
```

### 2. Frontend — установка зависимостей

Откройте **второй терминал** и выполните:

```powershell
# Перейти в папку frontend
cd "c:\Alex Hirsch\Hackaton Track 1\frontend"

# Установить зависимости
npm install
```

---

## 🟢 Запуск серверов (каждый раз)

> [!IMPORTANT]
> Нужно открыть **ДВА** отдельных терминала — один для бэкенда, другой для фронтенда.

### Терминал 1 — Backend (FastAPI на порту 8000)

```powershell
cd "c:\Alex Hirsch\Hackaton Track 1\backend"
venv\Scripts\activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

✅ Если всё ок, увидишь:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

### Терминал 2 — Frontend (Vite на порту 5173)

```powershell
cd "c:\Alex Hirsch\Hackaton Track 1\frontend"
npm run dev
```

✅ Если всё ок, увидишь:
```
VITE v5.x.x  ready in XXX ms
➜  Local:   http://localhost:5173/
```

---

## 🌐 Адреса

| Сервис       | URL                          | Описание                    |
|-------------|------------------------------|-----------------------------|
| **Frontend** | http://localhost:5173/        | Веб-интерфейс (React)      |
| **Backend**  | http://localhost:8000/        | API сервер (FastAPI)        |
| **API Docs** | http://localhost:8000/docs    | Swagger UI документация API |

---

## 🔧 Частые проблемы и решения

### ❌ `uvicorn: command not found` / `не является командой`
**Причина:** Виртуальное окружение не активировано.
```powershell
cd "c:\Alex Hirsch\Hackaton Track 1\backend"
venv\Scripts\activate
# Теперь повтори команду uvicorn
```

### ❌ `ModuleNotFoundError: No module named 'xxx'`
**Причина:** Зависимости не установлены.
```powershell
venv\Scripts\activate
pip install -r requirements.txt
```

### ❌ `npm run dev` ничего не показывает / ошибка
**Причина:** Зависимости не установлены.
```powershell
cd "c:\Alex Hirsch\Hackaton Track 1\frontend"
npm install
npm run dev
```

### ❌ `EADDRINUSE` / `Address already in use` (порт занят)
**Причина:** Предыдущий сервер ещё работает.
```powershell
# Убить процесс на порту 8000 (backend)
netstat -ano | findstr :8000
taskkill /PID <номер_PID> /F

# Убить процесс на порту 5173 (frontend)
netstat -ano | findstr :5173
taskkill /PID <номер_PID> /F
```

### ❌ CORS ошибка в консоли браузера
**Причина:** Backend не запущен или запущен на другом порту.
Убедись, что backend работает именно на порту **8000**.

---

## 🛑 Как остановить серверы

В каждом терминале нажми **Ctrl + C** — это остановит сервер.

---

## 📋 Быстрый старт (копируй и запускай)

**Терминал 1 (Backend):**
```powershell
cd "c:\Alex Hirsch\Hackaton Track 1\backend"; venv\Scripts\activate; uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Терминал 2 (Frontend):**
```powershell
cd "c:\Alex Hirsch\Hackaton Track 1\frontend"; npm run dev
```

Готово! Открой http://localhost:5173/ в браузере 🎉
