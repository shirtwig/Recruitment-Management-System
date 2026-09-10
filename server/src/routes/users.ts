// RecruitFlow — ניהול משתמשים (מסך מנהל המערכת)
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { UserModel, userRepository } from '../models/user.model';
import { AuthorizationModel } from '../models/authorization.model';
import { requireAuth, requireAuthorization, AuthedRequest } from '../middleware/auth';

const router = Router();

// רשימת כל המשתמשים - למסך ניהול משתמשים
// requireAuthorization('User','READ') - חייבת פרופיל שמרשה READ על "User" כדי להגיע לכאן בכלל
router.get('/', requireAuth, requireAuthorization('User', 'READ'), async (_req, res) => {
  const users = await UserModel.find().populate('authorizationId', 'name');

  res.json(
    users.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      authorization: (u.authorizationId as any)?.name ?? null,
      isActive: u.isActive,
    }))
  );
});

// יצירת משתמש חדש
// requireAuthorization('User','CREATE') - חייבת הרשאת CREATE על "User" (למשל פרופיל מנהל_מערכת)
router.post('/', requireAuth, requireAuthorization('User', 'CREATE'), async (req: AuthedRequest, res) => {
  const { name, email, password, authorizationName } = req.body as {
    name?: string;
    email?: string;
    password?: string;
    authorizationName?: string;
  };

  if (!name || !email || !password || !authorizationName) {
    return res.status(400).json({ error: 'חסרים שדות חובה' });
  }

  // מחפשים את פרופיל ההרשאה *לפי שם* (למשל "מראיין") כדי לקבל את ה-id שלו לשיוך
  const authorization = await AuthorizationModel.findOne({ name: authorizationName });
  if (!authorization) {
    return res.status(400).json({ error: `פרופיל הרשאה לא מוכר: ${authorizationName}` });
  }

  const passwordHash = await bcrypt.hash(password, 10); // 10 = "מספר הסיבובים" של ההצפנה, ערך סטנדרטי

  // כאן משתמשים ב-userRepository.add - הפונקציה הגנרית מ-Repository, לא כותבים INSERT ידני
  const user = await userRepository.add({
    name,
    email,
    passwordHash,
    authorizationId: authorization._id as any,
  });

  res.status(201).json({ id: (user as any)._id, name: user.name, email: user.email }); // 201 = "נוצר בהצלחה"
});

export default router;
