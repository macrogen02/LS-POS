# LaundryPOS

Full-stack Laundry Shop POS web app with React + TypeScript frontend, Express + Prisma backend, and PostgreSQL database.

## Quick Start (Local)

### 1) Start PostgreSQL with Docker
```bash
docker compose up -d db
```

### 2) Backend setup
```bash
cd backend
cp .env.example .env
npm install
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Backend runs at `http://localhost:4000`.

### 3) Frontend setup (new terminal)
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

## Default Login
- Admin: `admin@laundrypos.local` / `admin123`
- Staff: `staff@laundrypos.local` / `staff123`

## Production-ish local deploy (containers)
```bash
docker compose up --build
```

## Stack
- Frontend: React, TypeScript, Redux Toolkit, Tailwind, React Router
- Backend: Node.js, Express, Prisma, JWT, bcrypt
- DB: PostgreSQL

## Troubleshooting Login
If login keeps showing `Invalid credentials`:

1. Ensure frontend points to backend API:
   - `frontend/.env` should contain `VITE_API_URL=http://localhost:4000/api/v1`
2. Re-seed users (seed now resets default passwords):
```bash
cd backend
npm run prisma:seed
```
3. Confirm users exist in DB and backend can access DB URL from `.env`.
4. Retry with:
   - `admin@laundrypos.local` / `admin123`
   - `staff@laundrypos.local` / `staff123`
