# Spec Delta: Standalone Packaging

## Purpose

Enables independent packaging, build tooling, and deployment boundaries for the backend and frontend services without monorepo workspace dependencies or shared package linking.

## ADDED Requirements

### Requirement: Independent Backend Packaging
The backend service SHALL build, typecheck, run, and pass unit tests entirely within the `backend/` directory using standard `npm` and `tsc` commands without referencing any external package or parent workspace.

#### Scenario: Standalone backend compilation
- **WHEN** a developer or deployment script runs `npm run build` inside `backend/`
- **THEN** it SHALL compile TypeScript into `dist/` with zero missing module errors and exit with code 0

#### Scenario: Standalone backend test execution
- **WHEN** a developer runs `npm run test` inside `backend/`
- **THEN** Vitest SHALL discover and execute all unit test suites using local shared module definitions and pass with 0 failures

### Requirement: Independent Frontend Packaging
The frontend service SHALL build, bundle, and preview entirely within the `frontend/` directory using standard `npm` and `vite` commands without referencing any external package or parent workspace.

#### Scenario: Standalone frontend production bundling
- **WHEN** a developer or deployment script runs `npm run build` inside `frontend/`
- **THEN** Vite SHALL bundle all static assets into `dist/` without unresolved `@bfdp/shared` import errors and exit with code 0

### Requirement: Container and Orchestration Decoupling
Container images and Compose definitions SHALL build directly against the standalone `backend/` and `frontend/` context roots without requiring the root workspace manifest or parent directory copies.

#### Scenario: Backend container build
- **WHEN** a container build is triggered with context `./backend` and `dockerfile: Dockerfile`
- **THEN** the Docker build engine SHALL successfully build the backend runtime image using only files within `backend/`

#### Scenario: Frontend container build
- **WHEN** a container build is triggered with context `./frontend` and `dockerfile: Dockerfile`
- **THEN** the Docker build engine SHALL successfully build the frontend runtime image using only files within `frontend/`

