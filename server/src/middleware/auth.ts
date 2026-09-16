// RecruitFlow — אימות (מי אתה) והרשאה (מה מותר לך)

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthorizationModel, hasPermission, Action } from '../models/authorization.model';
import { asyncHandler } from './asyncHandler';

const JWT_SECRET = process.env.JWT_SECRET as string; // המפתח שאיתו חתמנו את הטוקן ב-login (routes/auth.ts)

// מרחיב את הטיפוס הרגיל של Request כדי שיהיה גם req.user אחרי requireAuth
export type AuthedRequest = Request & {
  user?: { id: string; authorizationId: string };
};

// שלב 1: מי המשתמש? קורא את הטוקן מה-Header, מוודא שהוא תקין ולא זויף
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization; // מצופה: "Bearer <token>"
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null; // חותכים את המילה "Bearer " ומשאירים רק את הטוקן

  if (!token) {
    return res.status(401).json({ error: 'לא מחוברת - חסר טוקן' }); // 401 = "לא מזוהה"
  }

  try {
    // jwt.verify בודק גם שהחתימה תואמת (לא מזויף) וגם שהטוקן לא פג תוקף (expiresIn מה-login)
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string; authorizationId: string };
    req.user = { id: payload.sub, authorizationId: payload.authorizationId }; // שומרים על הבקשה, לשימוש בהמשך השרשרת
    next(); // מעבירים הלאה למידלוור/route הבא
  } catch {
    return res.status(401).json({ error: 'טוקן לא תקין או פג תוקף' });
  }
}

// שלב 2: מותר לו לבצע את הפעולה הזו? בודק מול פרופיל ה-Authorization המוטמע
// זו "פונקציה שמחזירה פונקציה" - כי צריך להעביר פרמטרים (resource, action) לפני שExpress קורא לה
export function requireAuthorization(resource: string, action: Action) {
  return asyncHandler(async (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'לא מחוברת' }); // הגנה - אם מישהו ישכח לשים requireAuth לפני זה
    }

      // שולפים מהמסד את פרופיל ההרשאה שהמשתמש מקושר אליו (ה-id שמור בטוקן שלו)
    const authorization = await AuthorizationModel.findById(req.user.authorizationId);

    if (!authorization || !hasPermission(authorization, resource, action)) {
      return res.status(403).json({ error: `אין לך הרשאת ${action} על ${resource}` }); // 403 = "מזוהה אבל אסור לך"
    }

    next(); // מותר - ממשיכים לקוד האמיתי של ה-route
  });
}
