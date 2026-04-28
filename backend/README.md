# Backend (Current Project Map)

This file documents everything currently related to backend in this project.

## Backend Code Locations

- `backend/server/src/index.ts`: Express app entrypoint, routes, validation handling, and global error handler.
- `backend/server/src/auth.ts`: JWT creation and auth middleware (`authGuard`).
- `backend/server/src/validation.ts`: Zod schemas for auth, task CRUD, and query params.
- `backend/server/src/ai.ts`: task suggestion logic (priority, due date, tags).
- `backend/server/src/types.ts`: shared backend suggestion types.

## Database Layer

- `backend/prisma/schema.prisma`: Prisma datasource + models (`User`, `Task`).
- Prisma client dependency: `@prisma/client` (runtime) + `prisma` (dev CLI).

## Runtime and Scripts (from package.json)

- `npm run dev:server`: run backend with watch mode (`node --watch --import tsx backend/server/src/index.ts`).
- `npm run start:server`: run backend in normal mode (`node --import tsx backend/server/src/index.ts`).
- `npm run prisma:generate`: generate Prisma client using `backend/prisma/schema.prisma`.
- `npm run prisma:push`: push schema from `backend/prisma/schema.prisma` to database.

## Deployment (`backend/render.yaml`)

- Service name: `ai-todo-api`.
- Build command: `npm install && npm run prisma:generate`.
- Start command: `npm run start:server`.
- Backend default port: `4000`.

## Required Environment Variables (Backend)

- `DATABASE_URL`
- `JWT_SECRET`
- `PORT`
- `CORS_ORIGIN`

## Backend API Endpoints

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/tasks`
- `POST /api/tasks`
- `PATCH /api/tasks/:id`
- `DELETE /api/tasks/:id`
- `POST /api/ai/suggestions`

## Frontend Integration Point

- `Frontend/src/todo/api.ts` uses `VITE_API_URL` (fallback: `http://localhost:4000/api`) to call backend endpoints.