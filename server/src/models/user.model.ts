// RecruitFlow — User: צוות פנימי בלבד (לא מועמדים, לא חברות)
// כל קובץ מודל בנוי לפי אותה תבנית קבועה: (1) interface = הטיפוס ב-TypeScript,
// (2) Schema = איך זה נשמר בפועל ב-MongoDB, (3) Model = "הידית" שדרכה שולפים/שומרים,
// (4) Repository = חיבור המודל הזה לקלאס הגנרי, כדי לקבל CRUD בחינם.
import { Schema, model, Types } from 'mongoose';
import { Repository } from '../repository';
import { Permission, permissionSchema } from './authorization.model';

export interface User {
  _id: Types.ObjectId;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  department?: string; // יחידה ארגונית במשרד
  startDate?: Date; // תאריך תחילת תפקיד
  passwordHash: string; // תוספת הכרחית שלנו - לא היה ברשימת השדות המקורית, אבל בלי זה אי אפשר להתחבר
  authorizationId: Types.ObjectId; // -> Authorization - רק לתווית תפקיד לתצוגה, לא מקור ההרשאות בפועל (ראי permissions למטה)
  // ההרשאות בפועל של המשתמש הזה, ספציפית - נבחרות בעת היצירה (בד"כ מועתקות מפרופיל ה-authorization כברירת מחדל),
  // אבל ניתנות לעריכה אישית אחר כך. שני משתמשים עם אותו authorizationId יכולים להסתיים עם permissions שונים.
  permissions: Permission[];
  isActive: boolean; // לכיבוי משתמש בלי למחוק אותו (soft-disable)
  resetPasswordTokenHash?: string; // hash של טוקן "שכחתי סיסמה" החי - לעולם לא שומרים את הטוקן הגולמי (ראי routes/auth.ts)
  resetPasswordExpires?: Date; // הטוקן תקף לזמן מוגבל בלבד
}

// הצורה של User אחרי .populate('authorizationId', 'name') -
// authorizationId הופך בזמן ריצה מ-ObjectId (רק מזהה) לאובייקט עם _id ו-name,
// אבל הטיפוס הסטטי לא "יודע" את זה אוטומטית - לכן מגדירים כאן טיפוס נפרד לתיאור הצורה החדשה
export type PopulatedUser = Omit<User, 'authorizationId'> & {
  authorizationId: { _id: Types.ObjectId; name: string } | null;
};

const userSchema = new Schema<User>(
  {
    email: { type: String, required: true, unique: true }, // unique - מונע כפילות מייל במסד
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: { type: String },
    department: { type: String },
    startDate: { type: Date },
    passwordHash: { type: String, required: true }, // לעולם לא שומרים סיסמה גולמית, רק hash (ראי routes/auth.ts)
    authorizationId: { type: Schema.Types.ObjectId, ref: 'Authorization', required: true }, // ref מאפשר populate בהמשך
    permissions: { type: [permissionSchema], default: [] },
    isActive: { type: Boolean, default: true },
    resetPasswordTokenHash: { type: String, select: false }, // select: false - לא חוזר בשליפות רגילות, רק כשמבקשים אותו במפורש
    resetPasswordExpires: { type: Date, select: false },
  },
  { timestamps: true } // מוסיף אוטומטית createdAt/updatedAt לכל מסמך
);

export const UserModel = model<User>('User', userSchema); // "User" זה שם ה-collection במסד (ברבים: users)
export const userRepository = new Repository<User>(UserModel); // עכשיו יש userRepository.add/getAll/getById/update/remove בחינם