# Spec Delta: local-environment

## ADDED Requirements

### Requirement: Synchronized Development Port Configuration
The local development environment documentation and configuration SHALL accurately reflect Vite dev server port configuration and avoid references to deleted monorepo paths.

#### Scenario: Developer consults setup documentation
- **WHEN** a developer inspects `README.md` and `.env.example`
- **THEN** documented ports, CORS origins, and configuration paths SHALL match the active workspace layout without references to `apps/backend` or deleted packages

