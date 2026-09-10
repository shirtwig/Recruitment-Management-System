// RecruitFlow — התחברות למערכת
import { Router } from 'express';
import bcrypt from 'bcryptjs'; // משמש להשוואת סיסמה גולמית מול ה-hash השמור (לא שומרים סיסמה כמו שהיא!)
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/user.model';
import { AuthorizationModel } from '../models/authorization.model';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET as string;

router.post('/login', async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
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
      name: user.name,
      email: user.email,
      authorization: authorization?.name ?? null,
    },
  });
});

export default router;
