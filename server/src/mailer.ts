// RecruitFlow — שליחת מיילים (כרגע רק מייל "שכחתי סיסמה")
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true', // true בד"כ עבור פורט 465, false עבור 587 (STARTTLS)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: 'איפוס סיסמה - RecruitFlow',
    html: `
      <div dir="rtl" style="font-family: sans-serif; font-size: 16px;">
        <p>קיבלנו בקשה לאיפוס הסיסמה שלך ב-RecruitFlow.</p>
        <p><a href="${resetUrl}">לחצי כאן כדי לבחור סיסמה חדשה</a></p>
        <p>הקישור תקף לשעה אחת. אם לא ביקשת לאפס סיסמה, אפשר להתעלם מהמייל הזה.</p>
      </div>
    `,
  });
}
