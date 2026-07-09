import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function verifySmtpConnection(): Promise<void> {
  await transporter.verify();
}

export async function sendPasswordResetEmail(toEmail: string, code: string): Promise<void> {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: toEmail,
    subject: 'EduVisa — Parolni tiklash kodi',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color:#0B1C2C;">Parolni tiklash</h2>
        <p>Sizning tasdiqlash kodingiz:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color:#D6B174;">${code}</p>
        <p>Kod 10 daqiqa amal qiladi.</p>
        <p style="color:#888; font-size: 12px;">Agar bu so'rovni siz yubormagan bo'lsangiz, bu xabarni e'tiborsiz qoldiring.</p>
      </div>
    `,
  });
}
