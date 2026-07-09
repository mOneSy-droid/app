import crypto from 'crypto';
import { pool } from './db';
import { hashPassword, generateRandomPassword } from './auth';

// --- TELEGRAM BOT INTEGRATSIYASI ---
// Ushbu modul haqiqiy Telegram Bot API bilan ishlaydi (long polling orqali).
// Kerakli sozlamalar .env faylida:
//   TELEGRAM_BOT_TOKEN=123456:ABC-DEF...   (BotFather'dan olinadi)
//   TELEGRAM_ADMIN_CHAT_ID=123456789        (adminga xabar yuboriladigan chat ID)
//
// Agar TELEGRAM_BOT_TOKEN o'rnatilmagan bo'lsa, bot ishga tushmaydi va
// ilova xatosiz davom etadi (faqat "Sahifaga qaytish" avtomatik kirish yo'li ishlaydi).

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;
const API_BASE = BOT_TOKEN ? `https://api.telegram.org/bot${BOT_TOKEN}` : '';

let pollingOffset = 0;
let isRunning = false;

type PendingBotFlow = {
  kind: 'register' | 'reset';
  step: 'first_name' | 'last_name' | 'phone';
  firstName?: string;
  lastName?: string;
};

const pendingBotFlows = new Map<number, PendingBotFlow>();

function normalizePhone(phone: string): string {
  const trimmed = String(phone || '').trim().replace(/\s+/g, '');
  if (!trimmed) return '';
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (!digitsOnly) return trimmed;
  if (trimmed.startsWith('+')) return trimmed;
  return `+${digitsOnly}`;
}

function buildPhoneShareKeyboard() {
  return {
    keyboard: [[{ text: '📱 Telefon raqamni yuborish', request_contact: true }]],
    resize_keyboard: true,
    one_time_keyboard: true,
  };
}

function buildMainMenuKeyboard() {
  return {
    keyboard: [[{ text: '📝 Ro\'yxatdan o\'tish' }, { text: '🔐 Parolni tiklash' }]],
    resize_keyboard: true,
    one_time_keyboard: true,
  };
}

async function createTelegramUser(chatId: number, firstName: string, lastName: string, phone: string) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    await sendTelegramMessage(chatId, 'Telefon raqam topilmadi. Iltimos, telefon tugmasi orqali qayta yuboring.');
    return;
  }

  const { rows: existingRows } = await pool.query('SELECT username FROM users WHERE phone = $1', [normalizedPhone]);
  if (existingRows[0]) {
    // Bloklangan usermi tekshiramiz
    const { rows: bannedCheck } = await pool.query('SELECT is_banned FROM users WHERE phone = $1', [normalizedPhone]);
    if (bannedCheck[0]?.is_banned) {
      await sendTelegramMessage(chatId, '🚫 Sizning hisobingiz bloklangan. Admin bilan bog\'laning.');
      return;
    }
    await sendTelegramMessage(
      chatId,
      `Bu telefon raqamiga allaqachon akkaunt ochilgan. Parolni tiklash uchun menyudagi "🔐 Parolni tiklash" tugmasini bosing.`
    );
    return;
  }

  const cleanFirstName = firstName.trim();
  const cleanLastName = lastName.trim();
  let baseUsername = `${cleanFirstName}_${cleanLastName}`.toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (!baseUsername) baseUsername = 'user';

  let username = baseUsername;
  let counter = 1;
  while (true) {
    const { rows } = await pool.query('SELECT 1 FROM users WHERE username = $1', [username]);
    if (rows.length === 0) break;
    username = `${baseUsername}${counter}`;
    counter += 1;
  }

  const password = generateRandomPassword(10);
  const hashedPassword = hashPassword(password);
  const clientIp = 'telegram-bot';

  await pool.query(
    `INSERT INTO users (username, password, first_name, last_name, phone, onboarding_completed, last_login_ip, role)
     VALUES ($1, $2, $3, $4, $5, false, $6, 'student')`,
    [username, hashedPassword, cleanFirstName, cleanLastName, normalizedPhone, clientIp]
  );

  await pool.query('UPDATE users SET telegram_chat_id = $1 WHERE username = $2', [String(chatId), username]);

  const loginToken = crypto.randomBytes(24).toString('hex');
  await pool.query('INSERT INTO auto_login_tokens (token, username) VALUES ($1, $2)', [loginToken, username]);

  const appUrl = (process.env.APP_URL || '').replace(/\/$/, '');
  const isLocalUrl = /^(https?:\/\/)?(localhost|127\.0\.0\.1|0\.0\.0\.0)([:/]|$)/i.test(appUrl);
  const autoLoginUrl = (appUrl && !isLocalUrl) ? `${appUrl}/?auto_login=${loginToken}` : null;

  await notifyAdminNewUser({
    username,
    firstName: cleanFirstName,
    lastName: cleanLastName,
    phone: normalizedPhone,
    ip: clientIp,
    source: 'bot',
  }).catch((e) => console.error('Admin notif xatolik:', e));

  await sendTelegramMessage(
    chatId,
    `✅ <b>Ro'yxatdan o'tish yakunlandi!</b>\n\n` +
    `Kirish ma'lumotlaringiz:\n` +
    `👤 Username: <code>${username}</code>\n` +
    `🔑 Parol: <code>${password}</code>\n\n` +
    `Ushbu ma'lumotlarni saqlab qo'ying.` +
    (autoLoginUrl
      ? ` Pastdagi tugma orqali bir bosishda hisobingizga kirishingiz mumkin.`
      : ` Saytga shu username va parol bilan kirishingiz mumkin.`),
    autoLoginUrl ? { inline_keyboard: [[{ text: '🔐 Avtomatik kirish', url: autoLoginUrl }]] } : undefined
  );
}

