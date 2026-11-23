# Anna Flooring

A website for a flooring sales and installation business.

## Requirements

- Node.js 22.9 or newer (runs the website)
- Java (JDK) 25 (runs the Spring Boot server)
- MySQL 8 or newer, running locally
- [uv](https://docs.astral.sh/uv/) (runs the AI assistant, a Python service; it installs the right Python version itself)

You don't need to install Maven. The server is run with npm scripts, which use the included Maven wrapper (`server/mvnw`); it downloads the right Maven version the first time it runs.

## Installing the requirements

**macOS** (using [Homebrew](https://brew.sh)):

```bash
brew install node mysql
brew install --cask temurin@25   # Java JDK 25
brew services start mysql
mysql_secure_installation   # set your MySQL root password
```

**Windows:**

1. Install Node.js (LTS) from https://nodejs.org
2. Install Java JDK 25 (Temurin 25 from https://adoptium.net). Tick the option that sets `JAVA_HOME`.
3. Install MySQL with the MySQL Installer from https://dev.mysql.com/downloads/installer/ and set a root password during setup. MySQL then runs as a Windows service.

**MySQL Workbench** (optional, for viewing the database):

- macOS: `brew install --cask mysqlworkbench`, or download it from https://dev.mysql.com/downloads/workbench/
- Windows: select MySQL Workbench in the MySQL Installer, or download it from https://dev.mysql.com/downloads/workbench/

To connect, create a connection with host `localhost`, port `3306`, user `root` and your MySQL password, then open the `anna_flooring_springboot_db` schema.

Check that all three are installed:

```bash
node -v
java -version
mysql --version
```

## Initial project setup

Do this once, after cloning.

1. Clone the repo:

   ```bash
   git clone https://github.com/antenmanuuel/anna-flooring.git
   cd anna-flooring
   ```

2. Copy `server/.env.example` to `server/.env`.
3. In `server/.env`, set `DB_PASSWORD` to your MySQL password and `JWT_SECRET` to a random string. You can generate one with:

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

4. Create the database, tables and admin account (the first run downloads Maven and the Java libraries, so it takes a few minutes):

   ```bash
   cd server
   npm run db:setup
   ```

5. Install the website's packages:

   ```bash
   cd ../client
   npm install
   ```

## Running the app

From the repo root, start the server, the website and the AI assistant together:

```bash
npm run dev
```

Then open http://localhost:5173. The website forwards `/api/assistant` requests to the AI assistant on http://localhost:8000 and every other `/api` request to the server on http://localhost:5050.

Output from each one is prefixed with `[server]`, `[client]` or `[ai]`. Ctrl+C stops all of them, and if one stops (for example, the server can't start because port 5050 is in use), the others are stopped too.

To run them separately instead, use two terminals:

```bash
cd server && npm run dev   # server, http://localhost:5050
cd client && npm run dev   # website, http://localhost:5173
```

Both ports must be free. If another app is already using 5050, the server won't start; if 5173 is taken, the website moves to another port but still sends its requests to whatever is running on 5050.

The website reloads on save. After changing Java code, stop the server (Ctrl+C) and start it again, or run it from an IDE that rebuilds on save (Spring Boot DevTools then restarts it automatically).

## Editors

The server is edited in IntelliJ IDEA and the website in VS Code. Opening the project folder in VS Code hides `server/` and turns off Java project import (see `.vscode/settings.json`).

## Running the server from IntelliJ IDEA

IntelliJ is for the server only; run the website from a terminal as above.

1. **File → Open** and choose the `server` folder. IntelliJ imports it as a Maven project automatically. If it asks, trust the project.
2. If IntelliJ asks for a JDK, pick 25 (**File → Project Structure → Project → SDK**).
3. Create `server/.env` (see *Initial project setup*).
4. Pick a run configuration from the dropdown at the top right and press Run:

| Run configuration | What it does |
|---|---|
| **Server** | Starts the Spring Boot server (http://localhost:5050) |
| **Database setup** | Creates the database, applies new migrations and creates the admin account. Safe to run again |

While **Server** is running, Java changes are applied when you switch away from IntelliJ (or press the Update button in the Run window), and Spring Boot DevTools restarts the server.

The server can't start while something else (such as another copy of the project) is using port 5050.

## Tests

| Suite | Command | What it covers |
|---|---|---|
| Server API tests (JUnit, MockMvc) | `npm test` in `server/` | Registration and login, login limits, products and photos, quote requests, password changes, health checks |
| Website tests (Vitest, React Testing Library) | `npm test` in `client/` | Forms, redirects, the quote estimate and what each page sends to the server, with the API mocked |
| AI assistant tests (pytest) | `uv run pytest` in `ai/` | Chunking, catalog documents, numbered sources and the prompt, streaming, the API's limits; with LangChain's fake model and embeddings, so no API key is needed |
| End-to-end tests (Playwright) | `npm run test:e2e` in `client/` | Sign-up and approval, sending a quote request with a photo, changing a password, in a real browser |

- The server tests use their own database, `anna_flooring_springboot_test`, created automatically with the MySQL login in `server/.env`. They empty it before each test and refuse to run against a database whose name doesn't end in `_test`.
- The end-to-end tests start their own server (port 5060) and website (port 5180) with their own database, `anna_flooring_springboot_e2e`, so they don't clash with `npm run dev`. Before the first run, install the browser: `npx playwright install chromium` in `client/`.
- GitHub Actions runs all four suites, the website build and the Docker build on every push and pull request (`.github/workflows/ci.yml`).

## Running with Docker

To run the whole app without installing Java or MySQL, use [Docker Desktop](https://www.docker.com/products/docker-desktop/):

```bash
docker compose up --build     # first time, or after code changes
docker compose down           # stop (data is kept; add -v to delete it)
```

Then open http://localhost:8080. This starts MySQL, a one-time setup step (migrations and the admin account), the server, and the website served by nginx, which forwards `/api` to the server. The database and uploaded photos are kept in Docker volumes.

Docker has its own database, separate from your local MySQL: only the admin account exists at first. The defaults in `compose.yaml` are for your own machine. Before running it anywhere public, set `JWT_SECRET` and `MYSQL_ROOT_PASSWORD` in a `.env` file next to `compose.yaml` (`WEB_PORT` changes the port).

## AI assistant

There are two AI assistants, both served by a retrieval-augmented generation (RAG) service in `ai/` built with Python, FastAPI, LangChain, ChromaDB and Claude:

- **Ask Anna Flooring**, on every page except the admin dashboard, for visitors and clients.
- **Assistant**, in Anna's admin dashboard. It also sees the live requests, clients, products and overview, read through the admin API with her login cookie, so only a logged-in admin gets any data. It answers questions like "What needs my attention today?" and drafts replies to clients. It can read everything but change nothing.

How the public assistant answers:

1. **Knowledge:** the Markdown guides in `ai/knowledge/` (care, choosing flooring, installation, quotes, FAQs) are split into chunks by heading, and the live catalog is read from the server's public `GET /api/products`, one document per product.
2. **Indexing:** each chunk is turned into a vector by a small open-source embedding model (`bge-small-en-v1.5`, run locally with FastEmbed, so there's no embeddings bill) and stored in ChromaDB (`ai/.chroma/`).
3. **Answering:** for each question, the closest chunks are retrieved and numbered as sources, and Claude answers only from them, citing `[1]`, `[2]`. The answer streams to the chat as it's written, and the chat lists the sources the answer cited.
4. **Safety:** per-visitor rate limits (10 questions a minute and 100 a day by default), a question length limit, and instructions to treat the sources as data and stay on topic.

Anna's assistant uses the same guides, plus a fresh text summary of the business data for each question. That data is small and changes constantly, so it goes straight into the prompt instead of into ChromaDB.

Setup, once:

1. Copy `ai/.env.example` to `ai/.env` and set `ANTHROPIC_API_KEY` (from https://console.anthropic.com). Without a key, the chat answers "The assistant isn't set up yet."
2. Install the packages: `cd ai && uv sync`.

The index is built the first time the service starts (the embedding model, about 70 MB, is downloaded then). After editing the guides or the catalog, rebuild it with the server running:

```bash
cd ai && uv run python -m app.ingest
```

The guides are starter content; edit them to match how the business works. In Docker, set `ANTHROPIC_API_KEY` in the `.env` next to `compose.yaml`, and rebuild the index with `docker compose exec ai python -m app.ingest`.

## Health checks

- `GET /api/health`: the server is running.
- `GET /api/actuator/health`: Spring Boot Actuator's check, including the database; returns `{"status":"UP"}`. No other Actuator endpoints are exposed.
- `GET /api/assistant/health`: the AI assistant, with how many documents are indexed and whether Claude is configured.

## Changing the database

Tables are created and changed by migrations: numbered SQL files in `server/src/main/resources/db/migration`, run by [Flyway](https://documentation.red-gate.com/flyway). The server applies any new ones when it starts (so does `npm run db:setup`), and records each one in the `flyway_schema_history` table so it runs only once.

To change a table, add the next file, for example `V2__add_quote_tables.sql`, with plain MySQL statements (`CREATE TABLE`, `ALTER TABLE`, ...). Don't edit a migration that has already run; the server refuses to start if one changes. Write a new one instead.

## Commands

From the repo root (shortcuts; the root has no packages to install):

| Command | What it does |
|---|---|
| `npm run dev` | Starts the server and the website together |
| `npm run dev:server` | Starts only the server |
| `npm run dev:client` | Starts only the website |
| `npm run dev:ai` | Starts only the AI assistant |
| `npm run db:setup` | Creates the database, applies new migrations and creates the admin account. Safe to run again |
| `npm run build` | Builds the server and the website for production |
| `npm run lint` | Checks the website code with oxlint |
| `npm test` | Runs the server, website and AI assistant tests |
| `npm run test:ai` | Runs only the AI assistant tests |
| `npm run test:e2e` | Runs the end-to-end tests in a real browser (Playwright) |

Server, from `server/`:

| Command | What it does |
|---|---|
| `npm run dev` | Starts the server (`npm start` does the same) |
| `npm run db:setup` | Creates the database, applies new migrations and creates the admin account. Safe to run again |
| `npm run compile` | Compiles the server (quick check after editing Java code) |
| `npm run build` | Builds the server for production (`target/flooring-server-0.0.1-SNAPSHOT.jar`) |
| `npm test` | Runs the server's API tests |

These run the Maven wrapper for you; the server has no npm packages to install.

Website, from `client/`:

| Command | What it does |
|---|---|
| `npm install` | Installs packages |
| `npm run dev` | Starts the website |
| `npm run build` | Builds the website for production |
| `npm run lint` | Checks the code with oxlint |
| `npm test` | Runs the website tests once (`npm run test:watch` re-runs them as you save) |
| `npm run test:e2e` | Runs the end-to-end tests (`npm run test:e2e:ui` opens Playwright's test viewer) |

## Test accounts

| Role | Email | Password |
|---|---|---|
| Admin (Anna) | `annajohnson@flooring.com` | `Anna@12345` |
| Client (John Doe) | `john@demo.com` | `John@123456` |

`npm run db:setup` creates only the admin account. To get a client account on a new database, register on the website, then approve the account as the admin on the Clients page.

Uploaded photos (products and quote requests) are saved in `server/uploads/`, which isn't committed to git.
