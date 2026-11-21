-- Table definitions. Don't run this file by hand; run `npm run db:setup`
-- from server/ instead, which (via setup/DatabaseSetup.java) creates the database named in server/.env and runs this file inside it.
-- Every statement must be safe to run again (use IF NOT EXISTS).

-- Everyone who signs in: clients register through the website (role defaults to 'client');
-- the admin is created by setup/DatabaseSetup.java.
CREATE TABLE IF NOT EXISTS Client (
  client_id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  first_name    VARCHAR(50)  NOT NULL,
  last_name     VARCHAR(50)  NOT NULL,
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

-- Flooring catalog that Anna manages from the Products page.
CREATE TABLE IF NOT EXISTS Product (
  product_id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name             VARCHAR(100)  NOT NULL,
  description      TEXT          NULL,
  category         VARCHAR(50)   NOT NULL,  -- e.g. Hardwood, Vinyl plank, Carpet
  manufacturer     VARCHAR(100)  NOT NULL,  -- brand
  style            VARCHAR(100)  NOT NULL,  -- material / style
  color            VARCHAR(50)   NOT NULL,
  unit_price       DECIMAL(10,2) NOT NULL,
  pricing_unit     VARCHAR(20)   NOT NULL DEFAULT 'sq ft',  -- sq ft, box, piece or roll
  dimensions       VARCHAR(50)   NULL,
  coverage_per_box DECIMAL(8,2)  NULL,      -- square feet one box covers
  image_url        VARCHAR(255)  NULL,      -- photo path, e.g. /api/uploads/products/1716-123.jpg
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_product_price CHECK (unit_price >= 0)
);

-- A client's quote request, sent from the "Request a quote" form.
-- Numbers start at 1001 so they show as R-1001, R-1002...
CREATE TABLE IF NOT EXISTS Request (
  request_id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  client_id       INT UNSIGNED  NOT NULL,
  service_address VARCHAR(255)  NOT NULL,
  preferred_date  DATE          NULL,
  budget          DECIMAL(10,2) NULL,
  notes           TEXT          NULL,
  -- pending = waiting for Anna's quote. More statuses are used once quoting is built.
  status          ENUM('pending', 'quoted', 'countered', 'accepted', 'rejected', 'canceled') NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_request_client FOREIGN KEY (client_id) REFERENCES Client (client_id),
  CONSTRAINT chk_request_budget CHECK (budget IS NULL OR budget >= 0)
) AUTO_INCREMENT = 1001;

-- One row per room or area in a request.
CREATE TABLE IF NOT EXISTS RequestRoom (
  room_id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  request_id       INT UNSIGNED NOT NULL,
  name             VARCHAR(100) NOT NULL,          -- e.g. Kitchen, Basement
  product_id       INT UNSIGNED NOT NULL,          -- the flooring the client picked
  length_ft        DECIMAL(7,2) NULL,
  width_ft         DECIMAL(7,2) NULL,
  area_sqft        DECIMAL(9,2) NOT NULL,          -- the total area typed in, or length × width
  current_flooring VARCHAR(100) NULL,
  remove_existing  BOOLEAN      NOT NULL DEFAULT FALSE,
  pattern          VARCHAR(30)  NOT NULL DEFAULT 'Straight',
  CONSTRAINT fk_room_request FOREIGN KEY (request_id) REFERENCES Request (request_id),
  CONSTRAINT fk_room_product FOREIGN KEY (product_id) REFERENCES Product (product_id),
  CONSTRAINT chk_room_area CHECK (area_sqft > 0)
);

-- Up to 5 photos per request (the limit is checked by the server, since CHECK can't count rows).
CREATE TABLE IF NOT EXISTS RequestPhoto (
  photo_id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  request_id  INT UNSIGNED NOT NULL,
  image_url   VARCHAR(255) NOT NULL,             -- e.g. /api/uploads/requests/1716-123.jpg
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_photo_request FOREIGN KEY (request_id) REFERENCES Request (request_id)
);
