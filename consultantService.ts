import { pool } from './db';

export interface Consultant {
  id: number;
  name: string;
  username?: string | null;
  phone?: string | null;
  email?: string | null;
  joinedAt: string;
}

export interface ClientRecord {
  id: number;
  consultantId: number;
  name: string;
  phone: string;
  country: string;
  paymentType: string;
  amount: number;
  receiptPhotoId: string;
  confirmedAt: string;
  status: string;
}

export interface ConsultantStatsPeriod {
  count: number;
  revenue: number;
}

export interface ConsultantStats {
  today: ConsultantStatsPeriod;
  weekly: ConsultantStatsPeriod;
  monthly: ConsultantStatsPeriod;
  total: ConsultantStatsPeriod;
}

export interface AdminReportsPeriod {
  count: number;
  revenue: number;
  active: string;
}

export interface AdminReports {
  today: AdminReportsPeriod;
  weekly: AdminReportsPeriod;
  monthly: AdminReportsPeriod;
}

export interface ConsultantDetailsForAdmin {
  id: number;
  name: string;
  username: string | null;
  today_cnt: number;
  today_rev: number;
  weekly_cnt: number;
  monthly_cnt: number;
  monthly_rev: number;
  total_cnt: number;
}

export async function addLog(action: string, userId?: number | null, userName?: string | null, logType: 'info' | 'success' | 'warning' | 'error' = 'info') {
  await pool.query(
    `INSERT INTO audit_logs (action, user_id, user_name, log_type) VALUES ($1,$2,$3,$4)`,
    [action, userId || null, userName || null, logType]
  );
}

export async function getConsultant(telegramId: number): Promise<Consultant | null> {
  const { rows } = await pool.query(
    `SELECT id, name, username, phone, email, joined_at AS "joinedAt" FROM consultants WHERE id = $1`,
    [telegramId]
  );
  return rows[0] || null;
}

export async function addConsultant(telegramId: number, name: string, username?: string | null, phone?: string | null, email?: string | null): Promise<boolean> {
  const normalizedUsername = username ? username.trim() : null;
  const { rows } = await pool.query(`SELECT 1 FROM consultants WHERE id = $1 OR username = $2`, [telegramId, normalizedUsername]);
  if (rows.length > 0) {
    return false;
  }

  await pool.query(
    `INSERT INTO consultants (id, name, username, phone, email) VALUES ($1,$2,$3,$4,$5)`,
    [telegramId, name.trim(), normalizedUsername, phone?.trim() || null, email?.trim() || null]
  );
  return true;
}

export async function getClientReceipt(clientId: number): Promise<{ consultantId: number; fileData: Buffer | null; mimeType: string | null } | null> {
  const { rows } = await pool.query(
    `SELECT consultant_id AS "consultantId", receipt_file_data AS "fileData", receipt_mime_type AS "mimeType"
     FROM clients WHERE id = $1`,
    [clientId]
  );
  return rows[0] || null;
}

export async function getAllConsultantChatIds(): Promise<number[]> {
  const { rows } = await pool.query(`SELECT id FROM consultants ORDER BY name`);
  return rows.map((r: any) => Number(r.id));
}

export async function deleteConsultant(telegramId: number): Promise<boolean> {
  const { rows } = await pool.query(`SELECT 1 FROM consultants WHERE id = $1`, [telegramId]);
  if (rows.length === 0) {
    return false;
  }
  await pool.query(`DELETE FROM consultants WHERE id = $1`, [telegramId]);
  return true;
}

export async function getAllConsultants(): Promise<Consultant[]> {
  const { rows } = await pool.query(
    `SELECT id, name, username, phone, email, joined_at AS "joinedAt" FROM consultants ORDER BY name`,
    []
  );
  return rows;
}