async function resetTelegramPassword(chatId: number, phone: string) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    await sendTelegramMessage(chatId, 'Telefon raqam topilmadi. Iltimos, telefon tugmasi orqali qayta yuboring.');
    return;
  }

  const { rows } = await pool.query('SELECT username, first_name, last_name, is_banned FROM users WHERE phone = $1', [normalizedPhone]);
  const user = rows[0];
  if (!user) {
    await sendTelegramMessage(chatId, 'Bu telefon raqamiga bog\'langan akkaunt topilmadi. Avval Telegram bot orqali ro\'yxatdan o\'ting.');
    return;
  }

  // Bloklangan usermi tekshiramiz
  if (user.is_banned) {
    await sendTelegramMessage(chatId, '🚫 Sizning hisobingiz bloklangan. Admin bilan bog\'laning.');
    return;
  }

  const newPassword = generateRandomPassword(10);
  const hashedPassword = hashPassword(newPassword);
  await pool.query('UPDATE users SET password = $1 WHERE username = $2', [hashedPassword, user.username]);
  await pool.query('UPDATE users SET telegram_chat_id = $1 WHERE username = $2', [String(chatId), user.username]);

  await sendTelegramMessage(
    chatId,
    `🔐 <b>Parol qayta tiklandi</b>\n\n` +
    `👤 Username: <code>${user.username}</code>\n` +
    `🔑 Yangi parol: <code>${newPassword}</code>\n\n` +
    `Ushbu ma'lumotlarni saqlab qo'ying.`
  );
}

async function startRegisterFlow(chatId: number) {
  pendingBotFlows.set(chatId, { kind: 'register', step: 'first_name' });
  await sendTelegramMessage(chatId, 'Ro\'yxatdan o\'tish uchun avval ismingizni kiriting.', undefined);
}

async function startResetFlow(chatId: number) {
  pendingBotFlows.set(chatId, { kind: 'reset', step: 'phone' });
  await sendTelegramMessage(
    chatId,
    'Parolni tiklash uchun telefon raqamingizni quyidagi tugma orqali yuboring. Faqat telefon raqam qabul qilinadi.',
    buildPhoneShareKeyboard()
  );
}

