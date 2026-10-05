// RecruitFlow — התחברות למערכת
import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs'; // משמש להשוואת סיסמה גולמית מול ה-hash השמור (לא שומרים סיסמה כמו שהיא!)
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/user.model';
import { AuthorizationModel } from '../models/authorization.model';
import { asyncHandler } from '../middleware/asyncHandler';
import { sendPasswordResetEmail } from '../mailer';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET as string;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // שעה
const MIN_PASSWORD_LENGTH = 6;

router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (typeof email !=='string' ||typeof password!=='string') {
    return res.status(400).json({ error: 'צריך מייל וסיסמה' }); // 400 = בקשה לא תקינה (חסר מידע)
  }

  const user = await UserModel.findOne({ email });

  // בכוונה אותה הודעת שגיאה גם אם המייל לא קיים וגם אם הסיסמה שגויה
  // (לא מגלים לתוקף פוטנציאלי אם המייל בכלל קיים במערכת - שיקול אבטחה)
  if (!user || !user.isActive) {
    return res.status(401).json({ error: 'מייל או סיסמה שגויים' });
  }

  // bcrypt.compare משווה את הסיסמה שהוקלדה מול ה-hash השמור, בלי לפענח את ה-hash בחזרה
  const passwordOk = await bcrypt.compare(password, user.passwordHash);
  if (!passwordOk) {
    return res.status(401).json({ error: 'מייל או סיסמה שגויים' });
  }

  // שולפים גם את שם הפרופיל, רק כדי להציג אותו למשתמש בתשובה (לא חובה טכנית)
  const authorization = await AuthorizationModel.findById(user.authorizationId);

  // יוצרים את הטוקן: מה שנשים כאן (sub, authorizationId) זה מה ש-middleware/auth.ts יקרא בכל בקשה עתידית
  const token = jwt.sign(
    { sub: user._id.toString(), authorizationId: user.authorizationId.toString() },
    JWT_SECRET,
    { expiresIn: '8h' } // אחרי 8 שעות הטוקן פג תוקף ואי אפשר להשתמש בו יותר
  );

  res.json({
    token,
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      authorization: authorization?.name ?? null,
    },
  });
}));

// שלב 1 של "שכחתי סיסמה": מקבלים מייל, שולחים (אם המשתמש קיים) לינק לאיפוס
// עונים בהצלחה גנרית בכל מקרה - כדי לא לגלות לתוקף פוטנציאלי אילו מיילים קיימים במערכת
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body as { email?: string };

  if (typeof email !== 'string' || !email) {
    return res.status(400).json({ error: 'צריך דוא"ל' });
  }

  const genericMessage = 'אם קיים חשבון עם הדוא"ל הזה, נשלח אליו מייל עם קישור לאיפוס סיסמה';
  const user = await UserModel.findOne({ email });

  if (user && user.isActive) {
    // טוקן גולמי - זה מה שנשלח במייל ומוטמע בלינק. שומרים במסד רק את ה-hash שלו (בדיוק כמו סיסמה),
    // כך שאם המסד דולף, אי אפשר להשתמש בערך השמור כדי לאפס סיסמה בעצמך
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetPasswordTokenHash = tokenHash;
    user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await user.save();

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${clientUrl}/?resetToken=${rawToken}`;
    await sendPasswordResetEmail(user.email, resetUrl);
  }

  res.json({ message: genericMessage });
}));

// שלב 2: מקבלים את הטוקן הגולמי מהלינק + סיסמה חדשה, ומעדכנים אם הטוקן תקין ולא פג תוקף
router.post('/reset-password', asyncHandler(async (req, res) => {
  const { token, password } = req.body as { token?: string; password?: string };

  if (typeof token !== 'string' || !token || typeof password !== 'string' || !password) {
    return res.status(400).json({ error: 'צריך טוקן וסיסמה חדשה' });
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: `הסיסמה חייבת להיות לפחות ${MIN_PASSWORD_LENGTH} תווים` });
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  // select('+...') חובה כאן - בהגדרת ה-schema השדות האלה מוגדרים select: false (ראי user.model.ts)
  const user = await UserModel.findOne({
    resetPasswordTokenHash: tokenHash,
    resetPasswordExpires: { $gt: new Date() },
  }).select('+resetPasswordTokenHash +resetPasswordExpires');

  if (!user) {
    return res.status(400).json({ error: 'קישור האיפוס לא תקין או שפג תוקפו' });
  }

  user.passwordHash = await bcrypt.hash(password, 10);
  user.resetPasswordTokenHash = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({ message: 'הסיסמה אופסה בהצלחה' });
}));

export default router;