export async function addClient(
  consultantId: number,
  name: string,
  phone: string,
  country: string,
  paymentType: string,
  amount: number,
  receiptPhotoId: string,
  receiptFileData?: Buffer | null,
  receiptMimeType?: string | null
): Promise<ClientRecord | null> {
  try {
    const { rows: consultantRows } = await pool.query(`SELECT 1 FROM consultants WHERE id = $1`, [consultantId]);
    if (consultantRows.length === 0) {
      return null;
    }

    const { rows } = await pool.query(
      `INSERT INTO clients (consultant_id, name, phone, country, payment_type, amount, receipt_photo_id, receipt_file_data, receipt_mime_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, consultant_id AS "consultantId", name, phone, country, payment_type AS "paymentType",
                 amount, receipt_photo_id AS "receiptPhotoId", confirmed_at AS "confirmedAt", status`,
      [consultantId, name.trim(), phone.trim(), country.trim(), paymentType.trim(), amount, receiptPhotoId, receiptFileData || null, receiptMimeType || null]
    );
    return rows[0];
  } catch (err) {
    console.error('[ConsultantService] addClient error:', err);
    return null;
  }
}

export async function getConsultantClients(consultantId: number): Promise<ClientRecord[]> {
  const { rows } = await pool.query(
    `SELECT id, consultant_id AS "consultantId", name, phone, country, payment_type AS "paymentType",
            amount, receipt_photo_id AS "receiptPhotoId", confirmed_at AS "confirmedAt", status
     FROM clients WHERE consultant_id = $1 ORDER BY confirmed_at DESC`,
    [consultantId]
  );
  return rows;
}

export async function getAllClientsOrdered(): Promise<ClientRecord[]> {
  const { rows } = await pool.query(
    `SELECT id, consultant_id AS "consultantId", name, phone, country, payment_type AS "paymentType",
            amount, receipt_photo_id AS "receiptPhotoId", confirmed_at AS "confirmedAt", status
     FROM clients ORDER BY confirmed_at DESC`
  );
  return rows;
}

// Admin panelida ko'rsatish uchun: har bir klient yoniga uni qo'shgan
// consultantning ismi va username'i ham qo'shib beriladi (LEFT JOIN).
// Consultant qo'shgan har bir yangi konsultatsiya endi Telegram kanal/guruhga
// emas, aynan shu ro'yxat orqali admin panelida ko'rinadi.
export async function getAllClientsWithConsultantName(limit = 200): Promise<Array<ClientRecord & { consultantName: string; consultantUsername: string | null }>> {
  const { rows } = await pool.query(
    `SELECT cl.id, cl.consultant_id AS "consultantId", cl.name, cl.phone, cl.country,
            cl.payment_type AS "paymentType", cl.amount, cl.receipt_photo_id AS "receiptPhotoId",
            cl.confirmed_at AS "confirmedAt", cl.status,
            COALESCE(c.name, 'Noma''lum') AS "consultantName", c.username AS "consultantUsername"
     FROM clients cl
     LEFT JOIN consultants c ON c.id = cl.consultant_id
     ORDER BY cl.confirmed_at DESC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

async function getStatsForPeriod(consultantId: number, periodCondition: string): Promise<ConsultantStatsPeriod> {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count, COALESCE(SUM(amount), 0) AS revenue
     FROM clients
     WHERE consultant_id = $1 AND status = 'confirmed' AND ${periodCondition}`,
    [consultantId]
  );
  return {
    count: rows[0].count,
    revenue: Number(rows[0].revenue || 0)
  };
}

export async function getConsultantStats(consultantId: number): Promise<ConsultantStats> {
  const todayCond = `confirmed_at >= date_trunc('day', now() AT TIME ZONE 'utc')`;
  const weeklyCond = `confirmed_at >= (now() AT TIME ZONE 'utc' - interval '7 days')`;
  const monthlyCond = `confirmed_at >= date_trunc('month', now() AT TIME ZONE 'utc')`;
  const totalCond = `status = 'confirmed'`;

  return {
    today: await getStatsForPeriod(consultantId, todayCond),
    weekly: await getStatsForPeriod(consultantId, weeklyCond),
    monthly: await getStatsForPeriod(consultantId, monthlyCond),
    total: await getStatsForPeriod(consultantId, totalCond),
  };
}

