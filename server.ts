import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import OpenAI from 'openai';
import archiver from 'archiver';
import dotenv from 'dotenv';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { pool, testConnection } from './db';
import * as consultantService from './consultantService';
import { hashPassword, verifyPassword, generateRandomPassword, generateSessionToken, hashOtpCode } from './auth';
import { startTelegramBot, notifyAdminNewUser, notifyAdminPasswordChanged, sendTelegramMessage, broadcastToChatIds, scheduleDailyReport, lookupIpLocation } from './telegramBot';
import { verifySmtpConnection } from './emailService';
import { fileURLToPath } from 'url';

// MUHIM (FIX): Dev rejimida (`tsx server.ts`) fayl ESM sifatida ishlaydi, lekin
// production build esbuild orqali CommonJS'ga (`--format=cjs`) bundle qilinadi.
// CJS'da `import.meta.url` mavjud emas (undefined bo'ladi) - shu sababli
// avvalgi kod prodda "ERR_INVALID_ARG_TYPE: path ... Received undefined"
// xatoligini berardi. CJS modulida Node __dirname'ni tabiiy ravishda o'zi
// ta'minlaydi, shuning uchun u mavjud bo'lsa o'shani ishlatamiz, aks holda
// (ESM/dev rejimida) import.meta.url orqali hosil qilamiz.
const baseDirname: string =
  typeof __dirname !== 'undefined'
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

dotenv.config();

// MUHIM (FIX): Asosiy jadvallar (universities, users, consultants, faculties,
// promotions va h.k.) hech qachon avtomatik yaratilmagan edi - schema.sql fayli
// mavjud bo'lsa ham serverga ulanishda ishga tushirilmasdi. Shu sababli "relation
// ... does not exist" xatoliklari chiqardi. Endi server ishga tushganda schema.sql
// avtomatik bajariladi (ichida IF NOT EXISTS bo'lgani uchun xavfsiz, bir necha marta
// ishga tushirsa ham xato bermaydi).
async function ensureBaseSchema(): Promise<void> {
  try {
    const schemaPath = path.join(baseDirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf-8');
    
    await pool.query(sql);
    console.log('[DB MIGRATION] Asosiy sxema (schema.sql) muvaffaqiyatli qo\'llanildi.');
  } catch (err) {
    console.error('[DB MIGRATION] Asosiy sxemani qo\'llashda xatolik:', err);
  }
}

async function ensureConsultantSchema(): Promise<void> {
  try {
    await pool.query('ALTER TABLE consultants ADD COLUMN IF NOT EXISTS phone TEXT');
    await pool.query('ALTER TABLE consultants ADD COLUMN IF NOT EXISTS email TEXT');
  } catch (err) {
    console.error('[DB MIGRATION] Consultant schema yangilanishi xatolik:', err);
  }
}

async function ensureUniversitiesSeed(): Promise<void> {
  try {
    const { rows } = await pool.query('SELECT COUNT(*)::int AS count FROM universities');
    if (rows[0].count > 0) {
      return;
    }

    const defaultUniversities = [
      {
        id: 'u1', name: 'University of London', country: 'Buyuk Britaniya', logo: '🇬🇧',
        budget: 12000, ielts: 6.5, gpa: 4.0, grantInfo: '45% gacha grant imkoniyati',
        programs: ['Moliya va Bank', 'Biznes boshqaruvi', 'Iqtisodiyot', 'Kompyuter elmlari'],
        description: 'Buyuk Britaniyaning eng nufuzli universitetlaridan biri bo\'lib, jahon miqyosida tan olingan ta\'lim dasturlarini taqdim etadi.'
      },
      {
        id: 'u2', name: 'Tsinghua University', country: 'Xitoy', logo: '🇨🇳',
        budget: 4500, ielts: 6.5, gpa: 4.5, grantInfo: 'Full Grant (Barcha xarajatlar qoplanadi)',
        programs: ['Sun\'iy Intellekt', 'Xalqaro munosabatlar', 'Yadro muhandisligi', 'Dasturlash'],
        description: 'Xitoy va Osiyoning 1-raqamli nufuzli universiteti. Dunyo reytingida kuchli o\'nlikka kiradi.'
      },
      {
        id: 'u3', name: 'Hanyang University', country: 'Janubiy Koreya', logo: '🇰🇷',
        budget: 7000, ielts: 6.0, gpa: 3.5, grantInfo: 'Part-time grant (30%-50% kontrakt chegirma)',
        programs: ['Mexatronika', 'Koreys tili va madaniyati', 'Kino va Rejissyorlik', 'IT Menejment'],
        description: 'Janubiy Koreyaning yetakchi xususiy tadqiqot universiteti bo\'lib, texnika va IT sohasida kuchli.'
      },
      {
        id: 'u4', name: 'Monash University', country: 'Avstraliya', logo: '🇦🇺',
        budget: 15000, ielts: 7.0, gpa: 4.2, grantInfo: 'Iqtidorli talabalar uchun $10,000 grant',
        programs: ['Tibbiyot', 'Farmatsevtika', 'Arxitektura', 'Data Science'],
        description: 'Avstraliyaning nufuzli "Group of Eight" guruhiga kiruvchi eng yirik oliygohi.'
      },
      {
        id: 'u5', name: 'Technical University Munich', country: 'Germaniya', logo: '🇩🇪',
        budget: 1500, ielts: 7.5, gpa: 4.5, grantInfo: 'No Tuition (Kontrakt pulisiz, bepul ta\'lim)',
        programs: ['Mashinasozlik', 'Informatika', 'Robototexnika', 'Fizika'],
        description: 'Yevropaning eng kuchli texnika universitetlaridan biri. Ta\'lim mutlaqo bepul, faqat semestr badali to\'lanadi.'
      },
      {
        id: 'u6', name: 'Yonsei University', country: 'Janubiy Koreya', logo: '🇰🇷',
        budget: 8500, ielts: 6.5, gpa: 3.8, grantInfo: 'Global liderlik granti (100% gacha)',
        programs: ['Xalqaro Biznes (Underwood)', 'Biomuharrirlik', 'Iqtisodiyot'],
        description: 'Koreyaning eng mashhur "SKY" universitetlari uchligiga kiruvchi elita ta\'lim muassasasi.'
      },
      {
        id: 'u7', name: 'National University of Singapore', country: 'Singapur', logo: '🇸🇬',
        budget: 18000, ielts: 7.0, gpa: 4.8, grantInfo: 'Singapur hukumati granti (A-star)',
        programs: ['Kvant hisoblashlari', 'Moliya muhandisligi', 'Arxitektura'],
        description: 'Osiyodagi eng nufuzli universitet, jahon miqyosidagi tadqiqot va innovatsiyalar markazi.'
      }
    ];

    for (const uni of defaultUniversities) {
      await pool.query(
        `INSERT INTO universities (id, name, country, logo, budget, ielts, gpa, grant_info, programs, description)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (id) DO NOTHING`,
        [uni.id, uni.name, uni.country, uni.logo, uni.budget, uni.ielts, uni.gpa, uni.grantInfo, JSON.stringify(uni.programs), uni.description]
      );
    }

    console.log('[DB SEED] Default universities inserted.');
  } catch (err) {
    console.error('[DB SEED] Universities seeding xatolik:', err);
  }
}

async function ensureAuthSchema(): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS auth_sessions (
        token TEXT PRIMARY KEY,
        username TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '7 days',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS file_access_tokens (
        token TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        resource_id TEXT NOT NULL,
        username TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
        expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '1 minute',
        used BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_codes (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
        email TEXT NOT NULL,
        code_hash TEXT NOT NULL,
        used BOOLEAN NOT NULL DEFAULT FALSE,
        attempts INTEGER NOT NULL DEFAULT 0,
        locked_until TIMESTAMPTZ,
        expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '10 minutes',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS password_reset_request_log (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_reset_log_username_created
      ON password_reset_request_log(username, created_at)
    `);
    await pool.query('DELETE FROM password_reset_request_log WHERE created_at < now() - interval \'7 days\'');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_token TEXT');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT FALSE');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS plain_password TEXT');
    await pool.query('ALTER TABLE password_reset_codes ADD COLUMN IF NOT EXISTS code_hash TEXT');
    await pool.query('ALTER TABLE password_reset_codes ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0');
    await pool.query('ALTER TABLE password_reset_codes ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ');
    await pool.query('ALTER TABLE password_reset_codes ADD COLUMN IF NOT EXISTS used BOOLEAN NOT NULL DEFAULT FALSE');
    await pool.query('ALTER TABLE password_reset_codes ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval \'10 minutes\'');
    await pool.query('ALTER TABLE password_reset_codes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now()');

    try {
      await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    } catch (err) {
      console.warn('[DB MIGRATION] pgcrypto extension yaratilmadi:', err);
    }

    const { rows: legacyColumnRows } = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'password_reset_codes' AND column_name = 'code'
    `);
    if (legacyColumnRows.length > 0) {
      await pool.query(`
        UPDATE password_reset_codes
        SET code_hash = encode(digest(coalesce(code, ''), 'sha256'), 'hex')
        WHERE code_hash IS NULL AND code IS NOT NULL
      `);
    }
  } catch (err) {
    console.error('[DB MIGRATION] Auth schema yangilanishi xatolik:', err);
  }
}

async function ensureTranslationSchema(): Promise<void> {
  try {
    await pool.query('ALTER TABLE universities ADD COLUMN IF NOT EXISTS name_ru TEXT');
    await pool.query('ALTER TABLE universities ADD COLUMN IF NOT EXISTS grant_info_ru TEXT');
    await pool.query('ALTER TABLE universities ADD COLUMN IF NOT EXISTS programs_ru JSONB');
    await pool.query('ALTER TABLE universities ADD COLUMN IF NOT EXISTS description_ru TEXT');
    await pool.query('ALTER TABLE countries ADD COLUMN IF NOT EXISTS name_ru TEXT');
    await pool.query('ALTER TABLE faculties ADD COLUMN IF NOT EXISTS name_ru TEXT');
    await pool.query('ALTER TABLE faculties ADD COLUMN IF NOT EXISTS description_ru TEXT');
    await pool.query('ALTER TABLE promotions ADD COLUMN IF NOT EXISTS text_ru TEXT');
  } catch (err) {
    console.error('[DB MIGRATION] Translation schema yangilanishi xatolik:', err);
  }
}

// Initialize OpenAI SDK if API Key exists
const openaiApiKey = process.env.OPENAI_API_KEY;
let ai: OpenAI | null = null;
if (openaiApiKey && openaiApiKey !== 'MY_OPENAI_API_KEY') {
  try {
    ai = new OpenAI({ apiKey: openaiApiKey });
    console.log('OpenAI API successfully initialized.');
  } catch (error) {
    console.error('Failed to initialize OpenAI API:', error);
  }
} else {
  console.log('No valid OPENAI_API_KEY found, running AI in simulation mode.');
}

async function translateToRussian(text: string): Promise<string> {
  if (!text) return text;
  if (!ai) return text;

  try {
    const completion = await ai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a translation assistant. Translate the following text into Russian with natural language and preserve names, numbers, and formatting.' },
        { role: 'user', content: `Translate this into Russian:\n\n${text}` }
      ],
      temperature: 0.2,
    });

    const result = completion.choices[0]?.message?.content;
    return result ? String(result).trim() : text;
  } catch (err) {
    console.error('translateToRussian xatolik:', err);
    return text;
  }
}

async function translateArrayToRussian(items: string[]): Promise<string[]> {
  const translated: string[] = [];
  for (const item of items) {
    translated.push(await translateToRussian(item));
  }
  return translated;
}

// Multer — fayllar endi diskka yozilmaydi, xotirada (buffer) ushlanadi va
// to'g'ridan-to'g'ri PostgreSQL'ga (BYTEA ustunga) saqlanadi. Bu ephemeral disk
// bilan hosting qilinganda (Render/Railway kabi) fayllar qayta ishga tushirilganda
// yo'qolib qolmasligini ta'minlaydi.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB limit
});

// Ariza (application) topshirishda birga yuklanadigan hujjat turlari.
// Har biri ixtiyoriy — talaba nechta faylni yuklaganiga qarab saqlanadi.
const APPLICATION_DOC_FIELDS: { field: string; label: string }[] = [
  { field: 'passport', label: 'Pasport nusxasi' },
  { field: 'photo3x4', label: '3x4 rasm' },
  { field: 'birthCert', label: "Metrika (Tug'ilganlik guvohnomasi)" },
  { field: 'idCard', label: 'ID Karta' },
  { field: 'foreignPassport', label: 'Zagran pasport' },
  { field: 'attestat', label: '9-11 sinf attestati' },
];
const uploadApplicationDocs = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }
}).fields(APPLICATION_DOC_FIELDS.map(f => ({ name: f.field, maxCount: 1 })));

// --- TYPES (frontendga yuboriladigan JSON shakli o'zgarishsiz qoladi) ---
interface University {
  id: string;
  name: string;
  country: string;
  logo: string;
  budget: number;
  ielts: number;
  gpa: number;
  grantInfo: string;
  programs: string[];
  description: string;
  latitude?: number | null;
  longitude?: number | null;
  qsRanking?: number | null;
}

