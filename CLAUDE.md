# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Anna Flooring — a website for a flooring sales/installation business: public pages, client registration/login, and an admin dashboard. React (Vite, Tailwind v4) client in `client/`; Java Spring Boot 4 (Maven, Java 25 LTS) server in `server/`; MySQL 8. Requires Node 22.9+ and JDK 25. Maven is not installed globally. The user runs the server through npm scripts in `server/package.json`, which call the Maven wrapper via `server/scripts/mvnw.mjs` (picks `mvnw` or `mvnw.cmd`, forwards Ctrl+C). The server has no npm dependencies.

## Commands

The root `package.json` has shortcut scripts only (no dependencies): `npm run dev` runs `scripts/dev.mjs`, which starts `server/` and `client/` together with `[server]`/`[client]` prefixes and stops both on Ctrl+C or when either exits; also `dev:server`, `dev:client`, `db:setup`, `build`, `lint`. They can still be run separately from each folder.

Server, from `server/`:
- `npm run dev` (or `npm start`) — API on port 5050. Java changes are not hot-reloaded from the terminal; restart, or rebuild from an IDE so DevTools restarts it.
- `npm run db:setup` — runs `setup/DatabaseSetup.java` instead of the web app (the `db-setup` profile in `pom.xml` swaps the main class): creates `DB_NAME`, applies `db/schema.sql`, creates/resets the admin account. Idempotent, never deletes data.
- `npm run compile` — fast compile check for Java changes
- `npm run build` — jar in `server/target/`
- Underlying Maven commands: `./mvnw spring-boot:run [-Pdb-setup]`, `./mvnw -q compile`, `./mvnw package`

Client, from `client/`: `npm install`, `npm run dev` (Vite, port 5173), `npm run build`, `npm run lint` (oxlint, config in `.oxlintrc.json`).

The Maven wrapper (`server/.mvn/wrapper/maven-wrapper.properties`) is pinned to Maven 3.9.16, the version IntelliJ 2026.2 bundles. IntelliJ imports through the wrapper, and Maven 3.10.x breaks its import with `Guice/MissingImplementation ... ArtifactHandlerManager`. Don't bump the wrapper past 3.9.x until IntelliJ supports it.

Editors: VS Code is used for `client/` only. The repo's `.vscode/settings.json` hides `server/` and disables Java/Maven import there, so don't add VS Code launch/Java config for the server. IntelliJ: the user opens only `server/` as the project (not the repo root, not `client/`). Shared run configurations live in `server/.run/` (Server, Database setup) with working directory `$PROJECT_DIR$` (= `server/`, needed for `.env`); keep their main classes in sync if those move.

`curl localhost:5050/api/health` / `/api/db-health` — quick server and MySQL checks. There is no test suite.

Config lives in `server/.env` (copied from `server/.env.example`, `KEY=value`, no quotes), imported by `application.properties` via `spring.config.import=optional:file:.env[.properties]` relative to the working directory — so the server must be started from `server/`. Real environment variables override `.env`. The server fails at startup if `JWT_SECRET` is missing or under 32 bytes.

Database: `anna_flooring_springboot_db` by default (`DB_NAME`).

The company is "Anna Flooring"; Anna Johnson is the owner (the admin account), so the personal name appears only for the admin.

Seeded admin: `annajohnson@flooring.com` / `Anna@12345` (overridable via `ADMIN_EMAIL`/`ADMIN_PASSWORD`).

## Architecture

**Request flow:** the client calls `/api/...` through the axios instance in `client/src/api/client.js`; in dev, Vite proxies `/api` to `http://localhost:5050` (`client/vite.config.js`). The JSON contract (paths, status codes, messages, field names, cookie) is what the client depends on — keep it stable.

