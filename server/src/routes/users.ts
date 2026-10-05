// RecruitFlow — ניהול משתמשים (מסך מנהל המערכת)
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { UserModel, userRepository, PopulatedUser } from '../models/user.model';
import { AuthorizationModel } from '../models/authorization.model';
import { requireAuth, requireAuthorization, AuthedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { parsePermissions } from '../permissions';

const router = Router();

// טלפון ישראלי - נייד (050-1234567) או קווי (03-1234567), מקף אופציונלי
const PHONE_REGEX = /^0\d{1,2}-?\d{7}$/;
const PHONE_ERROR_MESSAGE = 'מספר טלפון לא תקין - לדוגמה: 050-1234567 או 03-1234567';

function isValidPhone(phone: string): boolean {
  return PHONE_REGEX.test(phone);
}

// בדיקת פורמט בסיסית (משהו@משהו.סיומת) - לא בודקת שהדומיין/הסיומת "אמיתיים" בפועל, זה דורש שירות חיצוני
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

// תאריך תחילת תפקיד הגיוני: לא רחוק מדי בעבר, ולא בעתיד הרחוק
const START_DATE_MAX_YEARS_AGO = 50;
const START_DATE_MAX_YEARS_AHEAD = 1;

function isValidStartDate(value: string): boolean {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const min = new Date();
  min.setFullYear(min.getFullYear() - START_DATE_MAX_YEARS_AGO);
  const max = new Date();
  max.setFullYear(max.getFullYear() + START_DATE_MAX_YEARS_AHEAD);
  return date >= min && date <= max;
}

// רשימת כל המשתמשים - למסך ניהול משתמשים
// requireAuthorization('User','READ') - חייבת פרופיל שמרשה READ על "User" כדי להגיע לכאן בכלל
router.get('/', requireAuth, requireAuthorization('User', 'READ'), asyncHandler(async (_req, res) => {
  // populate מחזיר authorizationId כאובייקט, לא כ-ObjectId - לכן ה-cast הבודד הזה ל-PopulatedUser[]
  // (ראי הגדרת הטיפוס ב-user.model.ts). אחריו כל גישה לשדות למטה כבר בטוחת-טיפוסים, בלי as any.
  const users = (await UserModel.find().populate('authorizationId', 'name')) as unknown as PopulatedUser[];

  res.json(
    users.map((u) => ({
      id: u._id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      phone: u.phone ?? null,
      department: u.department ?? null,
      startDate: u.startDate ?? null,
      authorization: u.authorizationId?.name ?? null,
      permissions: u.permissions,
      isActive: u.isActive,
    }))
  );
}));

// יצירת משתמש חדש
// requireAuthorization('User','CREATE') - חייבת הרשאת CREATE על "User" (למשל פרופיל מנהל_מערכת)
router.post('/', requireAuth, requireAuthorization('User', 'CREATE'), asyncHandler(async (req: AuthedRequest, res) => {
  const { firstName, lastName, email, password, authorizationName, phone, department, startDate, permissions } = req.body as {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    authorizationName?: string;
    phone?: string;
    department?: string;
    startDate?: string;
    permissions?: unknown;
  };

  if (!firstName || !lastName || !email || !password || !authorizationName) {
    return res.status(400).json({ error: 'חסרים שדות חובה' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'כתובת דוא"ל לא תקינה' });
  }

  // ההרשאות בפועל של המשתמש הזה - בד"כ הועתקו ב-client מפרופיל ה-authorization כברירת מחדל,
  // אבל יכולות להיות מותאמות אישית כבר בטופס היצירה (ראי הסבר ב-user.model.ts)
  const parsedPermissions = parsePermissions(permissions ?? []);

  if (phone && !isValidPhone(phone)) {
    return res.status(400).json({ error: PHONE_ERROR_MESSAGE });
  }

  if (startDate && !isValidStartDate(startDate)) {
    return res.status(400).json({ error: `תאריך תחילת תפקיד לא הגיוני - חייב להיות בטווח ${START_DATE_MAX_YEARS_AGO} שנים אחורה עד שנה קדימה` });
  }

  // מחפשים את פרופיל ההרשאה *לפי שם* (למשל "מראיין") כדי לקבל את ה-id שלו לשיוך
  const authorization = await AuthorizationModel.findOne({ name: authorizationName });
  if (!authorization) {
    return res.status(400).json({ error: `פרופיל הרשאה לא מוכר: ${authorizationName}` });
  }

  const passwordHash = await bcrypt.hash(password, 10); // 10 = "מספר הסיבובים" של ההצפנה, ערך סטנדרטי

  // כאן משתמשים ב-userRepository.add - הפונקציה הגנרית מ-Repository, לא כותבים INSERT ידני
  const user = await userRepository.add({
    firstName,
    lastName,
    email,
    passwordHash,
    authorizationId: authorization._id,
    permissions: parsedPermissions,
    phone: phone || undefined,
    department: department || undefined,
    startDate: startDate ? new Date(startDate) : undefined,
  });

  res.status(201).json({ id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email }); // 201 = "נוצר בהצלחה"
}));


// עריכת משתמש קיים
// requireAuthorization('User','UPDATE') - חייבת הרשאת UPDATE על "User"
router.put('/:id', requireAuth, requireAuthorization('User', 'UPDATE'), asyncHandler(async (req: AuthedRequest, res) => {
  const { id } = req.params; // ה-id מגיע מהנתיב עצמו, למשל PUT /api/users/12345 -> id = "12345"

  // בניגוד ל-POST, כאן כל השדות אופציונליים - אולי רוצים לעדכן רק שם, בלי לגעת בשאר
  const { firstName, lastName, email, authorizationName, isActive, phone, department, startDate, permissions } = req.body as {
    firstName?: string;
    lastName?: string;
    email?: string;
    authorizationName?: string;
    isActive?: boolean;
    phone?: string;
    department?: string;
    startDate?: string;
    permissions?: unknown;
  };

  if (email !== undefined && !isValidEmail(email)) {
    return res.status(400).json({ error: 'כתובת דוא"ל לא תקינה' });
  }

  if (phone && !isValidPhone(phone)) {
    return res.status(400).json({ error: PHONE_ERROR_MESSAGE });
  }

  if (startDate && !isValidStartDate(startDate)) {
    return res.status(400).json({ error: `תאריך תחילת תפקיד לא הגיוני - חייב להיות בטווח ${START_DATE_MAX_YEARS_AGO} שנים אחורה עד שנה קדימה` });
  }

  // בונים אובייקט עדכון ומכניסים לתוכו רק שדות שבאמת נשלחו (לא undefined) -
  // כדי לא "לדרוס" בטעות שדות שהמשתמשת לא התכוונה לשנות
  const updateData: Record<string, unknown> = {};
  if (firstName !== undefined) updateData.firstName = firstName;
  if (lastName !== undefined) updateData.lastName = lastName;
  if (email !== undefined) updateData.email = email;
  if (isActive !== undefined) updateData.isActive = isActive;
  if (phone !== undefined) updateData.phone = phone;
  if (department !== undefined) updateData.department = department;
  if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
  if (permissions !== undefined) updateData.permissions = parsePermissions(permissions);

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
  res.json({
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone ?? null,
    department: user.department ?? null,
    startDate: user.startDate ?? null,
    permissions: user.permissions,
    isActive: user.isActive,
  });
}));


// מחיקת משתמש
// requireAuthorization('User','DELETE') - חייבת הרשאת DELETE על "User" (רק למי שמנהל משתמשים בפועל)
router.delete('/:id', requireAuth, requireAuthorization('User', 'DELETE'), asyncHandler(async (req: AuthedRequest, res) => {
  const { id } = req.params;

  // הגנה - לא נותנים למשתמש למחוק את עצמו (עלול לנעול את כל המערכת בלי אף מנהל)
  if (req.user?.id === id) {
    return res.status(400).json({ error: 'אי אפשר למחוק את המשתמש המחובר כרגע' });
  }

  await userRepository.remove(id);
  res.status(204).send(); // 204 = הצליח, אין תוכן להחזיר
}));

export default router;