interface Application {
  id: string;
  username?: string;
  universityId: string;
  universityName: string;
  universityCountry?: string;
  program: string;
  status: string;
  date: string;
  fatherName?: string;
  fatherPhone?: string;
  motherName?: string;
  motherPhone?: string;
  contactEmail?: string;
  contactPhone?: string;
  history: { status: string; date: string; note: string }[];
  documents: { name: string; type: string; status: string; url?: string }[];
}

interface UserProfile {
  username: string;
  firstName: string;
  lastName: string;
  phone: string;
  budget: number | null;
  ielts_score: number | null;
  has_ielts: boolean | null;
  gpa: number | null;
  has_gpa: boolean | null;
  onboarding_completed: boolean;
  avatarUrl?: string;
  telegram_chat_id?: string;
  last_login_ip?: string;
  role?: 'student' | 'admin' | 'consultant';
}

// --- DB YORDAMCHI FUNKSIYALARI ---
async function getUserByUsername(username: string): Promise<(UserProfile & { password?: string; is_banned?: boolean; plain_password?: string }) | null> {
  const { rows } = await pool.query(
    `SELECT username, password, plain_password, first_name AS "firstName", last_name AS "lastName", phone, email,
            budget, ielts_score::float8 AS ielts_score, has_ielts, gpa::float8 AS gpa, has_gpa, onboarding_completed,
            avatar_url AS "avatarUrl", telegram_chat_id, last_login_ip, role,
            COALESCE(is_banned, FALSE) AS is_banned
     FROM users WHERE username = $1`,
    [username]
  );
  return rows[0] || null;
}

async function userExists(username: string): Promise<boolean> {
  const { rows } = await pool.query('SELECT 1 FROM users WHERE username = $1', [username]);
  return rows.length > 0;
}

async function createSessionToken(username: string): Promise<string> {
  const token = generateSessionToken();
  await pool.query(
    `INSERT INTO auth_sessions (token, username, expires_at) VALUES ($1, $2, now() + interval '7 days')`,
    [token, username]
  );
  return token;
}

async function validateSessionToken(token: string): Promise<(UserProfile & { password?: string }) | null> {
  const { rows } = await pool.query(
    `SELECT username, expires_at FROM auth_sessions WHERE token = $1`,
    [token]
  );
  const sessionRow = rows[0];
  if (!sessionRow) return null;

  if (new Date(sessionRow.expires_at) <= new Date()) {
    await pool.query('DELETE FROM auth_sessions WHERE token = $1', [token]);
    return null;
  }

  return getUserByUsername(sessionRow.username);
}

async function issueSignedFileToken(kind: string, resourceId: string, username: string): Promise<string> {
  const token = generateSessionToken();
  await pool.query(
    `INSERT INTO file_access_tokens (token, kind, resource_id, username, expires_at) VALUES ($1, $2, $3, $4, now() + interval '1 minute')`,
    [token, kind, resourceId, username]
  );
  return token;
}

async function validateSignedFileToken(token: string): Promise<{ kind: string; resourceId: string; username: string } | null> {
  const { rows } = await pool.query(
    `SELECT kind, resource_id AS "resourceId", username, expires_at, used FROM file_access_tokens WHERE token = $1`,
    [token]
  );
  const row = rows[0];
  if (!row || row.used) return null;
  if (new Date(row.expires_at) <= new Date()) {
    await pool.query('DELETE FROM file_access_tokens WHERE token = $1', [token]);
    return null;
  }
  await pool.query('UPDATE file_access_tokens SET used = true WHERE token = $1', [token]);
  return { kind: row.kind, resourceId: row.resourceId, username: row.username };
}

function mapUniversityRow(row: any): University {
  return {
    id: row.id,
    name: row.name,
    nameRu: row.name_ru || null,
    country: row.country,
    logo: row.logo,
    budget: row.budget,
    ielts: row.ielts !== null ? Number(row.ielts) : row.ielts,
    gpa: row.gpa !== null ? Number(row.gpa) : row.gpa,
    grantInfo: row.grant_info,
    grantInfoRu: row.grant_info_ru || null,
    programs: row.programs,
    programsRu: row.programs_ru || null,
    description: row.description,
    descriptionRu: row.description_ru || null,
    latitude: row.latitude !== null ? Number(row.latitude) : null,
    longitude: row.longitude !== null ? Number(row.longitude) : null,
    qsRanking: row.qs_ranking !== null ? Number(row.qs_ranking) : null,
  };
}

async function getAllUniversities(): Promise<University[]> {
  const { rows } = await pool.query('SELECT * FROM universities ORDER BY id');
  return rows.map(mapUniversityRow);
}

async function getApplicationsForUser(username: string | null): Promise<Application[]> {
  const { rows: apps } = await pool.query(
    `SELECT id, username, university_id AS "universityId", university_name AS "universityName",
            university_country AS "universityCountry", program, status, date::text AS date,
            father_name AS "fatherName", father_phone AS "fatherPhone",
            mother_name AS "motherName", mother_phone AS "motherPhone",
            contact_email AS "contactEmail", contact_phone AS "contactPhone"
     FROM applications ${username ? 'WHERE username = $1' : ''} ORDER BY created_at DESC`,
    username ? [username] : []
  );

  const result: Application[] = [];
  for (const app of apps) {
    const { rows: history } = await pool.query(
      `SELECT status, date::text AS date, note FROM application_history WHERE application_id = $1 ORDER BY created_at DESC`,
      [app.id]
    );
    const { rows: docs } = await pool.query(
      `SELECT name, type, status, ('/api/application-documents/file/' || id) AS url
       FROM application_documents WHERE application_id = $1`,
      [app.id]
    );
    result.push({ ...app, history, documents: docs });
  }
  return result;
}

// --- SERVER ---

