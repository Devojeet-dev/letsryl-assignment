# Tasks

## 1. Consolidated Backend Runtime

- [x] 1.1 Implement `backend/src/main.combined.ts` to boot the Express HTTP server, file-processing BullMQ worker, and report-generation BullMQ worker with coordinated graceful shutdown (`SIGTERM`/`SIGINT`)
- [x] 1.2 Add `start:combined` and `dev:combined` scripts to `backend/package.json` and verify successful compilation via `npm --prefix ./backend run build`

## 2. Render Blueprint Specification

- [x] 2.1 Create root `render.yaml` declaring `bfdp-frontend` (static site) with SPA routing rewrites (`/*` -> `/index.html`) and backend URL binding via `fromService`
- [x] 2.2 Add `bfdp-api` (consolidated web service) and `bfdp-redis` (managed Redis database) to `render.yaml` with `/health` check and prompt keys (`sync: false`)
- [x] 2.3 Verify `render.yaml` syntax, service relationships, and confirm no circular dependency exists between frontend and backend

## 3. Documentation & Verification

- [x] 3.1 Update `README.md` and deployment documentation with single-click Render Blueprint setup steps and environment explanations
- [x] 3.2 Run backend unit tests (`npm --prefix ./backend run test`) and frontend production build (`npm --prefix ./frontend run build`) to ensure full regression-free functionality

