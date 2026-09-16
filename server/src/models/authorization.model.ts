// RecruitFlow — Authorization: פרופיל הרשאות (במקום Role+Permission נפרדים)
// כל פרופיל מכיל בתוכו (embedded) את רשימת ה-resource/actions שהוא מרשה.
import { Schema, model, Types } from 'mongoose';
import { Repository } from '../repository';

export type Action = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE'; // ארבע הפעולות האפשריות בכל permission

// קבוע מרכזי ל-CRUD - פרופילים מייבאים אותו במקום לכתוב את רשימת הפעולות בכל פעם מחדש.
// לדוגמה: actions: CRUD_ACTIONS למי שצריך את כל הארבע, actions: ['READ'] למי שצריך רק קריאה.
export const CRUD_ACTIONS: Action[] = ['CREATE', 'READ', 'UPDATE', 'DELETE'];

export interface Permission {
  resource: string; // על איזה "משאב"/ישות זה חל, למשל: "Position", "EvaluationScore"
  actions: Action[]; // אילו מהפעולות מותרות על המשאב הזה
}

export interface Authorization {
  _id: Types.ObjectId;
  name: string; // שם התפקיד, למשל: "מנהל מקצועי"
  permissions: Permission[]; // רשימת ה-resource/actions שהתפקיד הזה מרשה
  createdBy?: Types.ObjectId; // -> User (מנהל המערכת שיצר את הפרופיל)
}

// _id: false - כי כל permission הוא רק תת-מסמך בתוך המערך, לא צריך _id משלו
const permissionSchema = new Schema<Permission>(
  {
    resource: { type: String, required: true },
    actions: { type: [String], required: true },
  },
  { _id: false }
);

const authorizationSchema = new Schema<Authorization>({
  name: { type: String, required: true, unique: true }, // שם תפקיד ייחודי - אי אפשר שני פרופילים באותו שם
  permissions: { type: [permissionSchema], default: [] }, // מערך מוטמע של permissionSchema
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
});

export const AuthorizationModel = model<Authorization>('Authorization', authorizationSchema);
export const authorizationRepository = new Repository<Authorization>(AuthorizationModel);

// בודק אם לפרופיל הרשאה מסוים יש הרשאת action על resource מסוים
// זו לוגיקה עסקית ספציפית (לא CRUD רגיל), ולכן היא לא בתוך Repository אלא פונקציה נפרדת כאן
export function hasPermission(auth: Authorization, resource: string, action: Action): boolean {
  return auth.permissions.some((p) => p.resource === resource && p.actions.includes(action));
}
