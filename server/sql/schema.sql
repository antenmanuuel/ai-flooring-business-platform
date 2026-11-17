-- Table definitions. Don't run this file by hand; run `npm run db:setup` instead,
-- which creates the database named in server/.env and then runs this file inside it.
-- Every statement must be safe to run again (use IF NOT EXISTS).

-- Everyone who signs in: clients register through the website (role defaults to 'client');
-- the admin is created by scripts/setup-db.js.
CREATE TABLE IF NOT EXISTS Client (
  client_id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('client', 'admin') NOT NULL DEFAULT 'client',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_client_email UNIQUE (email)
);
