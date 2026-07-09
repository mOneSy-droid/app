-- EduVisa PostgreSQL sxemasi
-- Bu fayl barcha jadvallarni yaratadi. Xavfsiz qayta ishga tushirish uchun
-- "IF NOT EXISTS" ishlatilgan - bir necha marta ishga tushirsangiz ham xato bermaydi.

CREATE TABLE IF NOT EXISTS universities (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  name_ru      TEXT,
  country      TEXT NOT NULL,
  logo         TEXT,
  budget       INTEGER NOT NULL,
  ielts        NUMERIC(3,1),
  gpa          NUMERIC(3,1),
  grant_info   TEXT,
  grant_info_ru TEXT,
  programs     JSONB NOT NULL DEFAULT '[]',
  programs_ru  JSONB,
  description  TEXT,
  description_ru TEXT,
  latitude     NUMERIC(10,7),
  longitude    NUMERIC(10,7),
  qs_ranking   INTEGER
);

CREATE TABLE IF NOT EXISTS users (
  username              TEXT PRIMARY KEY,
  password              TEXT NOT NULL,
  first_name            TEXT NOT NULL,
  last_name             TEXT NOT NULL,
  phone                 TEXT,
  email                 TEXT,
  budget                INTEGER,
  ielts_score           NUMERIC(3,1),
  has_ielts             BOOLEAN,
  gpa                   NUMERIC(3,1),
  has_gpa               BOOLEAN,
  onboarding_completed  BOOLEAN NOT NULL DEFAULT FALSE,
  avatar_url            TEXT,
  telegram_chat_id      TEXT,
  last_login_ip         TEXT,
  role                  TEXT NOT NULL DEFAULT 'student',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS consultants (
  id          BIGINT PRIMARY KEY,
  name        TEXT NOT NULL,
  username    TEXT,
  phone       TEXT,
  email       TEXT,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clients (
  id                SERIAL PRIMARY KEY,
  consultant_id     BIGINT NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  phone             TEXT NOT NULL,
  country           TEXT NOT NULL,
  payment_type      TEXT NOT NULL,
  amount            FLOAT NOT NULL,
  receipt_photo_id  TEXT NOT NULL,
  confirmed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  status            TEXT NOT NULL DEFAULT 'confirmed'
);

-- Chek rasmi endi to'g'ridan-to'g'ri bazada (BYTEA) saqlanadi, placeholder emas.
ALTER TABLE clients ADD COLUMN IF NOT EXISTS receipt_file_data BYTEA;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS receipt_mime_type TEXT;
ALTER TABLE consultants ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE consultants ADD COLUMN IF NOT EXISTS email TEXT;

CREATE TABLE IF NOT EXISTS audit_logs (
  id          SERIAL PRIMARY KEY,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT now(),
  action      TEXT NOT NULL,
  user_id     BIGINT,
  user_name   TEXT,
  log_type    TEXT NOT NULL DEFAULT 'info'
);

CREATE INDEX IF NOT EXISTS idx_clients_consultant_id ON clients(consultant_id);
CREATE INDEX IF NOT EXISTS idx_clients_confirmed_at ON clients(confirmed_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

-- Admin panelidan (masalan davlat cover rasmi kabi) kompyuterdan yuklanadigan
-- umumiy (public) rasmlar. URL orqali emas, fayl sifatida yuklanadi va
-- PostgreSQL'da BYTEA ustunda saqlanadi, keyin /api/images/:id orqali xizmat qiladi.
CREATE TABLE IF NOT EXISTS images (
  id          TEXT PRIMARY KEY,
  mime_type   TEXT NOT NULL,
  file_data   BYTEA NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS countries (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  name_ru     TEXT,
  flag        TEXT,
  cover_image TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS faculties (
  id            TEXT PRIMARY KEY,
  university_id TEXT NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  name_ru       TEXT,
  description   TEXT,
  description_ru TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS promotions (
  id         TEXT PRIMARY KEY,
  text       TEXT NOT NULL,
  text_ru    TEXT,
  end_date   TIMESTAMPTZ NOT NULL,
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS interests (
  username        TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  university_id   TEXT NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (username, university_id)
);

CREATE TABLE IF NOT EXISTS applications (
  id                 TEXT PRIMARY KEY,
  username           TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  university_id      TEXT NOT NULL,
  university_name    TEXT NOT NULL,
  university_country TEXT,
  program            TEXT NOT NULL,
  status             TEXT NOT NULL,
  date               DATE NOT NULL DEFAULT CURRENT_DATE,
  father_name        TEXT,
  father_phone       TEXT,
  mother_name        TEXT,
  mother_phone       TEXT,
  contact_email      TEXT,
  contact_phone      TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS application_history (
  id              SERIAL PRIMARY KEY,
  application_id  TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  status          TEXT NOT NULL,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS application_documents (
  id              SERIAL PRIMARY KEY,
  application_id  TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  type            TEXT NOT NULL,
  status          TEXT NOT NULL,
  size            TEXT,
  file_data       BYTEA,
  mime_type       TEXT
);

CREATE TABLE IF NOT EXISTS documents (
  id          SERIAL PRIMARY KEY,
  username    TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL,
  size        TEXT,
  status      TEXT NOT NULL DEFAULT 'Yuklangan',
  url         TEXT,
  file_data   BYTEA,
  mime_type   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id          SERIAL PRIMARY KEY,
  username    TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  role        TEXT NOT NULL, -- 'user' | 'model'
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auto_login_tokens (
  token       TEXT PRIMARY KEY,
  username    TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  used        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Telegram deep-link (/start=...) parametri FAQAT [A-Za-z0-9_-] belgilariga va
-- maksimal 64 belgiga ruxsat beradi. Shu sabab username/parol/IP kabi to'liq
-- ma'lumotni JSON+base64 shaklida linkka qo'shib bo'lmaydi (Telegram uni
-- jim tashlab yuboradi). Shuning o'rniga shu yerda qisqa, xavfsiz token
-- saqlanadi va faqat shu token deep-link'ga qo'shiladi.
CREATE TABLE IF NOT EXISTS registration_start_tokens (
  token           TEXT PRIMARY KEY,
  username        TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  used            BOOLEAN NOT NULL DEFAULT FALSE,
  -- MUHIM (FIX): users.password ustuni FAQAT xeshlangan (scrypt) qiymatni saqlaydi,
  -- shuning uchun Telegram bot foydalanuvchiga asl parolni ko'rsata olmasdi (hash
  -- yuborilardi). Asl parol FAQAT register-init paytida ma'lum bo'ladi, shuni shu
  -- yerda vaqtincha (token bir martalik ishlatilgani uchun xavfsiz) saqlaymiz.
  plain_password  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE registration_start_tokens ADD COLUMN IF NOT EXISTS plain_password TEXT;

CREATE TABLE IF NOT EXISTS password_reset_codes (
  id          SERIAL PRIMARY KEY,
  username    TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  code_hash   TEXT NOT NULL,
  used        BOOLEAN NOT NULL DEFAULT FALSE,
  attempts    INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT now() + interval '10 minutes',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS password_reset_request_log (
  id          SERIAL PRIMARY KEY,
  username    TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reset_log_username_created
  ON password_reset_request_log(username, created_at);

-- Eski bazalarda (documents jadvali allaqachon mavjud bo'lsa) yangi ustunlarni qo'shib qo'yamiz.
-- CREATE TABLE IF NOT EXISTS mavjud jadvalga tegmaydi, shuning uchun ALTER kerak.
ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_data BYTEA;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS mime_type TEXT;

-- Ariza (application) bilan birga to'ldiriladigan qo'shimcha shaxsiy ma'lumotlar
-- (ota-ona, email, aloqa raqami) va universitet mamlakati uchun yangi ustunlar.
ALTER TABLE applications ADD COLUMN IF NOT EXISTS university_country TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS father_name TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS father_phone TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS mother_name TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS mother_phone TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS contact_phone TEXT;

-- Ariza fayllari (pasport, 3x4 rasm, metrika, ID karta, zagran pasport) endi
-- to'g'ridan-to'g'ri shu jadvalda (BYTEA) saqlanadi.
ALTER TABLE application_documents ADD COLUMN IF NOT EXISTS size TEXT;
ALTER TABLE application_documents ADD COLUMN IF NOT EXISTS file_data BYTEA;
ALTER TABLE application_documents ADD COLUMN IF NOT EXISTS mime_type TEXT;

-- Foydalanuvchilar (users) uchun email ustuni qo'shish
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;

CREATE INDEX IF NOT EXISTS idx_applications_username ON applications(username);
CREATE INDEX IF NOT EXISTS idx_documents_username ON documents(username);
CREATE INDEX IF NOT EXISTS idx_chat_messages_username ON chat_messages(username);
CREATE INDEX IF NOT EXISTS idx_app_history_app_id ON application_history(application_id);
CREATE INDEX IF NOT EXISTS idx_app_documents_app_id ON application_documents(application_id);