async function handleBotTextMessage(chatId: number, text: string, fromUsername?: string) {
  const normalizedText = text.trim();
  if (normalizedText === '/start') {
    await sendTelegramMessage(chatId, 'Salom! Telegram bot orqali tezkor ro\'yxatdan o\'tish yoki parolni tiklash mumkin.', buildMainMenuKeyboard());
    pendingBotFlows.delete(chatId);
    return;
  }

  if (normalizedText === '📝 Ro\'yxatdan o\'tish') {
    await startRegisterFlow(chatId);
    return;
  }

  if (normalizedText === '🔐 Parolni tiklash') {
    await startResetFlow(chatId);
    return;
  }

  const pendingFlow = pendingBotFlows.get(chatId);
  if (!pendingFlow) {
    await sendTelegramMessage(chatId, 'Iltimos, menyudan tanlang.', buildMainMenuKeyboard());
    return;
  }

  if (pendingFlow.kind === 'register') {
    if (pendingFlow.step === 'first_name') {
      if (!normalizedText) {
        await sendTelegramMessage(chatId, 'Iltimos, ismingizni yozing.');
        return;
      }
      pendingBotFlows.set(chatId, { ...pendingFlow, firstName: normalizedText, step: 'last_name' });
      await sendTelegramMessage(chatId, 'Familiyangizni kiriting.', undefined);
      return;
    }

    if (pendingFlow.step === 'last_name') {
      if (!normalizedText) {
        await sendTelegramMessage(chatId, 'Iltimos, familiyangizni yozing.');
        return;
      }
      pendingBotFlows.set(chatId, { ...pendingFlow, lastName: normalizedText, step: 'phone' });
      await sendTelegramMessage(
        chatId,
        'Telefon raqamingizni quyidagi tugma orqali yuboring. Faqat telefon raqam qabul qilinadi.',
        buildPhoneShareKeyboard()
      );
      return;
    }
  }

  await sendTelegramMessage(chatId, 'Iltimos, telefon raqamni tugma orqali yuboring.', buildPhoneShareKeyboard());
}

async function handleBotContactMessage(chatId: number, phone: string) {
  const pendingFlow = pendingBotFlows.get(chatId);
  if (!pendingFlow) {
    await sendTelegramMessage(chatId, 'Iltimos, menyudan tanlang.', buildMainMenuKeyboard());
    return;
  }

  if (pendingFlow.kind === 'register' && pendingFlow.step === 'phone' && pendingFlow.firstName && pendingFlow.lastName) {
    pendingBotFlows.delete(chatId);
    await createTelegramUser(chatId, pendingFlow.firstName, pendingFlow.lastName, phone);
    return;
  }

  if (pendingFlow.kind === 'reset' && pendingFlow.step === 'phone') {
    pendingBotFlows.delete(chatId);
    await resetTelegramPassword(chatId, phone);
    return;
  }

  await sendTelegramMessage(chatId, 'Iltimos, menyudan tanlang.', buildMainMenuKeyboard());
}

