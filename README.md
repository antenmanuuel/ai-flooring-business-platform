# Anna Johnson Flooring

CSC 6710 – Project 2, Group 6. A website for a flooring sales and installation business.

Built with React (Vite, Tailwind) on the frontend and Node.js (Express) with MySQL on the backend.

## Requirements

- Node.js 22.9 or newer
- MySQL 8 or newer, running locally

## Installing the requirements

**macOS** (using [Homebrew](https://brew.sh)):

```bash
brew install node mysql
brew services start mysql
mysql_secure_installation   # set your MySQL root password
```

**Windows:**

1. Install Node.js (LTS) from https://nodejs.org
2. Install MySQL with the MySQL Installer from https://dev.mysql.com/downloads/installer/ and set a root password during setup. MySQL then runs as a Windows service.

Check that both are installed:

```bash
node -v
mysql --version
```

## Initial project setup

Do this once, after cloning.

1. Clone the repo:

   ```bash
   git clone https://github.com/antenmanuuel/Project2-Group6.git
   cd Project2-Group6
   ```

2. Copy `server/.env.example` to `server/.env`.
3. In `server/.env`, set `DB_PASSWORD` to your MySQL password and `JWT_SECRET` to a random string. You can generate one with:

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

4. Install packages and create the database:

   ```bash
   npm run setup
   ```

## Running the app

```bash
npm run dev
```

Then open http://localhost:5173

## Scripts

Run these from the project root:

| Command | What it does |
|---|---|
| `npm run setup` | First-time setup: installs all packages and creates the database |
| `npm run dev` | Starts the website and the server |
| `npm run db:setup` | Creates the database, tables and admin account. Safe to run again |
| `npm run install:all` | Installs packages only |
| `npm run build` | Builds the website for production |

## Test account

Admin: `annajohnson@flooring.com` / `Anna@12345`
