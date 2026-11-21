# Anna Flooring

A website for a flooring sales and installation business.

## Requirements

- Node.js 22.9 or newer (runs the website)
- Java (JDK) 25 (runs the Spring Boot server)
- MySQL 8 or newer, running locally

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

Use two terminals.

Server (http://localhost:5050):

```bash
cd server
npm run dev
```

Website (http://localhost:5173):

```bash
cd client
npm run dev
```

Then open http://localhost:5173. The website forwards `/api` requests to the server.

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
| **Database setup** | Creates the database, tables and admin account. Safe to run again |

While **Server** is running, Java changes are applied when you switch away from IntelliJ (or press the Update button in the Run window), and Spring Boot DevTools restarts the server.

The server can't start while something else (such as another copy of the project) is using port 5050.

## Commands

Server, from `server/`:

| Command | What it does |
|---|---|
| `npm run dev` | Starts the server (`npm start` does the same) |
| `npm run db:setup` | Creates the database, tables and admin account. Safe to run again |
| `npm run compile` | Compiles the server (quick check after editing Java code) |
| `npm run build` | Builds the server for production (`target/flooring-server-0.0.1-SNAPSHOT.jar`) |

These run the Maven wrapper for you; the server has no npm packages to install.

Website, from `client/`:

| Command | What it does |
|---|---|
| `npm install` | Installs packages |
| `npm run dev` | Starts the website |
| `npm run build` | Builds the website for production |
| `npm run lint` | Checks the code with oxlint |

## Test account

Admin: `annajohnson@flooring.com` / `Anna@12345`