**Server (`server/src/main/java/com/annajohnson/flooring`)**
- SQL lives in repositories: `client/ClientRepository`, `product/ProductRepository`, `request/RequestRepository` (quote requests with rooms and photos; `insert` is `@Transactional`). They use Spring's `JdbcClient` with `?` placeholders — plain SQL, no JPA/ORM. Results are mapped into records (`ClientRow`, `ClientSummary`, …); DB snake_case becomes camelCase JSON via record component names.
- Auth is not Spring Security — only `spring-security-crypto` (BCrypt) plus jjwt. `auth/JwtService` signs HS256 tokens (`sub` = client id, `role`, 7 days); `auth/AuthCookies` builds the httpOnly `token` cookie. `AuthInterceptor` rejects tokens issued before the client row's `updated_at`, so any change to the row (a password change, a status change) ends older sessions; `JwtService.sign` never dates a token before `updated_at`.
- `auth/LoginAttemptLimiter` (in memory, cleared on restart) returns 429 after 5 wrong passwords per email or 20 per IP within 15 minutes, and also limits wrong current passwords on `POST /api/client/account/password`. Password rules live in `auth/PasswordRules`. Password changes are client-only; there's no admin tool to reset passwords or edit client details.
- `ImageStorage.problemWith` checks each upload's first bytes match its claimed JPG/PNG/WebP type.
- Route protection is via interceptors registered with path patterns in `web/WebConfig`: `AuthInterceptor` (on `/api/auth/me`, `/api/admin/**`, `/api/client/**`) re-reads the `Client` row on every request, rejects non-`active` accounts, and stores it as request attribute `AuthInterceptor.CURRENT_CLIENT` (controllers take it with `@RequestAttribute`). `AdminInterceptor` (on `/api/admin/**`) then requires `role = 'admin'`, and `ClientInterceptor` (on `/api/client/**`) requires `role = 'client'`. New protected paths must be added to `WebConfig`.
- Photo uploads (products, quote requests) arrive as multipart/form-data and are saved by `upload/ImageStorage` to `server/uploads/` (git-ignored, relative to the working directory) and served publicly at `/api/uploads/**` via a resource handler in `WebConfig`. JPG/PNG/WebP, 5 MB each (checked in code so errors land in `fields`), up to 5 photos per request. The quote request form sends its fields as JSON in a `data` part.
- Errors: throw `web/ApiException(status, message[, fields])`; `web/ApiExceptionHandler` renders every error as `{ error, fields? }` (`fields` maps form field → message, shown per input by the client), maps unknown routes/wrong methods to `404 {error: "Not found"}`, and anything unexpected to 500.
- Controllers take request bodies as `Map<String, Object>` and validate by hand (see `AuthController.readString`) so the `{ error, fields }` messages match what the client forms show, rather than using Bean Validation.
- Admin queries always filter `role = 'client'` so the admin row can't be listed, modified or deleted.

**Database (`server/src/main/resources/db/schema.sql`)**
- Tables: `Client` (clients and the admin, `role` enum), `Product` (the catalog), `Request` (numbers start at 1001, shown as R-1001), `RequestRoom` and `RequestPhoto`. New registrations get `status = 'pending'` and can't log in until an admin approves them (`active`); `disabled` blocks login and ends existing sessions.
- Every statement must be re-runnable (`CREATE TABLE IF NOT EXISTS`) because `db:setup` runs the whole file each time. There's no migration tool, so altering an existing table must be done by hand or by recreating the DB.
- Foreign keys keep quote requests: a client or product used by a request can't be deleted (the API returns 409; disable the client instead).
- Admins are created only by `DatabaseSetup`; `/api/auth/register` always creates `role = 'client'`.

**Client (`client/src`)**
- React 19 with `react-router` v8 (import from `react-router`, not `react-router-dom`). Routes are in `App.jsx`.
- `auth/AuthProvider.jsx` calls `/auth/me` on load and exposes `{ client, loading, login, logout }` via `useAuth()` from `auth/AuthContext.js` (split into two files to satisfy the `only-export-components` lint rule).
- `components/admin/AdminLayout.jsx` is the guarded shell for `/admin/*` (redirects non-admins) and holds the sidebar nav. Sections not built yet (Orders, Bills, Reports) are rendered by `pages/admin/ComingSoon.jsx` from the `adminSections` list in `App.jsx`. To build one, add a real route and remove it from that list.
- `pages/admin/clientHelpers.js` holds shared status badges, button class strings, `fullName()` and date formatting for admin pages. `requestHelpers.js` holds request status labels (admin and client wording) and money/date formatting.
- Client-side pages: `/client` (dashboard), `/client/request` (quote request form), `/client/requests/:id` (one project). Login sends clients to `/client` and the admin to `/admin`. `AuthProvider` clears the logged-in client on any 401.
- Styling is Tailwind v4 with the theme set in `index.css` via `@theme` (no `tailwind.config.js`). Use the brand tokens (`cream`, `sand`, `line`, `ink`, `muted`, `copper`, `espresso`) and `font-serif`/`font-sans`, not arbitrary colors.
