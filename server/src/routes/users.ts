// RecruitFlow — ניהול משתמשים (מסך מנהל המערכת)
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { UserModel, userRepository, PopulatedUser } from '../models/user.model';
import { AuthorizationModel } from '../models/authorization.model';
import { requireAuth, requireAuthorization, AuthedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// רשימת כל המשתמשים - למסך ניהול משתמשים
// requireAuthorization('User','READ') - חייבת פרופיל שמרשה READ על "User" כדי להגיע לכאן בכלל
router.get('/', requireAuth, requireAuthorization('User', 'READ'), asyncHandler(async (_req, res) => {
  // populate מחזיר authorizationId כאובייקט, לא כ-ObjectId - לכן ה-cast הבודד הזה ל-PopulatedUser[]
  // (ראי הגדרת הטיפוס ב-user.model.ts). אחריו כל גישה לשדות למטה כבר בטוחת-טיפוסים, בלי as any.
  const users = (await UserModel.find().populate('authorizationId', 'name')) as unknown as PopulatedUser[];

  res.json(
    users.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      authorization: u.authorizationId?.name ?? null,
      isActive: u.isActive,
    }))
  );
}));

// יצירת משתמש חדש
// requireAuthorization('User','CREATE') - חייבת הרשאת CREATE על "User" (למשל פרופיל מנהל_מערכת)
router.post('/', requireAuth, requireAuthorization('User', 'CREATE'), asyncHandler(async (req: AuthedRequest, res) => {
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
    authorizationId: authorization._id,
  });

  res.status(201).json({ id: user._id, name: user.name, email: user.email }); // 201 = "נוצר בהצלחה"
}));


// עריכת משתמש קיים
// requireAuthorization('User','UPDATE') - חייבת הרשאת UPDATE על "User"
router.put('/:id', requireAuth, requireAuthorization('User', 'UPDATE'), asyncHandler(async (req: AuthedRequest, res) => {
  const { id } = req.params; // ה-id מגיע מהנתיב עצמו, למשל PUT /api/users/12345 -> id = "12345"

  // בניגוד ל-POST, כאן כל השדות אופציונליים - אולי רוצים לעדכן רק שם, בלי לגעת בשאר
  const { name, email, authorizationName, isActive } = req.body as {
    name?: string;
    email?: string;
    authorizationName?: string;
    isActive?: boolean;
  };

  // בונים אובייקט עדכון ומכניסים לתוכו רק שדות שבאמת נשלחו (לא undefined) -
  // כדי לא "לדרוס" בטעות שדות שהמשתמשת לא התכוונה לשנות
  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = email;
  if (isActive !== undefined) updateData.isActive = isActive;

  // בדיוק כמו ב-POST (שורה 41-45 למעלה) - אם נשלח authorizationName, מתרגמים אותו ל-id האמיתי
  if (authorizationName !== undefined) {
    const authorization = await AuthorizationModel.findOne({ name: authorizationName });
    if (!authorization) {
      return res.status(400).json({ error: `פרופיל הרשאה לא מוכר: ${authorizationName}` });
    }
    updateData.authorizationId = authorization._id;
  }

  // userRepository.update מגיעה חינם מ-Repository הגנרי (repository.ts) - מעדכנת ומחזירה את הגרסה החדשה
  // אם ה-id לא קיים במסד בכלל, היא מחזירה null
  const user = await userRepository.update(id, updateData);
  if (!user) {
    return res.status(404).json({ error: 'משתמש לא נמצא' });
  }

  // כמו ב-POST - לעולם לא מחזירים passwordHash בתשובה
  res.json({ id: user._id, name: user.name, email: user.email, isActive: user.isActive });
}));


export default router;
