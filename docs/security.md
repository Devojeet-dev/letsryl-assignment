# Security model

## Authentication

Three token types are accepted on `Authorization: Bearer …`, routed by issuer and always verified:

| Token | Verification | Config |
| --- | --- | --- |
| Supabase access token | JWKS signature, audience, issuer | `SUPABASE_URL` or `SUPABASE_JWKS_URL`, `SUPABASE_JWT_AUDIENCE`, `SUPABASE_JWT_ISSUER` |
| Google ID token | Google's JWKS; audience must be in the allow-list | `GOOGLE_CLIENT_IDS` |
| App JWT (HS256) | Signature with `APP_JWT_SECRET`, issuer `bfdp-api`, audience `bfdp-app` | `APP_JWT_SECRET` (≥ 32 chars) |

The SPA can either:

1. run Supabase Google OAuth, then exchange the resulting Supabase access token at
   `POST /auth/session` (returned unchanged, since the API verifies Supabase tokens directly), or
2. paste an access token manually, or
3. use the demo session.

`POST /auth/session` with a Google ID token exchanges it for a short-lived app JWT
(`APP_JWT_TTL_SECONDS`, default 1 h) so the browser never carries a long-lived Google credential.

JWKS documents are cached in memory with a refresh window; a key rotation triggers a refetch instead
of a hard failure.

## Demo mode

`DEMO_AUTH_ENABLED=true` lets `POST /auth/demo-session` mint an app JWT for the fixed identity
`demo@bfdp.local`. It exists so reviewers can run the stack without provisioning Supabase.

Consequences, by design:

- It is **off by default**; compose enables it for local review only.
- Every demo session maps to the same user id, so all demo users share one workspace.
- It still requires `APP_JWT_SECRET`; it does not bypass token verification elsewhere.

**Do not enable it on a public or shared deployment.** Set `DEMO_AUTH_ENABLED=false`, rotate
`APP_JWT_SECRET`, and configure Supabase before exposing the stack.

## Authorization

- Every batch route is authenticated.
- Batch lookups are scoped by `ownerId`; another user's batch returns `404`, not `403`, so resource
  existence is not leaked.
- The analytics endpoint validates that a supplied `fileId` belongs to the batch before using it.
- Report generation and download use the same ownership check.
- There is no admin role and no cross-tenant read path.

## Input handling

| Surface | Protection |
| --- | --- |
| Request bodies | Zod schemas in `backend/src/shared`; unknown keys stripped by validation handlers |
| Multipart | Extension + MIME allow-list, file count/size limits, aggregate cap, early `Content-Length` guard |
| CSV | Strict encoding detection; required header check; row cap; deterministic parser options |
| Numeric fields | Strict numeric regex; no `eval`, no `Number()` coercion of arbitrary strings |
| Mongo queries | Typed models and parameterized filters; no raw query strings from the client |
| SQL/injection | Not applicable (document store); filenames are never used as paths |
| Rate limiting | Redis fixed window per identity/IP, fails open with an alert-worthy log |

## Output handling

- Errors always use `{ error: { code, message, requestId, details? } }`; driver messages, stack
  traces and internal ids are logged, never returned.
- 5xx responses carry a generic message (`INTERNAL_ERROR`).
- `x-request-id` is echoed for support correlation.
- The API disables `x-powered-by`, sets Helmet defaults, and restricts CORS to configured origins.
- Download responses set `content-disposition` with a server-generated filename and
  `cache-control: private`.

## Secrets

- Secrets are read only from the environment; nothing is committed. `.env`, `.env.*` are ignored
  (`.env.example` is the only tracked template).
- Configuration failures print field names only, never values.
- Logs redact request headers; only user id, route, status, latency and error code are recorded.

## Transport

TLS terminates at the ingress/reverse proxy in real deployments. Cookies are not used; tokens ride
in the `Authorization` header, and the SPA stores the session in `localStorage` for the tab lifetime
of the token (short TTL). nginx adds `X-Forwarded-*` headers and the API trusts a single proxy hop
(`trust proxy = 1`) so rate limiting sees the right client IP.

## Known trade-offs

- The demo identity is global; use real auth for multi-user scenarios.
- Rate-limit windows are fixed, not sliding; bursts at a window boundary are possible.
- Uploaded files are retained in GridFS for auditability; there is no automatic purge job yet.
