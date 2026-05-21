# AutoNidhi — Auto Finance Consultancy Platform

## Project Structure

```
AutoNidhi/
├── client/          # Frontend — React + Vite + TypeScript
├── server/          # Backend  — Python FastAPI
└── database/        # DB migrations — SQL files (Neon PostgreSQL)
```

## Getting Started

### Frontend (client)
```bash
cd client
npm install
npm run dev
```
Runs at: http://localhost:5173

### Backend (server)
```bash
cd server
pip install -r requirements.txt
uvicorn backend.main:app --reload
```
Runs at: http://localhost:8000

### Database
SQL migrations are in `database/database/`. They are deployed to Neon PostgreSQL.
Do **not** run migrations locally unless you know what you're doing.
