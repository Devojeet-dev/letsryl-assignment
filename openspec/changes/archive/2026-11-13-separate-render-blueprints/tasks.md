# Tasks

## 1. Backend Blueprint Specification

- [x] 1.1 Create `backend/render.yaml` declaring `bfdp-api` (consolidated web service on `npm run start:combined`) with `plan: free`, health check `/health`, and `CORS_ORIGINS: "*"`
- [x] 1.2 Validate `backend/render.yaml` syntax and confirm zero payment requirements

## 2. Frontend Blueprint Specification

- [x] 2.1 Create `frontend/render.yaml` declaring `bfdp-frontend` (static site) with SPA rewrites (`/*` -> `/index.html`) and parameter prompt for `VITE_API_URL`
- [x] 2.2 Validate `frontend/render.yaml` syntax and confirm proper static publish path configuration

## 3. Cleanup & Documentation

- [x] 3.1 Remove the unified root `render.yaml` to eliminate ambiguity
- [x] 3.2 Update `README.md` with the two-stage deployment guide for `backend/render.yaml` and `frontend/render.yaml`