async function callTelegramApi(method: string, params: Record<string, any>) {
  if (!API_BASE) return null;
  try {
    const res = await fetch(`${API_BASE}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    // MUHIM: Telegram HTTP 200 bilan ham "ok: false" qaytarishi mumkin
    // (masalan noto'g'ri chat_id, bloklangan bot va h.k.). Buni jim yutib
    // yubormaslik uchun bu yerda log qilamiz.
    if (!data || data.ok !== true) {
      console.error(`[TELEGRAM] ${method} muvaffaqiyatsiz:`, data ? data.description : '(javob yo\'q)', JSON.stringify(params));
    }
    return data;
  } catch (err) {
    console.error(`[TELEGRAM] ${method} chaqiruvida xatolik:`, err);
    return null;
  }
}

export async function sendTelegramMessage(chatId: string | number, text: string, replyMarkup?: any) {
  if (!chatId) {
    console.error('[TELEGRAM] sendTelegramMessage: chatId berilmagan, xabar yuborilmadi.');
    return null;
  }
  return await callTelegramApi('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

// Chek rasmini (yoki istalgan buferni) Telegram'ga rasm sifatida yuboradi.
// callTelegramApi() dan farqli — bu yerda multipart/form-data kerak (JSON emas),
// chunki haqiqiy fayl bayt oqimi yuborilyapti.
export async function sendTelegramPhoto(chatId: string | number, photo: Buffer, caption?: string, filename = 'receipt.jpg') {
  if (!API_BASE || !chatId || !photo || photo.length === 0) return null;
  try {
    const form = new FormData();
    form.append('chat_id', String(chatId));
    if (caption) {
      form.append('caption', caption);
      form.append('parse_mode', 'HTML');
    }
    form.append('photo', new Blob([photo]), filename);
    const res = await fetch(`${API_BASE}/sendPhoto`, { method: 'POST', body: form });
    const data = await res.json();
    if (!data || data.ok !== true) {
      console.error('[TELEGRAM] sendPhoto muvaffaqiyatsiz:', data ? data.description : '(javob yo\'q)');
    }
    return data;
  } catch (err) {
    console.error('[TELEGRAM] sendPhoto chaqiruvida xatolik:', err);
    return null;
  }
}

// Barcha consultantlarga bir xil xabarni yuboradi (admin panel "Broadcast" funksiyasi).
// Har birini alohida yuboradi, muvaffaqiyatli/muvaffaqiyatsiz sonini qaytaradi.
export async function broadcastToChatIds(chatIds: number[], text: string): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (const chatId of chatIds) {
    try {
      const result = await callTelegramApi('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML' });
      if (result && result.ok) sent++;
      else failed++;
    } catch {
      failed++;
    }
  }
  return { sent, failed };
}

function isPrivateOrLocalIp(ip: string): boolean {
  if (!ip) return true;
  const normalized = ip.trim().replace(/^::ffff:/, '');
  if (normalized === '127.0.0.1' || normalized === '::1' || normalized === 'localhost') return true;
  if (normalized.startsWith('192.168.') || normalized.startsWith('10.') || normalized.startsWith('172.')) return true;
  if (normalized.startsWith('169.254.')) return true;
  return false;
}

export async function lookupIpLocation(ip: string): Promise<{ city?: string; country?: string; lat?: number; lon?: number; mapsUrl?: string } | null> {
  if (!ip || isPrivateOrLocalIp(ip)) return null;

  const endpoints = [
    `https://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,city,lat,lon`,
    `https://ipapi.co/${encodeURIComponent(ip)}/json/`,
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, { headers: { Accept: 'application/json' } });
      if (!res.ok) continue;
      const data = await res.json();

      if (endpoint.includes('ip-api.com')) {
        if (data?.status !== 'success') continue;
        const lat = Number(data?.lat);
        const lon = Number(data?.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
        return {
          city: data.city,
          country: data.country,
          lat,
          lon,
          mapsUrl: `https://www.google.com/maps?q=${lat},${lon}`,
        };
      }

      if (data?.error) continue;
      const lat = Number(data?.latitude);
      const lon = Number(data?.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      return {
        city: data.city,
        country: data.country_name || data.country,
        lat,
        lon,
        mapsUrl: `https://www.google.com/maps?q=${lat},${lon}`,
      };
    } catch (err) {
      console.error('[GEO] IP joylashuvini aniqlashda xatolik:', err);
    }
  }

  return null;
}

// Adminga yangi ro'yxatdan o'tish haqida xabar yuboradi (IP manzili va joylashuv bilan birga)
export async function notifyAdminNewUser(details: {
  username: string;
  firstName: string;
  lastName: string;
  phone: string;
  ip: string;
  source: 'form' | 'bot';
}) {
  if (!ADMIN_CHAT_ID) return;
  const { username, firstName, lastName, phone, ip, source } = details;
  const sourceLabel = source === 'bot' ? 'Telegram bot orqali' : 'Ro\'yxatdan o\'tish formasi orqali';

  const location = await lookupIpLocation(ip);
  const locationLine = location
    ? `📍 Joylashuv: ${location.city || ''}${location.city && location.country ? ', ' : ''}${location.country || ''} — <a href="${location.mapsUrl}">Google Maps'da ko'rish</a>`
    : '📍 Joylashuv: aniqlab bo\'lmadi (lokal/noma\'lum IP)';

  const text =
    `🆕 <b>Yangi foydalanuvchi ro'yxatdan o'tdi</b>\n\n` +
    `👤 Ism: ${firstName} ${lastName}\n` +
    `🔑 Username: <code>${username}</code>\n` +
    `📱 Telefon: ${phone}\n` +
    `🌐 IP manzil: <code>${ip}</code>\n` +
    `${locationLine}\n` +
    `📥 Manba: ${sourceLabel}`;
  await sendTelegramMessage(ADMIN_CHAT_ID, text);
}

export async function notifyAdminPasswordChanged(details: {
  username: string;
  firstName?: string;
  lastName?: string;
  ip: string;
  source: 'reset' | 'telegram' | 'profile';
}) {
  if (!ADMIN_CHAT_ID) return;
  const { username, firstName, lastName, ip, source } = details;
  const sourceLabel = source === 'telegram'
    ? 'Telegram bot orqali'
    : source === 'profile'
      ? 'Profildan o\'zgartirildi'
      : 'Parol tiklash orqali';

  const location = await lookupIpLocation(ip);
  const locationLine = location
    ? `📍 Joylashuv: ${location.city || ''}${location.city && location.country ? ', ' : ''}${location.country || ''} — <a href="${location.mapsUrl}">Google Maps'da ko'rish</a>`
    : '📍 Joylashuv: aniqlab bo\'lmadi (lokal/noma\'lum IP)';

  const text =
    `🔐 <b>Foydalanuvchi parolini o\'zgartirdi</b>\n\n` +
    `👤 Ism: ${[firstName, lastName].filter(Boolean).join(' ') || 'noma\'lum'}\n` +
    `🔑 Username: <code>${username}</code>\n` +
    `🌐 IP manzil: <code>${ip}</code>\n` +
    `${locationLine}\n` +
    `📥 Manba: ${sourceLabel}`;
  await sendTelegramMessage(ADMIN_CHAT_ID, text);
}

let dailyReportInterval: ReturnType<typeof setInterval> | null = null;
let lastDailyReportDate = '';

// Python spetsifikatsiyasidagi APScheduler (har kuni soat 21:00da) o'rniga soddaroq,
// tashqi kutubxonasiz yechim: har daqiqada soatni tekshiradi, kun ichida faqat bir marta
// (belgilangan soatda) callback'ni chaqiradi. targetHour — server vaqti bo'yicha (odatda UTC).
export function scheduleDailyReport(targetHour: number, callback: () => Promise<void>) {
  if (dailyReportInterval) clearInterval(dailyReportInterval);
  dailyReportInterval = setInterval(async () => {
    const now = new Date();
    const todayKey = now.toISOString().slice(0, 10);
    if (now.getUTCHours() === targetHour && lastDailyReportDate !== todayKey) {
      lastDailyReportDate = todayKey;
      try {
        await callback();
      } catch (err) {
        console.error('[TELEGRAM] Kunlik hisobot yuborishda xatolik:', err);
      }
    }
  }, 60 * 1000);
}

export function stopDailyReportSchedule() {
  if (dailyReportInterval) clearInterval(dailyReportInterval);
  dailyReportInterval = null;
}

async function handleStartCommand(chatId: number, payloadRaw: string, fromUsername?: string) {
  console.log(`[TELEGRAM] /start qabul qilindi. chatId=${chatId}, payload=${payloadRaw}, from=@${fromUsername || 'noma\'lum'}`);
  try {
    if (!payloadRaw) {
      await sendTelegramMessage(chatId, 'Salom! Telegram bot orqali tezkor ro\'yxatdan o\'tish yoki parolni tiklash mumkin.', buildMainMenuKeyboard());
      return;
    }

    // payloadRaw endi qisqa, tasodifiy token (register-init'da yaratilgan).
    // Bazadan shu tokenga mos username'ni topamiz.
    const { rows: tokenRows } = await pool.query(
      'SELECT username, used, plain_password FROM registration_start_tokens WHERE token = $1',
      [payloadRaw]
    );
    const tokenRow = tokenRows[0];

    if (!tokenRow) {
      console.error(`[TELEGRAM] Token bazada topilmadi: "${payloadRaw}"`);
      await sendTelegramMessage(chatId, 'Havola noto\'g\'ri yoki muddati o\'tgan. Iltimos, saytda formani qaytadan to\'ldiring.');
      return;
    }
    if (tokenRow.used) {
      console.error(`[TELEGRAM] Token allaqachon ishlatilgan: "${payloadRaw}" (username=${tokenRow.username})`);
      await sendTelegramMessage(chatId, 'Bu havola allaqachon ishlatilgan. Iltimos, yangi havoladan foydalaning.');
      return;
    }

    const username = tokenRow.username;

    // Foydalanuvchini bazadan (IP bilan birga) olamiz.
    // MUHIM (FIX): users.password ustuni FAQAT xeshlangan (scrypt) qiymatni saqlaydi
    // - u foydalanuvchiga ko'rsatish uchun yaroqsiz. Asl parolni users jadvalidan
    // emas, balki registration_start_tokens.plain_password'dan olamiz (u yerga
    // register-init paytida, hash bo'lishidan oldin yozib qo'yilgan).
    const { rows } = await pool.query(
      'SELECT username, first_name, last_name, phone, last_login_ip FROM users WHERE username = $1',
      [username]
    );
    if (rows.length === 0) {
      console.error(`[TELEGRAM] Token username'ga mos user topilmadi: username=${username}`);
      await sendTelegramMessage(chatId, 'Hisob topilmadi. Iltimos, saytda ro\'yxatdan o\'tish formasini qaytadan to\'ldiring.');
      return;
    }
    const user = rows[0];
    const ip = user.last_login_ip;
    const password = tokenRow.plain_password || '(parolni ko\'rsatib bo\'lmadi — administratorga murojaat qiling)';

    // Tokenni bir martalik qilib belgilaymiz (qayta ishlatilmasin)
    await pool.query('UPDATE registration_start_tokens SET used = true WHERE token = $1', [payloadRaw]);

    // Haqiqiy Telegram chat ID'ni bazaga yozib qo'yamiz (keyingi bildirishnomalar uchun)
    await pool.query('UPDATE users SET telegram_chat_id = $1 WHERE username = $2', [String(chatId), username]);

    // Bir martalik "avtomatik kirish" tokeni — sayt shu token orqali parolsiz login qiladi
    const loginToken = crypto.randomBytes(24).toString('hex');
    await pool.query('INSERT INTO auto_login_tokens (token, username) VALUES ($1, $2)', [loginToken, username]);

    const appUrl = (process.env.APP_URL || '').replace(/\/$/, '');
    // MUHIM (FIX): Telegram tugma URL'i sifatida "localhost", "127.0.0.1" kabi
    // tashqi dunyoga ochiq bo'lmagan manzillarni QABUL QILMAYDI - "Wrong HTTP URL"
    // xatosi bilan butun xabarni rad etadi (username/parol ham yuborilmay qoladi).
    // Shu sabab development muhitida (localhost) tugmani umuman qo'shmaymiz,
    // faqat matn shaklida ma'lumot yuboramiz. Productionda haqiqiy domen (masalan
    // https://eduvisa.uz) bo'lganda tugma normal ishlayveradi.
    const isLocalUrl = /^(https?:\/\/)?(localhost|127\.0\.0\.1|0\.0\.0\.0)([:/]|$)/i.test(appUrl);
    if (!appUrl) {
      console.error('[TELEGRAM] APP_URL o\'rnatilmagan — avtomatik kirish tugmasi ko\'rsatilmaydi.');
    } else if (isLocalUrl) {
      console.warn('[TELEGRAM] APP_URL lokal manzil (' + appUrl + ') — Telegram buni qabul qilmaydi, tugma qo\'shilmaydi.');
    }
    const autoLoginUrl = (appUrl && !isLocalUrl) ? `${appUrl}/?auto_login=${loginToken}` : null;

    const sendResult = await sendTelegramMessage(
      chatId,
      `✅ <b>Ro'yxatdan o'tish yakunlandi!</b>\n\n` +
      `Kirish ma'lumotlaringiz:\n` +
      `👤 Username: <code>${username}</code>\n` +
      `🔑 Parol: <code>${password}</code>\n\n` +
      `Ushbu ma'lumotlarni saqlab qo'ying.` +
      (autoLoginUrl
        ? ` Pastdagi tugma orqali bir bosishda, parolsiz hisobingizga kirishingiz mumkin.`
        : ` Saytga shu username va parol bilan kirishingiz mumkin.`),
      autoLoginUrl ? { inline_keyboard: [[{ text: '🔐 Avtomatik kirish', url: autoLoginUrl }]] } : undefined
    );
    console.log(`[TELEGRAM] Login xabari yuborildi. chatId=${chatId}, username=${username}, natija=`, sendResult);

    // Bot orqali muvaffaqiyatli ulanganini adminga ham xabar beramiz
    if (ADMIN_CHAT_ID) {
      const location = await lookupIpLocation(ip);
      const locationLine = location
        ? `📍 Joylashuv: ${location.city || ''}${location.city && location.country ? ', ' : ''}${location.country || ''} — <a href="${location.mapsUrl}">Google Maps'da ko'rish</a>\n`
        : '';
      await sendTelegramMessage(
        ADMIN_CHAT_ID,
        `🤖 <b>Foydalanuvchi botga ulandi</b>\n\n` +
        `👤 ${user.first_name} ${user.last_name} (<code>${username}</code>)\n` +
        `📱 ${user.phone}\n` +
        `🌐 IP: <code>${ip || 'noma\'lum'}</code>\n` +
        locationLine +
        `💬 Telegram chat ID: <code>${chatId}</code>${fromUsername ? ` (@${fromUsername})` : ''}`
      );
    }
  } catch (err) {
    console.error('[TELEGRAM] /start payload xatolik:', err);
    await sendTelegramMessage(chatId, 'Xatolik yuz berdi. Iltimos, saytdan qaytadan urinib ko\'ring.');
  }
}

async function pollUpdates() {
  if (!API_BASE) return;
  const data = await callTelegramApi('getUpdates', {
    offset: pollingOffset,
    timeout: 25,
    allowed_updates: ['message'],
  });

  if (data && data.ok && Array.isArray(data.result)) {
    for (const update of data.result) {
      pollingOffset = update.update_id + 1;
      const msg = update.message;
      if (!msg) continue;

      if (msg.contact) {
        await handleBotContactMessage(msg.chat.id, msg.contact.phone_number);
        continue;
      }

      const text = msg.text?.trim();
      if (!text) continue;

      if (text.startsWith('/start')) {
        const parts = text.split(' ');
        const payload = parts[1];
        await handleStartCommand(msg.chat.id, payload, msg.from?.username);
      } else {
        await handleBotTextMessage(msg.chat.id, text, msg.from?.username);
      }
    }
  }
  // ESLATMA: agar data.ok === false bo'lsa (masalan webhook conflict — 409),
  // xatolik allaqachon callTelegramApi() ichida log qilinadi, shu yerda
  // qo'shimcha hech narsa qilish shart emas — polling tsikli davom etaveradi.
}

export async function startTelegramBot() {
  if (!BOT_TOKEN) {
    console.log('[TELEGRAM] TELEGRAM_BOT_TOKEN topilmadi — bot ishga tushmadi (simulyatsiyasiz rejim).');
    return;
  }
  if (isRunning) return;
  isRunning = true;

  // MUHIM FIX: Agar botda avval webhook o'rnatilgan bo'lsa (masalan boshqa
  // deploy, test skript yoki BotFather orqali), getUpdates() doim
  // "409 Conflict: can't use getUpdates method while webhook is active"
  // xatosini qaytaradi va eski kodda bu jim yutilardi — natijada /start
  // xabarlari umuman ko'rilmasdi. Shu sabab ishga tushishdan oldin webhookni
  // majburiy o'chiramiz.
  const webhookInfo = await callTelegramApi('getWebhookInfo', {});
  if (webhookInfo && webhookInfo.ok && webhookInfo.result && webhookInfo.result.url) {
    console.warn(`[TELEGRAM] Faol webhook topildi (${webhookInfo.result.url}) — getUpdates bilan mos kelmaydi, o'chirilmoqda...`);
    await callTelegramApi('deleteWebhook', { drop_pending_updates: false });
  }

  console.log('[TELEGRAM] Bot long-polling rejimida ishga tushdi.');

  // Uzluksiz polling tsikli — server ishlagan davomida fon rejimida ishlaydi
  (async function loop() {
    while (isRunning) {
      try {
        await pollUpdates();
      } catch (err) {
        console.error('[TELEGRAM] Polling xatolik:', err);
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  })();
}

export function stopTelegramBot() {
  isRunning = false;
}