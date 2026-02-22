# Technical Decisions Log

This document tracks all significant technical decisions made during the refactoring of the Todo App.

---

## 1. Frontend / Backend Separation

**Decision:** Split the monolithic app into two independent services: `frontend/` (React + Vite) and `backend/` (Express).

**Rationale:** Clear separation of concerns, independent deployment, independent dev toolchains (Vite HMR for frontend, nodemon for backend). Each service has its own `package.json`, `Dockerfile`, and test suite.

---

## 2. Full TypeScript Migration

**Decision:** Migrate both frontend and backend to TypeScript (strict mode).

**Rationale:** Type safety catches bugs at compile time, improves IDE support, and makes refactoring safer. Strict mode (`noImplicitAny`, `strictNullChecks`, `noUnusedLocals`) enforces discipline. Files renamed progressively from `.js` to `.ts`/`.tsx`.

---

## 3. DbAdapter Pattern (Ports & Adapters)

**Decision:** Define a `DbAdapter` interface in `backend/src/persistence/index.ts`. Implementations: `sqlite.ts` and `mysql.ts`. The correct adapter is injected at runtime based on the `MYSQL_HOST` environment variable.

**Rationale:** Decouples business logic from infrastructure. Route handlers only depend on the `DbAdapter` interface — they never import `better-sqlite3` or `mysql2` directly. This makes unit testing trivial (mock the interface) and allows switching DB engines without touching business logic.

---

## 4. Jest Mocking Strategy (Route Tests vs Persistence Tests)

**Decision:** Route tests (`__tests__/routes/`) mock the entire `persistence` module with `jest.mock('../../../src/persistence')`. Persistence tests (`__tests__/persistence/`) test the real adapters against in-memory SQLite or a mocked MySQL pool.

**Rationale:** Separates concerns — route tests focus on HTTP behavior, persistence tests focus on SQL correctness. No real DB required for route tests, making them fast and deterministic.

---

## 5. JWT Stateless Authentication

**Decision:** Use JWT (jsonwebtoken) for stateless authentication. Tokens expire in 15 minutes (configurable via `JWT_EXPIRES_IN`). The secret is read from `JWT_SECRET` env var.

**Rationale:** Stateless auth scales horizontally without shared session state. 15-minute expiry limits exposure if a token is leaked. The secret is validated at startup via `validateConfig()` to fail fast.

**Security notes:**
- `config.jwt` is a getter (reads `process.env` lazily) to support test environments that set env vars after module load.
- Token payload contains only `sub` (user id) and `email` — minimal exposure.
- Generic error message `"Invalid or expired token"` for all JWT failures (no oracle).

---

## 6. bcrypt Cost Factor 12

**Decision:** Use bcrypt with cost factor 12 for password hashing.

**Rationale:** Cost factor 12 produces ~250ms hash time on typical hardware (2026). This is the recommended balance between security and UX: slow enough to make brute-force impractical, fast enough not to noticeably degrade login UX.

---

## 7. Anti-Timing Attack on Login

**Decision:** Login always runs `bcrypt.compare()` even when the user is not found (using a dummy hash). Both "user not found" and "wrong password" return the same `401 "Invalid credentials"` response.

**Rationale:** Prevents timing oracles that would allow an attacker to enumerate valid email addresses by measuring response time differences.

---

## 8. Email Normalization

**Decision:** All email addresses are lowercased and trimmed before storage and lookup (via Zod `.toLowerCase().trim()`).

**Rationale:** Prevents duplicate accounts like `User@Example.com` vs `user@example.com`. Consistent normalization ensures lookups always succeed regardless of casing.

---

## 9. Zod for Input Validation

**Decision:** Use Zod schemas (`RegisterSchema`, `LoginSchema`, `UpdateMeSchema`) for all incoming request validation on auth endpoints.

**Rationale:** Zod provides type-safe parsing with descriptive error messages. Schemas serve as both runtime validators and TypeScript type sources (`z.infer<>`). `UpdateMeSchema` uses `.refine()` to enforce that `currentPassword` is required when changing email or password.

---

## 10. Multi-Tenant Data Isolation

**Decision:** All todo queries are scoped by `user_id` at the DB level (`WHERE user_id = ?`). The `user_id` column was added via migration to `todo_items`.

**Rationale:** Tenant isolation at the DB level is the safest approach — a bug in application logic cannot accidentally expose another user's data. The migration uses `INFORMATION_SCHEMA.COLUMNS` to check column existence (compatible with MySQL < 8.0.3, which doesn't support `ADD COLUMN IF NOT EXISTS`).

---

## 11. GDPR Compliance

**Decision:** Implement three GDPR-related endpoints:
- `GET /api/me/export` — full data export (user + todos) as JSON
- `PATCH /api/me` — profile update (name, email, password)
- `DELETE /api/me` — account deletion with cascade (todos deleted first)

**Rationale:** Required by GDPR Article 17 (right to erasure) and Article 20 (right to data portability).

---

## 12. Frontend JWT Storage

**Decision:** Store JWT in `localStorage` under key `"auth_token"`. Use a `useRef` in `AuthContext` to hold the current token in memory to avoid re-renders.

**Rationale:** `localStorage` persists across page reloads (unlike `sessionStorage`). The token is validated client-side at load time (check `exp` via `atob`) to avoid unnecessary `/api/me` calls with expired tokens. Auto-logout is triggered on any `401` response via `useApiFetch`.

**Trade-off:** `localStorage` is accessible to JavaScript (XSS risk). `httpOnly` cookies would be more secure but require CORS/cookie configuration and complicate the stateless API design. For this project scope, `localStorage` with XSS mitigations (React's built-in escaping) is acceptable.

---

## 13. MySQL Migration Compatibility

**Decision:** Use `INFORMATION_SCHEMA.COLUMNS` to check for existing columns before `ALTER TABLE`, instead of `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.

**Rationale:** `ADD COLUMN IF NOT EXISTS` requires MySQL 8.0.3+. The project targets older MySQL versions (5.7+). The INFORMATION_SCHEMA approach is universally compatible.

---

## 14. Node.js Version

**Decision:** Use Node.js 24 LTS in both Dockerfiles (`FROM node:24`). Enforce via `engines: { "node": ">=24.0.0" }` in `package.json`.

**Rationale:** Node 24 is the latest LTS (April 2026). Using LTS guarantees long-term support and security patches.

---

## 15. ESLint + Prettier

**Decision:** ESLint enforces code quality and architecture rules. Prettier enforces formatting. They are configured to not conflict (`eslint-config-prettier` disables ESLint formatting rules).

**Backend ESLint rules:** `@typescript-eslint/explicit-function-return-type`, `@typescript-eslint/no-explicit-any`, strict TypeScript checks.

**Frontend ESLint rules:** `react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps`, React Refresh compatibility.
