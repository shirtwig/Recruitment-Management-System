// RecruitFlow — User: צוות פנימי בלבד (לא מועמדים, לא חברות)
// כל קובץ מודל בנוי לפי אותה תבנית קבועה: (1) interface = הטיפוס ב-TypeScript,
// (2) Schema = איך זה נשמר בפועל ב-MongoDB, (3) Model = "הידית" שדרכה שולפים/שומרים,
// (4) Repository = חיבור המודל הזה לקלאס הגנרי, כדי לקבל CRUD בחינם.
import { Schema, model, Types } from 'mongoose';
import { Repository } from '../repository';

export interface User {
  _id: Types.ObjectId;
  email: string;
  name: string;
  passwordHash: string; // תוספת הכרחית שלנו - לא היה ברשימת השדות המקורית, אבל בלי זה אי אפשר להתחבר
  authorizationId: Types.ObjectId; // -> Authorization (מפתח זר - מצביע למסמך Authorization ספציפי)
  isActive: boolean; // לכיבוי משתמש בלי למחוק אותו (soft-disable)
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
    name: { type: String, required: true },
    passwordHash: { type: String, required: true }, // לעולם לא שומרים סיסמה גולמית, רק hash (ראי routes/auth.ts)
    authorizationId: { type: Schema.Types.ObjectId, ref: 'Authorization', required: true }, // ref מאפשר populate בהמשך
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true } // מוסיף אוטומטית createdAt/updatedAt לכל מסמך
);

export const UserModel = model<User>('User', userSchema); // "User" זה שם ה-collection במסד (ברבים: users)
export const userRepository = new Repository<User>(UserModel); // עכשיו יש userRepository.add/getAll/getById/update/remove בחינם