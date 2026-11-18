-- Table definitions. Don't run this file by hand; run `npm run db:setup` instead,
-- which creates the database named in server/.env and then runs this file inside it.
-- Every statement must be safe to run again (use IF NOT EXISTS).

-- Everyone who signs in: clients register through the website (role defaults to 'client');
-- the admin is created by scripts/setup-db.js.
CREATE TABLE IF NOT EXISTS Client (
  client_id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  -- Address and phone are required on the registration form; the admin row leaves them empty.
  address       VARCHAR(255) NULL,  -- street address
  city          VARCHAR(100) NULL,
  state         VARCHAR(100) NULL,
  zip_code      VARCHAR(10)  NULL,
  country       VARCHAR(100) NULL,
  phone         VARCHAR(20)  NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('client', 'admin') NOT NULL DEFAULT 'client',
  -- New sign-ups start as 'pending' and can't log in until Anna approves them.
  status        ENUM('pending', 'active', 'disabled') NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_client_email UNIQUE (email)
);