async function main() {
  const app = express();

  // MUHIM: Hosting (Render/Railway/Nginx/Cloudflare va h.k.) orqasida ishlayotganda
  // Express standart holatda so'rovni yuborgan proxy'ning o'z manzilini qaytaradi.
  // `trust proxy`ni yoqish orqali Express X-Forwarded-For va boshqa proxy header'larini
  // ishonchli o'qiy boshlaydi.
  app.set('trust proxy', true);

  const normalizeIp = (value: string | undefined): string | null => {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed || trimmed === 'unknown' || trimmed === 'undefined') return null;
    const withoutBrackets = trimmed.startsWith('[') && trimmed.includes(']')
      ? trimmed.slice(1, trimmed.indexOf(']'))
      : trimmed;
    const cleaned = withoutBrackets.replace(/^::ffff:/, '');
    const firstPart = cleaned.split(',')[0].trim();
    return firstPart || null;
  };

  const getClientIp = (req: Request): string => {
    const headerCandidates = [
      req.headers['cf-connecting-ip'],
      req.headers['true-client-ip'],
      req.headers['x-real-ip'],
      req.headers['x-forwarded-for'],
      req.headers['x-client-ip'],
    ];

    for (const candidate of headerCandidates) {
      const normalized = normalizeIp(Array.isArray(candidate) ? candidate[0] : candidate);
      if (normalized) return normalized;
    }

    return normalizeIp(req.socket.remoteAddress || req.ip) || '127.0.0.1';
  };

  app.use(express.json());

  // MUHIM (FIX): Railway health-check uchun oddiy, hech nimaga bog'liq bo'lmagan
  // endpoint. Bu route va app.listen() endi ENG BIRINCHI bo'lib ishga tushadi -
  // DB migratsiyalari, SMTP tekshiruvi yoki Telegram bot ishga tushishini kutmaydi.
  // Ilgari bu route faqat DB/SMTP/Telegram init tugagandan keyin ro'yxatga olinar
  // edi - agar ulardan biri (masalan SMTP verify) osilib qolsa, app.listen() hech
  // qachon chaqirilmas, port ochilmas va Railway healthcheck 502/unavailable berardi.
  app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
  });

  app.get('/api/debug/ip', async (req: Request, res: Response) => {
    const ip = getClientIp(req);
    const location = await lookupIpLocation(ip);
    res.json({
      success: true,
      clientIp: ip,
      headers: {
        'x-forwarded-for': req.headers['x-forwarded-for'] || null,
        'x-real-ip': req.headers['x-real-ip'] || null,
        'cf-connecting-ip': req.headers['cf-connecting-ip'] || null,
        'true-client-ip': req.headers['true-client-ip'] || null,
        'x-client-ip': req.headers['x-client-ip'] || null,
      },
      location,
    });
  });

  // MUHIM (FIX): Railway konteynerga PORT env orqali dinamik port beradi.
  // Hardcoded 3000 ishlatilsa, Railway trafikni to'g'ri portga yo'naltira olmay 502 qaytaradi.
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`EduVisa Full-Stack Server running at http://0.0.0.0:${port} (NODE_ENV=${process.env.NODE_ENV || 'undefined'})`);
  });

  // --- SHU YERDAN PASTDA HAMMASI FON REJIMIDA (BACKGROUND) BAJARILADI ---
  // Bular sekin yoki xato bo'lsa ham, server allaqachon tinglayotgani va
  // /api/health javob berayotgani uchun deploy healthcheck'ga ta'sir qilmaydi.

  testConnection()
    .then(() => ensureBaseSchema())
    .then(() => ensureConsultantSchema())
    .then(() => ensureAuthSchema())
    .then(() => ensureTranslationSchema())
    .then(() => ensureUniversitiesSeed())
    .catch((err) => console.error('[DB INIT] Ishga tushirishda xatolik:', err));

  verifySmtpConnection()
    .then(() => console.log('[EMAIL] SMTP ulanishi tayyor'))
    .catch((err) => console.error('[EMAIL] SMTP xatolik:', err));

  // Haqiqiy Telegram botni fon rejimida ishga tushiramiz (TELEGRAM_BOT_TOKEN bo'lsa)
  startTelegramBot().catch((e) => console.error('[TELEGRAM] Ishga tushmadi:', e));

  // Har kuni (server vaqti bo'yicha soat 21:00da, UTC) adminga kunlik hisobot yuboriladi:
  // bugungi/haftalik/oylik statistika + har bir consultant bo'yicha bugungi ko'rsatkichlar.
  const adminChatIdForReport = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (adminChatIdForReport) {
    scheduleDailyReport(21, async () => {
      const reports = await consultantService.getAdminReports();
      const details = await consultantService.getConsultantDetailsForAdmin();
      const lines = [
        `📅 <b>Kunlik hisobot</b>`,
        ``,
        `Bugun: ${reports.today.count} ta klient, ${reports.today.revenue.toLocaleString('uz-UZ')} so'm`,
        `Bu hafta: ${reports.weekly.count} ta klient, ${reports.weekly.revenue.toLocaleString('uz-UZ')} so'm`,
        `Bu oy: ${reports.monthly.count} ta klient, ${reports.monthly.revenue.toLocaleString('uz-UZ')} so'm`,
        ``,
        `<b>Consultantlar (bugun):</b>`,
        ...details
          .filter(d => d.today_cnt > 0)
          .map(d => `👨‍💼 ${d.name}: ${d.today_cnt} ta klient, ${d.today_rev.toLocaleString('uz-UZ')} so'm`),
      ];
      if (!details.some(d => d.today_cnt > 0)) {
        lines.push('Bugun hech kim klient qo\'shmadi.');
      }
      await sendTelegramMessage(adminChatIdForReport, lines.join('\n'));
    });
  }

  // Middleware to retrieve user from a signed session token
  const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Avtorizatsiyadan o\'tilmagan' });
    }
    const token = authHeader.split(' ')[1];
    try {
      const profile = await validateSessionToken(token);
      if (!profile) {
        return res.status(401).json({ error: 'Noto\'g\'ri seans yoki foydalanuvchi topilmadi' });
      }
      delete (profile as any).password;
      (req as any).user = profile;
      (req as any).sessionToken = token;
      next();
    } catch (err) {
      console.error('Auth middleware DB xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi (baza bilan bog\'lanishda)' });
    }
  };

  const ensureAdmin = (req: Request, res: Response): boolean => {
    const user = (req as any).user;
    if (!user || user.role !== 'admin') {
      res.status(403).json({ error: 'Sizda ushbu sahifaga kirish huquqi yo\'q' });
      return false;
    }
    return true;
  };

  // --- API ENDPOINTS ---

  // GET /auth/telegram-bot-url
  app.get('/api/auth/telegram-bot-url', (req: Request, res: Response) => {
    const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'Eduvisa_ai_bot';
    res.json({ success: true, telegramUrl: `https://t.me/${botUsername}` });
  });

  // POST /auth/register-init
  app.post('/api/auth/register-init', async (req: Request, res: Response) => {
    try {
      const { firstName, lastName, phone } = req.body;
      if (!firstName || !lastName || !phone) {
        return res.status(400).json({ error: 'Ism, Familiya va Telefon kiritilishi shart' });
      }

      const normalizedPhone = String(phone).trim().replace(/\s+/g, '');
      const normalizedPhoneForStorage = normalizedPhone.startsWith('+') ? normalizedPhone : `+${normalizedPhone.replace(/\D/g, '')}`;
      if (!normalizedPhoneForStorage || normalizedPhoneForStorage === '+') {
        return res.status(400).json({ error: 'Telefon raqamni to\'g\'ri kiriting' });
      }

      const { rows: phoneRows } = await pool.query('SELECT 1 FROM users WHERE phone = $1', [normalizedPhoneForStorage]);
      if (phoneRows[0]) {
        return res.status(409).json({ error: 'Bu telefon raqamiga allaqachon akkaunt ochilgan' });
      }

      // XAVFSIZLIK (FIX): Ilgari client 'role' maydonini so'rov tanasida yuborib,
      // o'zini to'g'ridan-to'g'ri 'consultant' yoki hatto 'admin' qilib ro'yxatdan
      // o'tkaza olardi (privilege escalation). Endi ro'yxatdan o'tish orqali FAQAT
      // oddiy 'student' yaratiladi. Consultant huquqi faqat admin tomonidan
      // (masalan Telegram botdagi admin buyrug'i / admin panel orqali) beriladi.
      const userRole = 'student';

      const clientIp = getClientIp(req);

      const cleanFirstName = firstName.trim();
      const cleanLastName = lastName.trim();
      let baseUsername = (cleanFirstName + '_' + cleanLastName).toLowerCase().replace(/[^a-z0-9_]/g, '');
      if (!baseUsername) baseUsername = 'user';

      // Prevent collision (bazadan tekshiramiz)
      let username = baseUsername;
      let counter = 1;
      while (await userExists(username)) {
        username = `${baseUsername}${counter}`;
        counter++;
      }

      const password = generateRandomPassword(10);
      const hashedPassword = hashPassword(password);

      await pool.query(
        `INSERT INTO users (username, password, plain_password, first_name, last_name, phone, onboarding_completed, last_login_ip, role)
         VALUES ($1,$2,$3,$4,$5,$6,false,$7,$8)`,
        [username, hashedPassword, password, cleanFirstName, cleanLastName, normalizedPhoneForStorage, clientIp, userRole]
      );

      const startToken = crypto.randomBytes(16).toString('hex'); // 32 belgi, faqat 0-9a-f
      // MUHIM (FIX): users.password ustunida faqat xeshlangan qiymat saqlanadi.
      // Bot foydalanuvchiga asl parolni ko'rsatishi uchun uni shu yerda (hali
      // xotirada, hash bo'lmagan holatda) tokenga bog'lab saqlaymiz.
      await pool.query(
        `INSERT INTO registration_start_tokens (token, username, plain_password) VALUES ($1, $2, $3)`,
        [startToken, username, password]
      );
      const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'Eduvisa_ai_bot';
      const telegramBotUrl = `https://t.me/${botUsername}?start=${startToken}`;

      notifyAdminNewUser({
        username,
        firstName: cleanFirstName,
        lastName: cleanLastName,
        phone: normalizedPhoneForStorage,
        ip: clientIp,
        source: 'form',
      }).catch((e) => console.error('Admin notif xatolik:', e));

      res.json({
        success: true,
        telegramUrl: telegramBotUrl,
      });
    } catch (err) {
      console.error('register-init xatolik:', err);
      res.status(500).json({ error: 'Ro\'yxatdan o\'tishda server xatoligi' });
    }
  });

  // POST /auth/login
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Username va Parol kiritilishi shart' });
      }

      const cleanUsername = username.trim().toLowerCase();
      const profile = await getUserByUsername(cleanUsername);

      if (!profile || !verifyPassword(password, profile.password)) {
        return res.status(401).json({ error: 'Username yoki parol noto\'g\'ri' });
      }

      // Ban tekshiruvi
      if ((profile as any).is_banned) {
        return res.status(403).json({ error: '🚫 Siz tizimdan bloklangansiz. Admin bilan bog\'laning.' });
      }

      const loginIp = getClientIp(req);
      await pool.query('UPDATE users SET last_login_ip = $1 WHERE username = $2', [loginIp, cleanUsername]);

      const sessionToken = await createSessionToken(cleanUsername);
      delete (profile as any).password;
      delete (profile as any).plain_password;
      res.json({ success: true, token: sessionToken, user: { ...profile, last_login_ip: loginIp } });
    } catch (err) {
      console.error('login xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // POST /auth/auto-login
  app.post('/api/auth/auto-login', async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ error: 'Token kiritilishi shart' });
      }

      const { rows } = await pool.query(
        `SELECT username, used, created_at FROM auto_login_tokens WHERE token = $1`,
        [token]
      );
      const tokenRow = rows[0];
      if (!tokenRow) {
        return res.status(401).json({ error: 'Havola noto\'g\'ri yoki allaqachon ishlatilgan' });
      }
      if (tokenRow.used) {
        return res.status(401).json({ error: 'Ushbu havola allaqachon ishlatilgan' });
      }
      const ageMs = Date.now() - new Date(tokenRow.created_at).getTime();
      if (ageMs > 15 * 60 * 1000) {
        return res.status(401).json({ error: 'Havola muddati o\'tgan. Botdan qaytadan urinib ko\'ring.' });
      }

      const profile = await getUserByUsername(tokenRow.username);
      if (!profile) {
        return res.status(401).json({ error: 'Foydalanuvchi topilmadi' });
      }

      // Ban tekshiruvi
      if ((profile as any).is_banned) {
        return res.status(403).json({ error: '🚫 Siz tizimdan bloklangansiz. Admin bilan bog\'laning.' });
      }

      await pool.query('UPDATE auto_login_tokens SET used = true WHERE token = $1', [token]);

      const loginIp = getClientIp(req);
      await pool.query('UPDATE users SET last_login_ip = $1 WHERE username = $2', [loginIp, tokenRow.username]);

      const sessionToken = await createSessionToken(tokenRow.username);
      delete (profile as any).password;
      delete (profile as any).plain_password;
      res.json({ success: true, token: sessionToken, user: { ...profile, last_login_ip: loginIp } });
    } catch (err) {
      console.error('auto-login xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // POST /auth/reset-password/request
  app.post('/api/auth/reset-password/request', async (req: Request, res: Response) => {
    try {
      const { username } = req.body;
      if (!username) {
        return res.status(400).json({ error: 'Username kiritilishi shart' });
      }

      const cleanUsername = String(username).trim().toLowerCase();
      const profile = await getUserByUsername(cleanUsername);
      if (!profile) {
        return res.json({ success: true, message: 'Agar username to\'g\'ri bo\'lsa, Telegram bot orqali yangi parol yuboriladi.' });
      }

      const { rows: recentRows } = await pool.query(
        `SELECT id FROM password_reset_request_log
         WHERE username = $1 AND created_at > now() - interval '60 seconds'
         ORDER BY created_at DESC LIMIT 1`,
        [cleanUsername]
      );
      if (recentRows[0]) {
        return res.status(429).json({ error: 'Iltimos, biroz kuting va qaytadan urinib ko\'ring' });
      }

      const { rows: hourlyRows } = await pool.query(
        `SELECT COUNT(*)::int AS count FROM password_reset_request_log
         WHERE username = $1 AND created_at > now() - interval '1 hour'`,
        [cleanUsername]
      );
      if (hourlyRows[0].count >= 5) {
        return res.status(429).json({
          error: 'Juda ko\'p urinish. Iltimos, 1 soatdan keyin qaytadan urinib ko\'ring'
        });
      }

      await pool.query('INSERT INTO password_reset_request_log (username) VALUES ($1)', [cleanUsername]);

      const newPassword = generateRandomPassword(10);
      await pool.query('UPDATE users SET password = $1 WHERE username = $2', [hashPassword(newPassword), cleanUsername]);
      const clientIp = getClientIp(req);
      await notifyAdminPasswordChanged({
        username: cleanUsername,
        firstName: profile.firstName,
        lastName: profile.lastName,
        ip: clientIp,
        source: 'telegram',
      }).catch((e) => console.error('Admin password-change notif xatolik:', e));

      if (profile.telegram_chat_id) {
        await sendTelegramMessage(
          profile.telegram_chat_id,
          `🔐 <b>Parol qayta tiklandi</b>\n\n` +
          `👤 Username: <code>${cleanUsername}</code>\n` +
          `🔑 Yangi parol: <code>${newPassword}</code>\n\n` +
          `Ushbu ma\'lumotlarni saqlab qo\'ying.`
        );
      }

      res.json({ success: true, message: 'Agar username to\'g\'ri bo\'lsa, Telegram bot orqali yangi parol yuboriladi.' });
    } catch (err) {
      console.error('reset-password request xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // POST /auth/reset-password/verify
  app.post('/api/auth/reset-password/verify', async (req: Request, res: Response) => {
    try {
      const { username, code } = req.body;
      if (!username || !code) {
        return res.status(400).json({ error: 'Username va kod kiritilishi shart' });
      }

      const cleanUsername = String(username).trim().toLowerCase();
      const cleanCode = String(code).trim();
      const { rows } = await pool.query(
        `SELECT id, attempts, locked_until FROM password_reset_codes
         WHERE username = $1 AND used = FALSE AND expires_at > now()
         ORDER BY created_at DESC LIMIT 1`,
        [cleanUsername]
      );
      const resetRow = rows[0];
      if (!resetRow) {
        return res.status(400).json({ error: 'Kod topilmadi yoki muddati o\'tgan, qaytadan so\'rang' });
      }

      if (resetRow.locked_until && new Date(resetRow.locked_until) > new Date()) {
        const remainingSeconds = Math.max(1, Math.ceil((new Date(resetRow.locked_until).getTime() - Date.now()) / 60000));
        return res.status(429).json({ error: `Juda ko\'p noto\'g\'ri urinish. Iltimos, ${remainingSeconds} daqiqadan keyin qaytadan urinib ko\'ring` });
      }

      const expectedHash = hashOtpCode(cleanCode);
      const { rows: candidateRows } = await pool.query(
        `SELECT id, code_hash FROM password_reset_codes WHERE id = $1`,
        [resetRow.id]
      );
      const candidateRow = candidateRows[0];
      if (!candidateRow || candidateRow.code_hash !== expectedHash) {
        const newAttempts = Number(resetRow.attempts) + 1;
        await pool.query('UPDATE password_reset_codes SET attempts = $1 WHERE id = $2', [newAttempts, resetRow.id]);
        if (newAttempts >= 3) {
          await pool.query('UPDATE password_reset_codes SET locked_until = now() + interval \'15 minutes\' WHERE id = $1', [resetRow.id]);
          return res.status(429).json({ error: '3 marta xato kiritdingiz. 15 daqiqadan keyin qaytadan urinib ko\'ring' });
        }
        return res.status(400).json({ error: `Kod noto\'g\'ri. Yana ${3 - newAttempts} ta urinishingiz qoldi` });
      }

      res.json({ success: true, message: 'Kod tasdiqlandi.' });
    } catch (err) {
      console.error('reset-password verify xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // POST /auth/reset-password/confirm
  app.post('/api/auth/reset-password/confirm', async (req: Request, res: Response) => {
    try {
      const { username, code, newPassword } = req.body;
      if (!username || !code || !newPassword) {
        return res.status(400).json({ error: 'Username, kod va yangi parol kiritilishi shart' });
      }
      if (typeof newPassword !== 'string' || newPassword.trim().length < 8) {
        return res.status(400).json({ error: 'Yangi parol kamida 8 belgidan iborat bo\'lishi kerak' });
      }

      const cleanUsername = String(username).trim().toLowerCase();
      const cleanCode = String(code).trim();
      const { rows } = await pool.query(
        `SELECT id, attempts, locked_until FROM password_reset_codes
         WHERE username = $1 AND used = FALSE AND expires_at > now()
         ORDER BY created_at DESC LIMIT 1`,
        [cleanUsername]
      );
      const resetRow = rows[0];
      if (!resetRow) {
        return res.status(400).json({ error: 'Kod topilmadi yoki muddati o\'tgan, qaytadan so\'rang' });
      }

      if (resetRow.locked_until && new Date(resetRow.locked_until) > new Date()) {
        const remainingSeconds = Math.max(1, Math.ceil((new Date(resetRow.locked_until).getTime() - Date.now()) / 60000));
        return res.status(429).json({ error: `Juda ko\'p noto\'g\'ri urinish. Iltimos, ${remainingSeconds} daqiqadan keyin qaytadan urinib ko\'ring` });
      }

      const expectedHash = hashOtpCode(cleanCode);
      const { rows: candidateRows } = await pool.query(
        `SELECT id, code_hash FROM password_reset_codes WHERE id = $1`,
        [resetRow.id]
      );
      const candidateRow = candidateRows[0];
      if (!candidateRow || candidateRow.code_hash !== expectedHash) {
        const newAttempts = Number(resetRow.attempts) + 1;
        await pool.query('UPDATE password_reset_codes SET attempts = $1 WHERE id = $2', [newAttempts, resetRow.id]);
        if (newAttempts >= 3) {
          await pool.query('UPDATE password_reset_codes SET locked_until = now() + interval \'15 minutes\' WHERE id = $1', [resetRow.id]);
          return res.status(429).json({ error: '3 marta xato kiritdingiz. 15 daqiqadan keyin qaytadan urinib ko\'ring' });
        }
        return res.status(400).json({ error: `Kod noto\'g\'ri. Yana ${3 - newAttempts} ta urinishingiz qoldi` });
      }

      await pool.query('UPDATE users SET password = $1 WHERE username = $2', [hashPassword(newPassword.trim()), cleanUsername]);
      await pool.query('UPDATE password_reset_codes SET used = TRUE WHERE id = $1', [resetRow.id]);
      const profile = await getUserByUsername(cleanUsername);
      const clientIp = getClientIp(req);
      await notifyAdminPasswordChanged({
        username: cleanUsername,
        firstName: profile?.firstName,
        lastName: profile?.lastName,
        ip: clientIp,
        source: 'reset',
      }).catch((e) => console.error('Admin password-change notif xatolik:', e));
      res.json({ success: true, message: 'Parol muvaffaqiyatli yangilandi. Endi yangi parol bilan tizimga kiring.' });
    } catch (err) {
      console.error('reset-password confirm xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // POST /auth/refresh
  app.post('/api/auth/refresh', authMiddleware, (req: Request, res: Response) => {
    const user = (req as any).user;
    res.json({ success: true, token: (req as any).sessionToken, user });
  });

  // GET /profile/onboarding-status
  app.get('/api/profile/onboarding-status', authMiddleware, (req: Request, res: Response) => {
    const user = (req as any).user;
    res.json({ onboarding_completed: user.onboarding_completed });
  });

  // POST /profile/onboarding
  app.post('/api/profile/onboarding', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { budget, ielts_score, has_ielts, gpa, has_gpa } = req.body;

      const newBudget = budget !== undefined ? Number(budget) : null;
      const newIelts = ielts_score !== undefined ? Number(ielts_score) : null;
      const newHasIelts = has_ielts !== undefined ? Boolean(has_ielts) : null;
      const newGpa = gpa !== undefined ? Number(gpa) : null;
      const newHasGpa = has_gpa !== undefined ? Boolean(has_gpa) : null;

      const { rows } = await pool.query(
        `UPDATE users SET budget=$1, ielts_score=$2, has_ielts=$3, gpa=$4, has_gpa=$5, onboarding_completed=true
         WHERE username=$6
         RETURNING username, first_name AS "firstName", last_name AS "lastName", phone, budget, ielts_score::float8 AS ielts_score,
                   has_ielts, gpa::float8 AS gpa, has_gpa, onboarding_completed, avatar_url AS "avatarUrl",
                   telegram_chat_id, last_login_ip, role`,
        [newBudget, newIelts, newHasIelts, newGpa, newHasGpa, user.username]
      );

      res.json({ success: true, user: rows[0] });
    } catch (err) {
      console.error('onboarding xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // GET /profile
  app.get('/api/profile', authMiddleware, (req: Request, res: Response) => {
    res.json((req as any).user);
  });

  // PATCH /profile
  app.patch('/api/profile', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { firstName, lastName, phone, email, budget, ielts_score, gpa, has_ielts, has_gpa } = req.body;

      const { rows } = await pool.query(
        `UPDATE users SET
           first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           phone = COALESCE($3, phone),
           email = COALESCE($4, email),
           budget = CASE WHEN $5::text IS NULL THEN budget ELSE NULLIF($5, '')::int END,
           ielts_score = CASE WHEN $6::text IS NULL THEN ielts_score ELSE NULLIF($6, '')::numeric END,
           gpa = CASE WHEN $7::text IS NULL THEN gpa ELSE NULLIF($7, '')::numeric END,
           has_ielts = COALESCE($8, has_ielts),
           has_gpa = COALESCE($9, has_gpa)
         WHERE username = $10
         RETURNING username, first_name AS "firstName", last_name AS "lastName", phone, email, budget, ielts_score::float8 AS ielts_score,
                   has_ielts, gpa::float8 AS gpa, has_gpa, onboarding_completed, avatar_url AS "avatarUrl",
                   telegram_chat_id, last_login_ip, role`,
        [
          firstName ?? null,
          lastName ?? null,
          phone ?? null,
          email ? String(email).trim().toLowerCase() : null,
          budget === undefined ? null : (budget === null ? '' : String(budget)),
          ielts_score === undefined ? null : (ielts_score === null ? '' : String(ielts_score)),
          gpa === undefined ? null : (gpa === null ? '' : String(gpa)),
          has_ielts === undefined ? null : Boolean(has_ielts),
          has_gpa === undefined ? null : Boolean(has_gpa),
          user.username,
        ]
      );

      res.json({ success: true, user: rows[0] });
    } catch (err) {
      console.error('profile patch xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // GET /universities
  app.get('/api/universities', async (req: Request, res: Response) => {
    try {
      const { country, match_profile, username } = req.query;
      let list = await getAllUniversities();

      if (country) {
        list = list.filter(u => u.country.toLowerCase() === String(country).toLowerCase());
      }

      if (match_profile === 'true' && username) {
        const user = await getUserByUsername(String(username).toLowerCase());
        if (user) {
          list = list.filter(u => {
            const budgetMatch = user.budget === null || u.budget <= user.budget || u.budget <= 5000;
            const ieltsMatch = user.ielts_score === null || !user.has_ielts || u.ielts <= Number(user.ielts_score);
            return budgetMatch && ieltsMatch;
          });
        }
      }

      res.json(list);
    } catch (err) {
      console.error('universities xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // GET /api/universities/recommended
  app.get('/api/universities/recommended', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const all = await getAllUniversities();
      const recommended = all.filter(u => {
        const userBudget = user.budget || 20000;
        const budgetOk = u.budget <= userBudget;
        const userIelts = user.has_ielts ? (user.ielts_score || 0) : 0;
        const ieltsOk = !u.ielts || u.ielts <= userIelts || userIelts === 0;
        return budgetOk && ieltsOk;
      });
      res.json(recommended.slice(0, 5));
    } catch (err) {
      console.error('recommended xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // POST /api/admin/upload-image
  // Admin panelidan (masalan davlat cover rasmi) rasmni URL orqali emas,
  // to'g'ridan-to'g'ri kompyuterdan fayl sifatida yuklash uchun. Ko'p rasm
  // hostinglari (masalan tashqi saytlar) URL orqali hotlink qilishni
  // qo'llab-quvvatlamagani sababli, rasm serverimizga saqlanadi va
  // o'zimizning /api/images/:id manzilidan xizmat qiladi.
  app.post('/api/admin/upload-image', authMiddleware, upload.single('image'), async (req: Request, res: Response) => {
    try {
      const admin = (req as any).user;
      if (admin.role !== 'admin') {
        return res.status(403).json({ error: 'Sizda ushbu sahifaga kirish huquqi yo\'q' });
      }
      if (!req.file) {
        return res.status(400).json({ error: 'Yuklash uchun rasm tanlanmagan' });
      }
      if (!req.file.mimetype.startsWith('image/')) {
        return res.status(400).json({ error: 'Faqat rasm fayllarini yuklash mumkin' });
      }

      const id = 'img_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
      await pool.query(
        `INSERT INTO images (id, mime_type, file_data) VALUES ($1,$2,$3)`,
        [id, req.file.mimetype, req.file.buffer]
      );

      res.json({ success: true, url: `/api/images/${id}` });
    } catch (err) {
      console.error('rasm yuklash xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // GET /api/images/:id — yuklangan rasmni xizmat qiladi (public, autentifikatsiyasiz,
  // chunki bu rasmlar barcha foydalanuvchilarga ko'rsatiladigan ochiq kontent, masalan
  // davlat cover rasmi).
  app.get('/api/images/:id', async (req: Request, res: Response) => {
    try {
      const { rows } = await pool.query('SELECT mime_type, file_data FROM images WHERE id = $1', [req.params.id]);
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Rasm topilmadi' });
      }
      res.setHeader('Content-Type', rows[0].mime_type);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.send(rows[0].file_data);
    } catch (err) {
      console.error('rasm xizmat qilish xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // GET /api/countries
  app.get('/api/countries', async (req: Request, res: Response) => {
    try {
      const { rows } = await pool.query('SELECT id, name, name_ru AS "nameRu", flag, cover_image AS "coverImage" FROM countries ORDER BY name');
      res.json(rows);
    } catch (err) {
      console.error('countries xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // GET /api/faculties
  app.get('/api/faculties', async (req: Request, res: Response) => {
    try {
      const { universityId } = req.query;
      const query = universityId ?
        'SELECT id, university_id AS "universityId", name, name_ru AS "nameRu", description, description_ru AS "descriptionRu" FROM faculties WHERE university_id = $1 ORDER BY created_at DESC' :
        'SELECT id, university_id AS "universityId", name, name_ru AS "nameRu", description, description_ru AS "descriptionRu" FROM faculties ORDER BY created_at DESC';
      const params = universityId ? [universityId] : [];
      const { rows } = await pool.query(query, params);
      res.json(rows);
    } catch (err) {
      console.error('faculties xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // GET /universities/{id}
  app.get('/api/universities/:id', async (req: Request, res: Response) => {
    try {
      const { rows } = await pool.query('SELECT * FROM universities WHERE id = $1', [req.params.id]);
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Universitet topilmadi' });
      }
      res.json(mapUniversityRow(rows[0]));
    } catch (err) {
      console.error('university by id xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // POST /interests (toggle bookmark)
  app.post('/api/interests', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { universityId } = req.body;

      if (!universityId) {
        return res.status(400).json({ error: 'universityId talab qilinadi' });
      }

      const { rows: existing } = await pool.query(
        'SELECT 1 FROM interests WHERE username = $1 AND university_id = $2',
        [user.username, universityId]
      );

      let saved = false;
      if (existing.length > 0) {
        await pool.query('DELETE FROM interests WHERE username = $1 AND university_id = $2', [user.username, universityId]);
      } else {
        await pool.query('INSERT INTO interests (username, university_id) VALUES ($1, $2)', [user.username, universityId]);
        saved = true;
      }

      const { rows: all } = await pool.query('SELECT university_id FROM interests WHERE username = $1', [user.username]);
      res.json({ success: true, saved, interests: all.map(r => r.university_id) });
    } catch (err) {
      console.error('interests xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // GET /interests (for user)
  app.get('/api/interests', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { rows } = await pool.query('SELECT university_id FROM interests WHERE username = $1', [user.username]);
      res.json(rows.map(r => r.university_id));
    } catch (err) {
      console.error('get interests xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // GET /applications
  app.get('/api/applications', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      res.json(await getApplicationsForUser(user.username));
    } catch (err) {
      console.error('applications xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // POST /applications (create new application)
  app.post('/api/applications', authMiddleware, uploadApplicationDocs, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const {
        universityId, program,
        fatherName, fatherPhone, motherName, motherPhone,
        contactEmail, contactPhone
      } = req.body;

      if (!universityId || !program) {
        return res.status(400).json({ error: 'Universitet va Dastur tanlanishi shart' });
      }
      if (!contactEmail || !contactPhone) {
        return res.status(400).json({ error: 'Email va aloqa telefon raqami kiritilishi shart' });
      }

      const { rows: uniRows } = await pool.query('SELECT * FROM universities WHERE id = $1', [universityId]);
      if (uniRows.length === 0) {
        return res.status(404).json({ error: 'Universitet topilmadi' });
      }
      const uni = mapUniversityRow(uniRows[0]);

      const newId = crypto.randomUUID();
      const today = new Date().toISOString().split('T')[0];

      await pool.query(
        `INSERT INTO applications
           (id, username, university_id, university_name, university_country, program, status, date,
            father_name, father_phone, mother_name, mother_phone, contact_email, contact_phone)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          newId, user.username, universityId, uni.name, uni.country, program, "🟡 Ko'rib chiqilyapti", today,
          fatherName || null, fatherPhone || null, motherName || null, motherPhone || null,
          contactEmail, contactPhone
        ]
      );

      await pool.query(
        `INSERT INTO application_history (application_id, status, date, note) VALUES ($1,$2,$3,$4)`,
        [newId, "🟡 Arizaga start berildi", today, 'Sizning arizangiz tizimda ro\'yxatga olindi va tez orada ko\'rib chiqiladi.']
      );

      const files = (req.files || {}) as { [field: string]: Express.Multer.File[] };
      for (const { field, label } of APPLICATION_DOC_FIELDS) {
        const file = files[field]?.[0];
        if (!file) continue;
        const formattedSize = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
        await pool.query(
          `INSERT INTO application_documents (application_id, name, type, status, size, file_data, mime_type)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [newId, file.originalname, label, 'Yuklangan', formattedSize, file.buffer, file.mimetype]
        );
      }

      const apps = await getApplicationsForUser(user.username);
      const newApp = apps.find(a => a.id === newId);

      res.json({ success: true, application: newApp });
    } catch (err) {
      console.error('create application xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // GET /applications/{id}
  app.get('/api/applications/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const apps = await getApplicationsForUser(user.username);
      const appItem = apps.find(a => a.id === req.params.id);
      if (!appItem) {
        return res.status(404).json({ error: 'Ariza topilmadi' });
      }
      res.json(appItem);
    } catch (err) {
      console.error('application by id xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // GET /applications/{id}/zip
  app.get('/api/applications/:id/zip', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { rows } = await pool.query(
        `SELECT id, username, university_name AS "universityName", university_country AS "universityCountry", program, status, date::text AS date,
                father_name AS "fatherName", father_phone AS "fatherPhone", mother_name AS "motherName", mother_phone AS "motherPhone",
                contact_email AS "contactEmail", contact_phone AS "contactPhone"
         FROM applications WHERE id = $1`,
        [req.params.id]
      );

      const appItem = rows[0];
      if (!appItem) {
        return res.status(404).json({ error: 'Ariza topilmadi' });
      }
      if (user.role !== 'admin' && appItem.username !== user.username) {
        return res.status(403).json({ error: 'Ushbu arizani yuklashga ruxsatingiz yo‘q' });
      }

      const { rows: docs } = await pool.query(
        `SELECT name, mime_type AS "mimeType", file_data AS "fileData"
         FROM application_documents WHERE application_id = $1 ORDER BY id`,
        [req.params.id]
      );

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="eduvisa_application_${req.params.id}.zip"`);

      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.on('error', (err) => {
        console.error('zip creation error:', err);
        res.status(500).end();
      });

      archive.pipe(res);
      archive.append(JSON.stringify(appItem, null, 2), { name: 'application_metadata.json' });
      docs.forEach((doc: any) => {
        const sanitized = doc.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        archive.append(doc.fileData, { name: sanitized, type: 'file' });
      });
      await archive.finalize();
    } catch (err) {
      console.error('application zip xatolik:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Server xatoligi' });
      }
    }
  });

  // POST /documents/upload
  app.post('/api/documents/upload', authMiddleware, upload.single('file'), async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (!req.file) {
        return res.status(400).json({ error: 'Yuklash uchun fayl tanlanmagan' });
      }

      const fileType = req.body.type || 'Boshqa hujjat';
      const formattedSize = (req.file.size / (1024 * 1024)).toFixed(2) + ' MB';

      const { rows } = await pool.query(
        `INSERT INTO documents (username, name, type, size, status, file_data, mime_type)
         VALUES ($1,$2,$3,$4,'Tasdiqlangan',$5,$6)
         RETURNING id, name, type, size, status, ('/api/documents/file/' || id) AS url`,
        [user.username, req.file.originalname, fileType, formattedSize, req.file.buffer, req.file.mimetype]
      );

      res.json({ success: true, document: rows[0] });
    } catch (err) {
      console.error('document upload xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  app.get('/api/file-access/documents/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const token = await issueSignedFileToken('documents', req.params.id, user.username);
      const host = req.get('host') || 'localhost';
      const protocol = req.protocol || 'http';
      res.json({ success: true, url: `${protocol}://${host}/api/documents/file/${req.params.id}?auth=${encodeURIComponent(token)}` });
    } catch (err) {
      console.error('document signed url xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  app.get('/api/file-access/application-documents/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const token = await issueSignedFileToken('application-documents', req.params.id, user.username);
      const host = req.get('host') || 'localhost';
      const protocol = req.protocol || 'http';
      res.json({ success: true, url: `${protocol}://${host}/api/application-documents/file/${req.params.id}?auth=${encodeURIComponent(token)}` });
    } catch (err) {
      console.error('application document signed url xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  app.get('/api/file-access/clients/receipt/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const token = await issueSignedFileToken('clients/receipt', req.params.id, user.username);
      const host = req.get('host') || 'localhost';
      const protocol = req.protocol || 'http';
      res.json({ success: true, url: `${protocol}://${host}/api/clients/receipt/${req.params.id}?auth=${encodeURIComponent(token)}` });
    } catch (err) {
      console.error('receipt signed url xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // GET /documents/file/:id
  app.get('/api/documents/file/:id', async (req: Request, res: Response) => {
    try {
      const headerToken = req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : null;
      const queryToken = typeof req.query.auth === 'string' ? req.query.auth : null;
      const token = headerToken || queryToken;
      if (!token) {
        return res.status(401).json({ error: 'Avtorizatsiyadan o\'tilmagan' });
      }

      let requester = null;
      let signedAccess = null;
      if (token) {
        signedAccess = await validateSignedFileToken(token);
      }
      if (signedAccess) {
        requester = await getUserByUsername(signedAccess.username);
      } else {
        requester = await validateSessionToken(token);
      }
      if (!requester) {
        return res.status(401).json({ error: 'Noto\'g\'ri seans' });
      }

      const { rows } = await pool.query(
        'SELECT username, name, mime_type, file_data FROM documents WHERE id = $1',
        [req.params.id]
      );
      const doc = rows[0];
      if (!doc || !doc.file_data) {
        return res.status(404).json({ error: 'Fayl topilmadi' });
      }
      if (requester.role !== 'admin' && requester.username !== doc.username) {
        return res.status(403).json({ error: 'Ushbu faylni ko\'rishga ruxsatingiz yo\'q' });
      }

      res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.name)}"`);
      res.send(doc.file_data);
    } catch (err) {
      console.error('document file xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // GET /application-documents/file/:id
  app.get('/api/application-documents/file/:id', async (req: Request, res: Response) => {
    try {
      const headerToken = req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : null;
      const queryToken = typeof req.query.auth === 'string' ? req.query.auth : null;
      const token = headerToken || queryToken;
      if (!token) {
        return res.status(401).json({ error: 'Avtorizatsiyadan o\'tilmagan' });
      }

      let requester = null;
      let signedAccess = null;
      if (token) {
        signedAccess = await validateSignedFileToken(token);
      }
      if (signedAccess) {
        requester = await getUserByUsername(signedAccess.username);
      } else {
        requester = await validateSessionToken(token);
      }
      if (!requester) {
        return res.status(401).json({ error: 'Noto\'g\'ri seans' });
      }

      const { rows } = await pool.query(
        `SELECT ad.name, ad.mime_type, ad.file_data, a.username
         FROM application_documents ad
         JOIN applications a ON a.id = ad.application_id
         WHERE ad.id = $1`,
        [req.params.id]
      );
      const doc = rows[0];
      if (!doc || !doc.file_data) {
        return res.status(404).json({ error: 'Fayl topilmadi' });
      }
      if (requester.role !== 'admin' && requester.username !== doc.username) {
        return res.status(403).json({ error: 'Ushbu faylni ko\'rishga ruxsatingiz yo\'q' });
      }

      res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.name)}"`);
      res.send(doc.file_data);
    } catch (err) {
      console.error('application document file xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // GET /documents
  app.get('/api/documents', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { rows } = await pool.query(
        `SELECT id, name, type, size, status, ('/api/documents/file/' || id) AS url
         FROM documents WHERE username = $1 ORDER BY created_at DESC`,
        [user.username]
      );
      res.json(rows);
    } catch (err) {
      console.error('get documents xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // --- ADMIN ENDPOINTS ---

  // GET /api/admin/students
  app.get('/api/admin/students', authMiddleware, async (req: Request, res: Response) => {
    try {
      const admin = (req as any).user;
      if (admin.role !== 'admin') {
        return res.status(403).json({ error: 'Sizda ushbu sahifaga kirish huquqi yo\'q' });
      }
      const { rows } = await pool.query(
        `SELECT username, plain_password, first_name AS "firstName", last_name AS "lastName", phone, budget, ielts_score::float8 AS ielts_score,
                has_ielts, gpa::float8 AS gpa, has_gpa, onboarding_completed, avatar_url AS "avatarUrl",
                telegram_chat_id, last_login_ip, role, COALESCE(is_banned, FALSE) AS is_banned
         FROM users WHERE role != 'admin' ORDER BY created_at DESC`
      );
      res.json(rows);
    } catch (err) {
      console.error('admin students xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // POST /api/admin/users/:username/ban — Foydalanuvchini ban/unban qilish
  app.post('/api/admin/users/:username/ban', authMiddleware, async (req: Request, res: Response) => {
    try {
      if (!ensureAdmin(req, res)) return;
      const { username } = req.params;
      const { banned } = req.body;
      if (typeof banned !== 'boolean') {
        return res.status(400).json({ error: 'banned maydoni boolean bo\'lishi kerak' });
      }
      const { rows } = await pool.query(
        'UPDATE users SET is_banned = $1 WHERE username = $2 AND role != \'admin\' RETURNING username',
        [banned, username]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Foydalanuvchi topilmadi yoki admin bloklanmaydi' });
      }
      // Agar ban qilinsa barcha sessiyalarni o'chiramiz
      if (banned) {
        await pool.query('DELETE FROM auth_sessions WHERE username = $1', [username]);
      }
      res.json({ success: true, username, is_banned: banned });
    } catch (err) {
      console.error('admin ban user xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // GET /api/admin/users/:username/ip-location — IP manzili va joylashuvini olish
  app.get('/api/admin/users/:username/ip-location', authMiddleware, async (req: Request, res: Response) => {
    try {
      if (!ensureAdmin(req, res)) return;
      const { rows } = await pool.query('SELECT last_login_ip FROM users WHERE username = $1', [req.params.username]);
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
      }
      const ip = rows[0].last_login_ip;
      if (!ip) {
        return res.json({ success: true, ip: null, location: null });
      }
      const location = await lookupIpLocation(ip);
      res.json({ success: true, ip, location });
    } catch (err) {
      console.error('ip location xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // GET /api/admin/applications
  app.get('/api/admin/applications', authMiddleware, async (req: Request, res: Response) => {
    try {
      const admin = (req as any).user;
      if (admin.role !== 'admin') {
        return res.status(403).json({ error: 'Sizda ushbu sahifaga kirish huquqi yo\'q' });
      }

      res.json(await getApplicationsForUser(null));
    } catch (err) {
      console.error('admin applications xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // PATCH /api/admin/applications/:id
  app.patch('/api/admin/applications/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
      const admin = (req as any).user;
      if (admin.role !== 'admin') {
        return res.status(403).json({ error: 'Sizda ushbu sahifaga kirish huquqi yo\'q' });
      }

      const { status, note } = req.body;
      const appId = req.params.id;

      const { rows: existing } = await pool.query('SELECT * FROM applications WHERE id = $1', [appId]);
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Ariza topilmadi' });
      }

      const currentStatus = existing[0].status;
      const finalStatus = status || currentStatus;

      if (status) {
        await pool.query('UPDATE applications SET status = $1 WHERE id = $2', [status, appId]);
      }

      const today = new Date().toISOString().split('T')[0];
      await pool.query(
        `INSERT INTO application_history (application_id, status, date, note) VALUES ($1,$2,$3,$4)`,
        [appId, finalStatus, today, note || `Ariza holati o'zgartirildi: ${status}`]
      );

      const { rows: history } = await pool.query(
        `SELECT status, date::text AS date, note FROM application_history WHERE application_id = $1 ORDER BY created_at DESC`,
        [appId]
      );
      const { rows: docs } = await pool.query(
        `SELECT name, type, status FROM application_documents WHERE application_id = $1`,
        [appId]
      );

      res.json({
        success: true,
        application: {
          id: appId,
          universityId: existing[0].university_id,
          universityName: existing[0].university_name,
          program: existing[0].program,
          status: finalStatus,
          date: existing[0].date,
          history,
          documents: docs,
        },
      });
    } catch (err) {
      console.error('admin patch application xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // GET /api/admin/documents
  app.get('/api/admin/documents', authMiddleware, async (req: Request, res: Response) => {
    try {
      const admin = (req as any).user;
      if (admin.role !== 'admin') {
        return res.status(403).json({ error: 'Sizda ushbu sahifaga kirish huquqi yo\'q' });
      }

      const { rows } = await pool.query(
        `SELECT id, name, type, size, status, ('/api/documents/file/' || id) AS url, username FROM documents ORDER BY created_at DESC`
      );
      res.json(rows);
    } catch (err) {
      console.error('admin documents xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // PATCH /api/admin/documents/:id
  app.patch('/api/admin/documents/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
      const admin = (req as any).user;
      if (admin.role !== 'admin') {
        return res.status(403).json({ error: 'Sizda ushbu sahifaga kirish huquqi yo\'q' });
      }

      const { id } = req.params;
      const { status } = req.body;

      const { rows } = await pool.query(
        `UPDATE documents SET status = $1 WHERE id = $2
         RETURNING id, name, type, size, status, ('/api/documents/file/' || id) AS url`,
        [status, id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Hujjat topilmadi' });
      }

      res.json({ success: true, document: rows[0] });
    } catch (err) {
      console.error('admin patch document xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // GET /api/admin/universities
  app.get('/api/admin/universities', authMiddleware, async (req: Request, res: Response) => {
    try {
      const admin = (req as any).user;
      if (admin.role !== 'admin') {
        return res.status(403).json({ error: 'Sizda ushbu sahifaga kirish huquqi yo\'q' });
      }
      const list = await getAllUniversities();
      res.json(list);
    } catch (err) {
      console.error('admin universities xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // POST /api/admin/universities
  app.post('/api/admin/universities', authMiddleware, async (req: Request, res: Response) => {
    try {
      const admin = (req as any).user;
      if (admin.role !== 'admin') {
        return res.status(403).json({ error: 'Sizda ushbu sahifaga kirish huquqi yo\'q' });
      }
      const { name, country, logo, budget, ielts, gpa, grantInfo, programs, description } = req.body;
      if (!name || !country || budget === undefined || ielts === undefined || gpa === undefined) {
        return res.status(400).json({ error: 'Universitet nomi, davlat, budjet, IELTS va GPA talab qilinadi' });
      }

      const id = 'uni_' + Date.now();
      const programsArray = Array.isArray(programs) ? programs : (programs ? String(programs).split(',').map((p: string) => p.trim()).filter(Boolean) : []);
      const nameRu = await translateToRussian(String(name).trim());
      const grantInfoRu = grantInfo ? await translateToRussian(String(grantInfo)) : null;
      const programsRu = programsArray.length > 0 ? await translateArrayToRussian(programsArray) : null;
      const descriptionRu = description ? await translateToRussian(String(description)) : null;

      await pool.query(
        `INSERT INTO universities (id, name, name_ru, country, logo, budget, ielts, gpa, grant_info, grant_info_ru, programs, programs_ru, description, description_ru)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [id, name.trim(), nameRu, country.trim(), logo || '🏫', Number(budget), Number(ielts), Number(gpa), grantInfo || '', grantInfoRu, programsArray, programsRu, description || '', descriptionRu]
      );

      const { rows } = await pool.query('SELECT * FROM universities WHERE id = $1', [id]);
      res.json({ success: true, university: mapUniversityRow(rows[0]) });
    } catch (err) {
      console.error('admin create university xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // GET /api/admin/countries
  app.get('/api/admin/countries', authMiddleware, async (req: Request, res: Response) => {
    try {
      const admin = (req as any).user;
      if (admin.role !== 'admin') {
        return res.status(403).json({ error: 'Sizda ushbu sahifaga kirish huquqi yo\'q' });
      }
      const { rows } = await pool.query('SELECT id, name, name_ru AS "nameRu", flag, cover_image AS "coverImage" FROM countries ORDER BY name');
      res.json(rows);
    } catch (err) {
      console.error('admin countries xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // POST /api/admin/countries
  app.post('/api/admin/countries', authMiddleware, async (req: Request, res: Response) => {
    try {
      const admin = (req as any).user;
      if (admin.role !== 'admin') {
        return res.status(403).json({ error: 'Sizda ushbu sahifaga kirish huquqi yo\'q' });
      }
      const { name, flag, coverImage } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Davlat nomi kiritilishi shart' });
      }
      const id = 'country_' + Date.now();
      const nameRu = await translateToRussian(String(name).trim());
      const { rows } = await pool.query(
        `INSERT INTO countries (id, name, name_ru, flag, cover_image) VALUES ($1,$2,$3,$4,$5) RETURNING id, name, name_ru AS "nameRu", flag, cover_image AS "coverImage"`,
        [id, name.trim(), nameRu, flag || '🏳️', coverImage || null]
      );
      res.json({ success: true, country: rows[0] });
    } catch (err) {
      console.error('admin add country xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // PATCH /api/admin/countries/:id — davlat ma'lumotini tahrirlash.
  // Agar nomi (uz) o'zgartirilsa va aniq ruscha tarjima yuborilmasa, ruscha
  // nomi avtomatik ravishda AI orqali qayta tarjima qilinadi — shunday qilib
  // uz va ru versiyalari doim bir-biriga mos keladi.
  app.patch('/api/admin/countries/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
      const admin = (req as any).user;
      if (admin.role !== 'admin') {
        return res.status(403).json({ error: 'Sizda ushbu sahifaga kirish huquqi yo\'q' });
      }
      const { name, nameRu: nameRuInput, flag, coverImage } = req.body;
      const id = req.params.id;

      let nameRu: string | null | undefined = nameRuInput;
      if (name && !nameRuInput) {
        nameRu = await translateToRussian(String(name).trim());
      }

      const { rows } = await pool.query(
        `UPDATE countries SET
           name = COALESCE($1, name),
           name_ru = COALESCE($2, name_ru),
           flag = COALESCE($3, flag),
           cover_image = COALESCE($4, cover_image)
         WHERE id = $5
         RETURNING id, name, name_ru AS "nameRu", flag, cover_image AS "coverImage"`,
        [name?.trim() || null, nameRu || null, flag || null, coverImage || null, id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Davlat topilmadi' });
      }
      res.json({ success: true, country: rows[0] });
    } catch (err) {
      console.error('admin patch country xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // DELETE /api/admin/countries/:id
  app.delete('/api/admin/countries/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
      const admin = (req as any).user;
      if (admin.role !== 'admin') {
        return res.status(403).json({ error: 'Sizda ushbu sahifaga kirish huquqi yo\'q' });
      }
      await pool.query('DELETE FROM countries WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      console.error('admin delete country xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // POST /api/admin/faculties
  app.post('/api/admin/faculties', authMiddleware, async (req: Request, res: Response) => {
    try {
      const admin = (req as any).user;
      if (admin.role !== 'admin') {
        return res.status(403).json({ error: 'Sizda ushbu sahifaga kirish huquqi yo\'q' });
      }
      const { universityId, name, description } = req.body;
      if (!universityId || !name) {
        return res.status(400).json({ error: 'Universitet va fakultet nomi kiritilishi shart' });
      }
      const id = 'faculty_' + Date.now();
      const nameRu = await translateToRussian(String(name).trim());
      const descriptionRu = description ? await translateToRussian(String(description)) : null;
      const { rows } = await pool.query(
        `INSERT INTO faculties (id, university_id, name, name_ru, description, description_ru)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, university_id AS "universityId", name, name_ru AS "nameRu", description, description_ru AS "descriptionRu"`,
        [id, universityId, name.trim(), nameRu, description || null, descriptionRu]
      );
      res.json({ success: true, faculty: rows[0] });
    } catch (err) {
      console.error('admin add faculty xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // PATCH /api/admin/faculties/:id — fakultet ma'lumotini tahrirlash va
  // nomi/tavsifi o'zgarganda ruscha versiyasini avtomatik qayta tarjima qilish.
  app.patch('/api/admin/faculties/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
      const admin = (req as any).user;
      if (admin.role !== 'admin') {
        return res.status(403).json({ error: 'Sizda ushbu sahifaga kirish huquqi yo\'q' });
      }
      const { name, description, nameRu: nameRuInput, descriptionRu: descriptionRuInput } = req.body;
      const id = req.params.id;

      let nameRu: string | null | undefined = nameRuInput;
      if (name && !nameRuInput) {
        nameRu = await translateToRussian(String(name).trim());
      }
      let descriptionRu: string | null | undefined = descriptionRuInput;
      if (description && !descriptionRuInput) {
        descriptionRu = await translateToRussian(String(description).trim());
      }

      const { rows } = await pool.query(
        `UPDATE faculties SET
           name = COALESCE($1, name),
           name_ru = COALESCE($2, name_ru),
           description = COALESCE($3, description),
           description_ru = COALESCE($4, description_ru)
         WHERE id = $5
         RETURNING id, university_id AS "universityId", name, name_ru AS "nameRu", description, description_ru AS "descriptionRu"`,
        [name?.trim() || null, nameRu || null, description?.trim() || null, descriptionRu || null, id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Fakultet topilmadi' });
      }
      res.json({ success: true, faculty: rows[0] });
    } catch (err) {
      console.error('admin patch faculty xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // GET /api/admin/faculties
  app.get('/api/admin/faculties', authMiddleware, async (req: Request, res: Response) => {
    try {
      const admin = (req as any).user;
      if (admin.role !== 'admin') {
        return res.status(403).json({ error: 'Sizda ushbu sahifaga kirish huquqi yo\'q' });
      }
      const { universityId } = req.query;
      const query = universityId ?
        'SELECT id, university_id AS "universityId", name, name_ru AS "nameRu", description, description_ru AS "descriptionRu" FROM faculties WHERE university_id = $1 ORDER BY created_at DESC' :
        'SELECT id, university_id AS "universityId", name, name_ru AS "nameRu", description, description_ru AS "descriptionRu" FROM faculties ORDER BY created_at DESC';
      const params = universityId ? [universityId] : [];
      const { rows } = await pool.query(query, params);
      res.json(rows);
    } catch (err) {
      console.error('admin faculties xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // POST /api/admin/promotions
  app.post('/api/admin/promotions', authMiddleware, async (req: Request, res: Response) => {
    try {
      const admin = (req as any).user;
      if (admin.role !== 'admin') {
        return res.status(403).json({ error: 'Sizda ushbu sahifaga kirish huquqi yo\'q' });
      }
      const { text, endDate } = req.body;
      if (!text || !endDate) {
        return res.status(400).json({ error: 'Aksiya matni va tugash sanasi kerak' });
      }
      const id = 'promo_' + Date.now();
      const textRu = await translateToRussian(String(text).trim());
      const { rows } = await pool.query(
        `INSERT INTO promotions (id, text, text_ru, end_date, active) VALUES ($1,$2,$3,$4,true) RETURNING id, text, text_ru AS "textRu", end_date AS "endDate", active`,
        [id, text.trim(), textRu, new Date(endDate)]
      );
      res.json({ success: true, promotion: rows[0] });
    } catch (err) {
      console.error('admin add promotion xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // GET /api/admin/promotions
  app.get('/api/admin/promotions', authMiddleware, async (req: Request, res: Response) => {
    try {
      const admin = (req as any).user;
      if (admin.role !== 'admin') {
        return res.status(403).json({ error: 'Sizda ushbu sahifaga kirish huquqi yo\'q' });
      }
      const { rows } = await pool.query('SELECT id, text, text_ru AS "textRu", end_date AS "endDate", active FROM promotions ORDER BY created_at DESC');
      res.json(rows);
    } catch (err) {
      console.error('admin promotions xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // PATCH /api/admin/promotions/:id — aksiya matnini/holatini tahrirlash va
  // matni o'zgarganda ruscha versiyasini avtomatik qayta tarjima qilish.
  app.patch('/api/admin/promotions/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
      const admin = (req as any).user;
      if (admin.role !== 'admin') {
        return res.status(403).json({ error: 'Sizda ushbu sahifaga kirish huquqi yo\'q' });
      }
      const { text, textRu: textRuInput, endDate, active } = req.body;
      const id = req.params.id;

      let textRu: string | null | undefined = textRuInput;
      if (text && !textRuInput) {
        textRu = await translateToRussian(String(text).trim());
      }

      const { rows } = await pool.query(
        `UPDATE promotions SET
           text = COALESCE($1, text),
           text_ru = COALESCE($2, text_ru),
           end_date = COALESCE($3, end_date),
           active = COALESCE($4, active)
         WHERE id = $5
         RETURNING id, text, text_ru AS "textRu", end_date AS "endDate", active`,
        [text?.trim() || null, textRu || null, endDate ? new Date(endDate) : null, active !== undefined ? Boolean(active) : null, id]
      );

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Aksiya topilmadi' });
      }
      res.json({ success: true, promotion: rows[0] });
    } catch (err) {
      console.error('admin patch promotion xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // DELETE /api/admin/promotions/:id
  app.delete('/api/admin/promotions/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
      const admin = (req as any).user;
      if (admin.role !== 'admin') {
        return res.status(403).json({ error: 'Sizda ushbu sahifaga kirish huquqi yo\'q' });
      }
      await pool.query('DELETE FROM promotions WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      console.error('admin delete promotion xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // DELETE /api/admin/faculties/:id
  app.delete('/api/admin/faculties/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
      const admin = (req as any).user;
      if (admin.role !== 'admin') {
        return res.status(403).json({ error: 'Sizda ushbu sahifaga kirish huquqi yo\'q' });
      }
      await pool.query('DELETE FROM faculties WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      console.error('admin delete faculty xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // GET /api/promotions
  app.get('/api/promotions', async (req: Request, res: Response) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, text, text_ru AS "textRu", end_date AS "endDate", active FROM promotions
         WHERE active = true AND end_date > now() ORDER BY end_date ASC`
      );
      res.json(rows);
    } catch (err) {
      console.error('promotions xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // GET /api/consultants
  app.get('/api/consultants', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      if (user.role !== 'admin' && user.role !== 'consultant') {
        return res.status(403).json({ error: 'Ruxsat yo\'q' });
      }
      const consultants = await consultantService.getAllConsultants();
      res.json(consultants);
    } catch (err) {
      console.error('consultants xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // GET /api/admin/consultants
  app.get('/api/admin/consultants', authMiddleware, async (req: Request, res: Response) => {
    try {
      if (!ensureAdmin(req, res)) return;
      const consultants = await consultantService.getAllConsultants();
      res.json(consultants);
    } catch (err) {
      console.error('admin consultants xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // POST /api/admin/consultants
  app.post('/api/admin/consultants', authMiddleware, async (req: Request, res: Response) => {
    try {
      if (!ensureAdmin(req, res)) return;
      const { id, name, username } = req.body;
      if (!id || !name) {
        return res.status(400).json({ error: 'Consultant ID va nomi kiritilishi shart' });
      }
      const numericId = Number(id);
      if (!Number.isInteger(numericId) || numericId <= 0) {
        return res.status(400).json({ error: 'Consultant ID musbat butun son bo\'lishi kerak' });
      }
      const cleanName = String(name).trim();
      const telegramUsername = username ? String(username).trim() : null;
      const phone = req.body.phone ? String(req.body.phone).trim() : null;
      const email = req.body.email ? String(req.body.email).trim() : null;

      const added = await consultantService.addConsultant(numericId, cleanName, telegramUsername, phone, email);
      if (!added) {
        return res.status(409).json({ error: 'Consultant allaqachon mavjud yoki username ishlatilgan' });
      }

      const chatIdStr = String(numericId);
      const { rows: existingLogin } = await pool.query(
        'SELECT username, password FROM users WHERE telegram_chat_id = $1',
        [chatIdStr]
      );

      let loginUsername: string;
      let loginPassword: string;

      if (existingLogin.length > 0) {
        loginUsername = existingLogin[0].username;
        loginPassword = existingLogin[0].password;
        await pool.query(`UPDATE users SET role = 'consultant' WHERE username = $1`, [loginUsername]);
      } else {
        const nameParts = cleanName.split(/\s+/);
        const firstName = nameParts[0] || cleanName;
        const lastName = nameParts.slice(1).join(' ') || firstName;

        let baseUsername = cleanName.toLowerCase().replace(/[^a-z0-9_]/g, '');
        if (!baseUsername) baseUsername = 'consultant';
        loginUsername = baseUsername;
        let counter = 1;
        while (await userExists(loginUsername)) {
          loginUsername = `${baseUsername}${counter}`;
          counter++;
        }

        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        loginPassword = '';
        for (let i = 0; i < 8; i++) {
          loginPassword += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        await pool.query(
          `INSERT INTO users (username, password, first_name, last_name, onboarding_completed, role, telegram_chat_id)
           VALUES ($1,$2,$3,$4,true,'consultant',$5)`,
          [loginUsername, loginPassword, firstName, lastName, chatIdStr]
        );
      }

      sendTelegramMessage(
        numericId,
        `✅ <b>Siz consultant sifatida tizimga qo'shildingiz!</b>\n\n` +
        `Kirish ma'lumotlaringiz:\n` +
        `👤 Username: <code>${loginUsername}</code>\n` +
        `🔑 Parol: <code>${loginPassword}</code>\n\n` +
        `Ushbu ma'lumotlarni saqlab qo'ying va saytga shu username/parol bilan kiring.`
      ).catch((e) => console.error('Consultant Telegram xabar xatolik:', e));

      res.json({ success: true, username: loginUsername });
    } catch (err) {
      console.error('admin add consultant xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // DELETE /api/admin/consultants/:id
  app.delete('/api/admin/consultants/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
      if (!ensureAdmin(req, res)) return;
      const consultantId = Number(req.params.id);
      if (!Number.isInteger(consultantId)) {
        return res.status(400).json({ error: 'Consultant identifikatori noto\'g\'ri' });
      }
      const deleted = await consultantService.deleteConsultant(consultantId);
      if (!deleted) {
        return res.status(404).json({ error: 'Consultant topilmadi' });
      }
      await pool.query(
        `UPDATE users SET role = 'student' WHERE telegram_chat_id = $1 AND role = 'consultant'`,
        [String(consultantId)]
      );
      res.json({ success: true });
    } catch (err) {
      console.error('admin delete consultant xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // GET /api/admin/consultants/:id/clients
  app.get('/api/admin/consultants/:id/clients', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const consultantId = Number(req.params.id);
      if (!Number.isInteger(consultantId)) {
        return res.status(400).json({ error: 'Consultant identifikatori noto\'g\'ri' });
      }

      const isAdmin = user?.role === 'admin';
      const isOwner = user?.role === 'consultant' && Number(user.telegram_chat_id) === consultantId;
      if (!isAdmin && !isOwner) {
        return res.status(403).json({ error: 'Ruxsat yo\'q' });
      }

      const clients = await consultantService.getConsultantClients(consultantId);
      res.json(clients);
    } catch (err) {
      console.error('admin consultant clients xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // POST /api/admin/clients
  app.post('/api/admin/clients', authMiddleware, upload.single('receipt'), async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { consultantId, name, phone, country, paymentType, amount } = req.body;
      if (!consultantId || !name || !phone || !country || !paymentType || amount === undefined) {
        return res.status(400).json({ error: 'Consultant, mijoz, telefon, davlat, to\'lov turi va summa talab qilinadi' });
      }
      const numericConsultantId = Number(consultantId);

      const isOwner = user.role === 'consultant' && Number(user.telegram_chat_id) === numericConsultantId;
      if (user.role !== 'admin' && !isOwner) {
        return res.status(403).json({ error: 'Sizda ushbu amalni bajarish huquqi yo\'q' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'To\'lov chekining rasmi yuklanishi shart' });
      }

      const numericAmount = Number(amount);
      if (Number.isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ error: 'Summa musbat son bo\'lishi kerak' });
      }

      const client = await consultantService.addClient(
        numericConsultantId, String(name), String(phone), String(country), String(paymentType), numericAmount,
        `client_receipt_${Date.now()}`, req.file.buffer, req.file.mimetype
      );
      if (!client) {
        return res.status(404).json({ error: 'Consultant topilmadi yoki mijoz qo\'shib bo\'lmadi' });
      }

      res.json({ success: true, client });
    } catch (err) {
      console.error('admin add client xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // GET /api/clients/receipt/:id
  app.get('/api/clients/receipt/:id', async (req: Request, res: Response) => {
    try {
      const headerToken = req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : null;
      const queryToken = typeof req.query.auth === 'string' ? req.query.auth : null;
      const token = headerToken || queryToken;
      if (!token) {
        return res.status(401).json({ error: 'Avtorizatsiyadan o\'tilmagan' });
      }

      let user = null;
      let signedAccess = null;
      if (token) {
        signedAccess = await validateSignedFileToken(token);
      }
      if (signedAccess) {
        user = await getUserByUsername(signedAccess.username);
      } else {
        user = await validateSessionToken(token);
      }
      if (!user) {
        return res.status(401).json({ error: 'Noto\'g\'ri seans' });
      }

      const clientId = Number(req.params.id);
      if (!Number.isInteger(clientId)) {
        return res.status(400).json({ error: 'Klient identifikatori noto\'g\'ri' });
      }
      const receipt = await consultantService.getClientReceipt(clientId);
      if (!receipt || !receipt.fileData) {
        return res.status(404).json({ error: 'Chek rasmi topilmadi' });
      }
      const isOwner = user.role === 'consultant' && Number(user.telegram_chat_id) === receipt.consultantId;
      if (user.role !== 'admin' && !isOwner) {
        return res.status(403).json({ error: 'Ushbu faylni ko\'rishga ruxsatingiz yo\'q' });
      }
      res.setHeader('Content-Type', receipt.mimeType || 'application/octet-stream');
      res.send(receipt.fileData);
    } catch (err) {
      console.error('client receipt xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // GET /api/consultants/{id}/stats
  app.get('/api/consultants/:id/stats', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const consultantId = Number(req.params.id);
      if (!Number.isInteger(consultantId)) {
        return res.status(400).json({ error: 'Consultant identifikatori noto\'g\'ri' });
      }
      const isOwner = user.role === 'consultant' && Number(user.telegram_chat_id) === consultantId;
      if (user.role !== 'admin' && !isOwner) {
        return res.status(403).json({ error: 'Ruxsat yo\'q' });
      }
      const stats = await consultantService.getConsultantStats(consultantId);
      res.json(stats);
    } catch (err) {
      console.error('consultant stats xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // GET /api/admin/clients
  app.get('/api/admin/clients', authMiddleware, async (req: Request, res: Response) => {
    try {
      if (!ensureAdmin(req, res)) return;
      const clients = await consultantService.getAllClientsWithConsultantName();
      res.json(clients);
    } catch (err) {
      console.error('admin clients ro\'yxati xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // GET /api/admin/consultants/reports
  app.get('/api/admin/consultants/reports', authMiddleware, async (req: Request, res: Response) => {
    try {
      if (!ensureAdmin(req, res)) return;
      const reports = await consultantService.getAdminReports();
      const ranking = await consultantService.getMonthlyRanking();
      const details = await consultantService.getConsultantDetailsForAdmin();
      res.json({ reports, ranking, details });
    } catch (err) {
      console.error('admin consultant reports xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // POST /api/admin/consultants/broadcast
  app.post('/api/admin/consultants/broadcast', authMiddleware, async (req: Request, res: Response) => {
    try {
      if (!ensureAdmin(req, res)) return;
      const { message } = req.body;
      if (!message || !String(message).trim()) {
        return res.status(400).json({ error: 'Xabar matni kiritilishi shart' });
      }
      const chatIds = await consultantService.getAllConsultantChatIds();
      if (chatIds.length === 0) {
        return res.status(404).json({ error: 'Hozircha consultantlar mavjud emas' });
      }
      const result = await broadcastToChatIds(chatIds, String(message).trim());
      await consultantService.addLog(`Broadcast yuborildi: ${result.sent} ta yetkazildi, ${result.failed} ta xato`, null, null, 'info');
      res.json({ success: true, ...result });
    } catch (err) {
      console.error('admin broadcast xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // PATCH /api/admin/universities/:id
  app.patch('/api/admin/universities/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
      const admin = (req as any).user;
      if (admin.role !== 'admin') {
        return res.status(403).json({ error: 'Sizda ushbu sahifaga kirish huquqi yo\'q' });
      }
      const { name, country, logo, budget, ielts, gpa, grantInfo, programs, description, latitude, longitude, qsRanking, nameRu: nameRuInput, grantInfoRu: grantInfoRuInput, programsRu: programsRuInput, descriptionRu: descriptionRuInput } = req.body;
      const id = req.params.id;
      const programsArray = Array.isArray(programs) ? programs : (programs ? [programs] : []);

      // Tahrirlashda ham nomi/tavsifi/dastur/grant matni o'zgarsa, ruscha
      // versiyasi avtomatik qayta tarjima qilinadi — shunday qilib uz va ru
      // versiyalari doim sinxron qoladi (avval faqat yaratishda ishlar edi).
      let nameRu: string | null | undefined = nameRuInput;
      if (name && !nameRuInput) {
        nameRu = await translateToRussian(String(name).trim());
      }
      let grantInfoRu: string | null | undefined = grantInfoRuInput;
      if (grantInfo && !grantInfoRuInput) {
        grantInfoRu = await translateToRussian(String(grantInfo).trim());
      }
      let programsRu: string[] | null | undefined = programsRuInput;
      if (programsArray.length > 0 && !programsRuInput) {
        programsRu = await translateArrayToRussian(programsArray);
      }
      let descriptionRu: string | null | undefined = descriptionRuInput;
      if (description && !descriptionRuInput) {
        descriptionRu = await translateToRussian(String(description).trim());
      }

      await pool.query(
        `UPDATE universities SET
           name = COALESCE($1, name),
           name_ru = COALESCE($2, name_ru),
           country = COALESCE($3, country),
           logo = COALESCE($4, logo),
           budget = COALESCE($5, budget),
           ielts = COALESCE($6, ielts),
           gpa = COALESCE($7, gpa),
           grant_info = COALESCE($8, grant_info),
           grant_info_ru = COALESCE($9, grant_info_ru),
           programs = CASE WHEN $10::text[] IS NULL THEN programs ELSE $10 END,
           programs_ru = CASE WHEN $11::text[] IS NULL THEN programs_ru ELSE $11 END,
           description = COALESCE($12, description),
           description_ru = COALESCE($13, description_ru),
           latitude = COALESCE($14, latitude),
           longitude = COALESCE($15, longitude),
           qs_ranking = COALESCE($16, qs_ranking)
         WHERE id = $17`,
        [
          name?.trim() || null,
          nameRu || null,
          country?.trim() || null,
          logo || null,
          budget !== undefined ? Number(budget) : null,
          ielts !== undefined ? Number(ielts) : null,
          gpa !== undefined ? Number(gpa) : null,
          grantInfo || null,
          grantInfoRu || null,
          programsArray.length > 0 ? programsArray : null,
          programsRu && programsRu.length > 0 ? programsRu : null,
          description || null,
          descriptionRu || null,
          latitude !== undefined ? Number(latitude) : null,
          longitude !== undefined ? Number(longitude) : null,
          qsRanking !== undefined ? Number(qsRanking) : null,
          id
        ]
      );
      const { rows } = await pool.query('SELECT * FROM universities WHERE id = $1', [id]);
      res.json({ success: true, university: mapUniversityRow(rows[0]) });
    } catch (err) {
      console.error('admin patch university xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // DELETE /api/admin/universities/:id
  app.delete('/api/admin/universities/:id', authMiddleware, async (req: Request, res: Response) => {
    try {
      const admin = (req as any).user;
      if (admin.role !== 'admin') {
        return res.status(403).json({ error: 'Sizda ushbu sahifaga kirish huquqi yo\'q' });
      }
      await pool.query('DELETE FROM universities WHERE id = $1', [req.params.id]);
      (globalThis as any).__universitiesCache = await getAllUniversities();
      res.json({ success: true });
    } catch (err) {
      console.error('admin delete university xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // POST /ai/chat
  app.post('/api/ai/chat', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { message } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'Xabar matni bo\'sh bo\'lishi mumkin emas' });
      }

      const { rows: historyRows } = await pool.query(
        `SELECT role, message FROM chat_messages WHERE username = $1 ORDER BY created_at ASC`,
        [user.username]
      );

      await pool.query(
        `INSERT INTO chat_messages (username, role, message) VALUES ($1, 'user', $2)`,
        [user.username, message]
      );

      const userBudget = user.budget ? `$${Number(user.budget).toLocaleString()}` : 'No budget configured';
      const userIelts = user.has_ielts ? `IELTS Score: ${user.ielts_score}` : 'No IELTS certificate';
      const userGpa = user.has_gpa ? `GPA: ${user.gpa}` : 'No GPA configured';

      const apps = await getApplicationsForUser(user.username);
      const appSummary = apps.map(a => `${a.universityName} (${a.program}) - Status: ${a.status}`).join(', ') || 'No active applications yet.';

      const { rows: docs } = await pool.query(
        `SELECT name, type, status FROM documents WHERE username = $1`,
        [user.username]
      );
      const docsSummary = docs.map(d => `${d.type}: ${d.name} (${d.status})`).join(', ') || 'No documents uploaded yet.';

      const universities = await getAllUniversities();

      const contextPrompt = `
        Siz EduVisa kompaniyasining premium AI Konsultantisiz.
        Foydalanuvchi haqida quyidagi ma'lumotlar bor:
        - Ism: ${user.firstName} ${user.lastName}
        - Byudjet: ${userBudget}
        - IELTS: ${userIelts}
        - GPA: ${userGpa}
        - Arizalar holati: ${appSummary}
        - Hujjatlar holati: ${docsSummary}

        Universitetlar ro'yxati (siz tavsiya qilishingiz mumkin bo'lgan real universitetlar):
        ${JSON.stringify(universities)}

        Qoidalar:
        1. Siz foydalanuvchiga faqat uning profili (byudjet, IELTS, GPA), arizalari va hujjatlariga asoslangan professional va aniq javoblar berishingiz kerak.
        2. Hech qachon "100% qabul qilinasiz" yoki mutlaq kafolatlar bermang. Buning o'rniga "Hozirgi ma'lumotlaringiz asosida tayyorgarligingiz yaxshi ko'rinmoqda" deb ehtiyotkorona va professional javob bering.
        3. Savolga javob berganda ehtiyotkor til ishlating. Agar savol murakkab yoki noaniq bo'lsa, "Bu savol bo'yicha EduVisa konsultanti bilan bog'lanishni tavsiya qilaman" deb maslahat bering va foydalanuvchini pastdagi telegram tugmasi orqali bog'lanishga undang.
        4. Har doim o'zbek tilida javob bering. Javobingiz premium, aniq va do'stona bo'lsin. Shuningdek, foydalanuvchining keyingi harakatiga turtki beradigan amaliy "Keyingi qadam" (Next steps) taklif qiling.
        5. Chat tarixiga qarang. Sizning javobingiz qisqa, tushunarli va 2-3 ta gapdan iborat bo'lsin.
      `;

      let aiReply = '';

      if (ai) {
        try {
          const formattedHistory: { role: 'user' | 'assistant'; content: string }[] = historyRows.map(h => ({
            role: h.role === 'user' ? 'user' : 'assistant',
            content: h.message,
          }));

          const completion = await ai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: contextPrompt },
              ...formattedHistory,
              { role: 'user', content: message },
            ],
          });

          aiReply = completion.choices[0]?.message?.content || 'Kechirasiz, javob tayyorlashda xatolik yuz berdi. Iltimos qayta urinib ko\'ring.';
        } catch (err: any) {
          console.error('OpenAI API call error (Chat Completions API):', err);
          aiReply = getSimulatedResponse(message, user, apps, docs);
        }
      } else {
        await new Promise(r => setTimeout(r, 1000));
        aiReply = getSimulatedResponse(message, user, apps, docs);
      }

      await pool.query(
        `INSERT INTO chat_messages (username, role, message) VALUES ($1, 'model', $2)`,
        [user.username, aiReply]
      );

      res.json({ success: true, reply: aiReply });
    } catch (err) {
      console.error('ai chat xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi (AI chat)' });
    }
  });

  // Simulated AI responses based on common keywords
  function getSimulatedResponse(message: string, user: any, apps: any[], docs: any[]) {
    const msg = message.toLowerCase();

    if (msg.includes('mos') || msg.includes('universitet') || msg.includes('tavsiya') || msg.includes('grant')) {
      const budgetLimit = user.budget || 20000;
      const cache = (globalThis as any).__universitiesCache || [];
      const matching = cache.filter((u: any) => u.budget <= budgetLimit && (user.ielts_score === null || u.ielts <= (user.ielts_score || 0)));
      if (matching.length > 0) {
        const uniNames = matching.slice(0, 3).map((u: any) => u.name).join(', ');
        return `Sizning IELTS (${user.ielts_score || 'Yo\'q'}) va byudjetingiz (${user.budget ? '$' + user.budget : 'Hali belgilanmagan'}) bo'yicha eng mos variantlar: ${uniNames}. Hozirgi ma'lumotlaringiz asosida ushbu universitetlarga tayyorgarligingiz yaxshi ko'rinmoqda. Arizalarni boshlaymizmi?`;
      }
      return `Sizga Germaniyaning Technical University Munich ($1,500/y, kontrakt pulsiz) va Janubiy Koreyaning Hanyang University ($7,000/y) kabi nufuzli universitetlarni o'rganishni taklif qilaman. Sizning ko'rsatkichlaringiz juda yaxshi.`;
    }

    if (msg.includes('hujjat') || msg.includes('pasport') || msg.includes('diplom') || msg.includes('sertifikat')) {
      if (docs.length === 0) {
        return `Hali hech qanday hujjat yuklamagansiz. Arizangizni ko'rib chiqishimiz uchun "Hujjatlarim" bo'limida Pasport va IELTS sertifikatingizni yuklashingizni maslahat beraman. Bu borada savol tug'ilsa, professional konsultantimiz bilan bog'laning.`;
      }
      return `Hozirda tizimda ${docs.length} ta hujjatingiz mavjud. Ularning hammasi tasdiqlangan holatda turibdi. Agar pasportingiz yoki IELTS sertifikatingiz muddati tugayotgan bo'lsa, qayta yuklashingiz kerak bo'ladi.`;
    }

    if (msg.includes('ariza') || msg.includes('status') || msg.includes('bosqich')) {
      if (apps.length === 0) {
        return `Sizda hali faol arizalar mavjud emas. "Universitetlar" bo'limiga kirib o'zingizga ma'qul oliygohni tanlang va arizangizni boshlang!`;
      }
      const pendingApp = apps.find((a: any) => a.status.includes('🟡'));
      if (pendingApp) {
        return `Sizning ${pendingApp.universityName} (${pendingApp.program}) universitetiga topshirgan arizangiz hozirda ko'rib chiqilmoqda. Status o'zgarishi bilan sizga bildirishnoma yuboriladi.`;
      }
      return `Sizning barcha arizalaringiz statusi muvaffaqiyatli yakunlangan. Oxirgi yangiliklar uchun profilingizni va bildirishnomalarni kuzatib boring.`;
    }

    return `Salom ${user.firstName}! Men sizning shaxsiy EduVisa AI konsultantingizman. Sizga universitetlarni tanlash, grantlar topish, arizalaringiz statusini tekshirish yoki hujjatlarni to'g'ri topshirishda yordam berishim mumkin. Qanday savolingiz bor?`;
  }

  // GET /ai/chat/history
  app.get('/api/ai/chat/history', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { rows } = await pool.query(
        `SELECT role, message, created_at AS timestamp FROM chat_messages WHERE username = $1 ORDER BY created_at ASC`,
        [user.username]
      );
      res.json(rows);
    } catch (err) {
      console.error('chat history xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // POST /notifications/register-token
  app.post('/api/notifications/register-token', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { token } = req.body;
      if (token) {
        await pool.query('UPDATE users SET notification_token = $1 WHERE username = $2', [String(token), user.username]);
      }
      res.json({ success: true, message: 'Notification token successfully registered' });
    } catch (err) {
      console.error('notification token xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // Clear chat history
  app.post('/api/ai/chat/clear', authMiddleware, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      await pool.query('DELETE FROM chat_messages WHERE username = $1', [user.username]);
      res.json({ success: true });
    } catch (err) {
      console.error('clear chat xatolik:', err);
      res.status(500).json({ error: 'Server xatoligi' });
    }
  });

  // Kichik keshni yangilab turamiz
  (globalThis as any).__universitiesCache = [];
  try {
    (globalThis as any).__universitiesCache = await getAllUniversities();
  } catch (err) {
    console.error('[STARTUP OGOHLANTIRISH] Universitetlar keshini yuklab bo\'lmadi (baza hali tayyor emasmi?):', err);
  }

  // Frontend'da (App.tsx) mavjud bo'lgan haqiqiy sahifalar (tab'lar) ro'yxati.
  // Bu ro'yxat client tomondagi TAB_PATHS bilan bir xil bo'lishi shart. Shu
  // ro'yxatda bo'lmagan har qanday manzil uchun server 404 qaytaradi - ya'ni
  // ixtiyoriy/tasodifiy URL berilganda bosh sahifaga emas, 404 xatoligiga
  // yuboriladi.
  const KNOWN_CLIENT_ROUTES = new Set<string>([
    '/',
    '/universities',
    '/ai-consultant',
    '/applications',
    '/profile',
  ]);
  const isKnownClientRoute = (pathname: string): boolean => KNOWN_CLIENT_ROUTES.has(pathname);

  const send404 = (res: Response) => {
    res
      .status(404)
      .set('Content-Type', 'text/html; charset=utf-8')
      .send(`<!doctype html>
<html lang="uz">
  <head>
    <meta charset="UTF-8" />
    <title>404 - Sahifa topilmadi</title>
    <style>
      body { font-family: -apple-system, sans-serif; background:#0b1220; color:#e6e8eb; display:flex; align-items:center; justify-content:center; height:100vh; margin:0; text-align:center; }
      h1 { font-size: 4rem; margin:0; color:#D6B174; }
      p { color:#9aa4b2; }
      a { color:#D6B174; }
    </style>
  </head>
  <body>
    <div>
      <h1>404</h1>
      <p>Kechirasiz, siz qidirgan sahifa topilmadi.</p>
      <p><a href="/">Bosh sahifaga qaytish</a></p>
    </div>
  </body>
</html>`);
  };

  // Serve static files and handle routing in production, serve Vite dev server in development.
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'custom',
      });
      app.use(vite.middlewares);
      app.get('*', async (req: Request, res: Response, next: NextFunction) => {
        if (req.path.startsWith('/api/')) return next();
        if (!isKnownClientRoute(req.path)) {
          return send404(res);
        }
        try {
          const template = fs.readFileSync(path.resolve('index.html'), 'utf-8');
          const html = await vite.transformIndexHtml(req.originalUrl, template);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
        } catch (err) {
          vite.ssrFixStacktrace(err as Error);
          next(err);
        }
      });
      console.log('Vite middleware integrated (development mode).');
    } catch (err) {
      console.error('[STARTUP XATOLIK] Vite dev server ishga tushmadi:', err);
    }
  } else {
    // Log asset requests to aid debugging in production
    app.use('/assets', (req, _res, next) => {
      try{
        console.log(`[ASSET] ${req.method} ${req.originalUrl} ip=${req.headers['x-forwarded-for']||req.ip}`);
      }catch(e){/* ignore logging errors */}
      next();
    });
    app.use(express.static(path.resolve('dist')));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      // Faqat client tomonda mavjud bo'lgan sahifalar uchun SPA'ni yuboramiz.
      // Boshqa har qanday (tasodifiy/mavjud bo'lmagan) manzil uchun 404.
      if (!isKnownClientRoute(req.path)) {
        return send404(res);
      }
      res.sendFile(path.resolve('dist/index.html'));
    });
  }
}

main().catch(err => {
  // MUHIM (FIX): Bu yerda avval faqat log qilinib, jarayon "osilib" qolardi -
  // app.listen() hech qachon chaqirilmagani uchun Railway health-check doim
  // muvaffaqiyatsiz bo'lib, 502 Bad Gateway qaytardi. Endi fatal xatolik holida
  // process aniq exit code bilan tugaydi - Railway buni "crash" deb ko'radi va
  // qayta ishga tushirishga (restart policy) harakat qiladi, muammoni logda aniq ko'rsatadi.
  console.error('Fatal server startup error:', err);
  process.exit(1);
});