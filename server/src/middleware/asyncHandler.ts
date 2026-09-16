// RecruitFlow — עוטף route אסינכרוני כדי ששגיאות שנזרקות בתוכו יגיעו ל-middleware הגלובלי במקום לתקוע את הבקשה
// ב-Express 4 (הגרסה שמותקנת כאן) שגיאה שנזרקת בתוך async handler *לא* מועברת אוטומטית ל-next(err) - צריך לתפוס אותה ידנית

import { Request, Response, NextFunction, RequestHandler } from 'express';

export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next); // אם ה-Promise נדחה (שגיאה), מעבירים אותה ל-next -> תופס אותה errorHandler ב-index.ts
  };
}