export async function getAdminReports(): Promise<AdminReports> {
  const reportQuery = `
    WITH totals AS (
      SELECT COUNT(*)::int AS count, COALESCE(SUM(amount), 0) AS revenue
      FROM clients cl
      WHERE cl.status = 'confirmed' AND %PERIOD%
    ),
    top_consultant AS (
      SELECT c.name AS active
      FROM clients cl
      JOIN consultants c ON c.id = cl.consultant_id
      WHERE cl.status = 'confirmed' AND %PERIOD%
      GROUP BY c.id, c.name
      ORDER BY COUNT(*) DESC, COALESCE(SUM(cl.amount), 0) DESC
      LIMIT 1
    )
    SELECT COALESCE(t.count, 0) AS count, COALESCE(t.revenue, 0) AS revenue, COALESCE(tc.active, 'Yo''q') AS active
    FROM totals t
    LEFT JOIN top_consultant tc ON true
  `;

  const results: Partial<AdminReports> = {};
  const periods = [
    { key: 'today', condition: `confirmed_at >= date_trunc('day', now() AT TIME ZONE 'utc')` },
    { key: 'weekly', condition: `confirmed_at >= (now() AT TIME ZONE 'utc' - interval '7 days')` },
    { key: 'monthly', condition: `confirmed_at >= date_trunc('month', now() AT TIME ZONE 'utc')` }
  ];

  for (const period of periods) {
    const query = reportQuery.replace('%PERIOD%', period.condition);
    const { rows } = await pool.query(query);
    results[period.key as keyof AdminReports] = {
      count: rows[0]?.count ?? 0,
      revenue: Number(rows[0]?.revenue ?? 0),
      active: rows[0]?.active ?? 'Yo\'q'
    } as AdminReportsPeriod;
  }

  return results as AdminReports;
}

export async function getMonthlyRanking(): Promise<Array<[string, number, number]>> {
  const { rows } = await pool.query(
    `SELECT c.name AS name, COUNT(*)::int AS count, COALESCE(SUM(cl.amount), 0) AS revenue
     FROM clients cl
     JOIN consultants c ON c.id = cl.consultant_id
     WHERE cl.status = 'confirmed'
       AND cl.confirmed_at >= date_trunc('month', now() AT TIME ZONE 'utc')
     GROUP BY c.name
     ORDER BY count DESC, revenue DESC
     LIMIT 3`
  );
  return rows.map((row: any) => [row.name, row.count, Number(row.revenue)]);
}

export async function getConsultantDetailsForAdmin(): Promise<ConsultantDetailsForAdmin[]> {
  const { rows } = await pool.query(
    `SELECT
       c.id,
       c.name,
       c.username,
       COALESCE(SUM(CASE WHEN cl.status = 'confirmed' AND cl.confirmed_at >= date_trunc('day', now() AT TIME ZONE 'utc') THEN 1 ELSE 0 END), 0) AS today_cnt,
       COALESCE(SUM(CASE WHEN cl.status = 'confirmed' AND cl.confirmed_at >= date_trunc('day', now() AT TIME ZONE 'utc') THEN cl.amount ELSE 0 END), 0) AS today_rev,
       COALESCE(SUM(CASE WHEN cl.status = 'confirmed' AND cl.confirmed_at >= (now() AT TIME ZONE 'utc' - interval '7 days') THEN 1 ELSE 0 END), 0) AS weekly_cnt,
       COALESCE(SUM(CASE WHEN cl.status = 'confirmed' AND cl.confirmed_at >= date_trunc('month', now() AT TIME ZONE 'utc') THEN 1 ELSE 0 END), 0) AS monthly_cnt,
       COALESCE(SUM(CASE WHEN cl.status = 'confirmed' AND cl.confirmed_at >= date_trunc('month', now() AT TIME ZONE 'utc') THEN cl.amount ELSE 0 END), 0) AS monthly_rev,
       COALESCE(SUM(CASE WHEN cl.status = 'confirmed' THEN 1 ELSE 0 END), 0) AS total_cnt
     FROM consultants c
     LEFT JOIN clients cl ON cl.consultant_id = c.id
     GROUP BY c.id, c.name, c.username
     ORDER BY c.name`
  );

  return rows.map((row: any) => ({
    id: Number(row.id),
    name: row.name,
    username: row.username ?? null,
    today_cnt: Number(row.today_cnt),
    today_rev: Number(row.today_rev),
    weekly_cnt: Number(row.weekly_cnt),
    monthly_cnt: Number(row.monthly_cnt),
    monthly_rev: Number(row.monthly_rev),
    total_cnt: Number(row.total_cnt)
  }));
}
