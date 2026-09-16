// RecruitFlow — Repository גנרי, לפי ההנחיה: "לא לשכפל, לכתוב פעם אחת"
// כל ישות (User, Authorization, Document, StatusLog, וגם Position/Candidate של הקבוצות האחרות)
// מקבלת גישה ל-add/getAll/getById/update/remove בלי לכתוב אף פונקציה בעצמה.

import { Model, Types } from 'mongoose';

export class Repository<T> {
  // מקבל בקונסטרוקטור את המודל הספציפי (UserModel / AuthorizationModel / וכו') ושומר אותו
  constructor(private model: Model<T>) {}

  async add(data: Partial<T>): Promise<T> {
    assertSafeData(data);
    return this.model.create(data); // מוסיף מסמך חדש לאוסף
  }

  async getAll(): Promise<T[]> {
    return this.model.find(); // שולף את כל המסמכים באוסף
  }

  async getById(id: string): Promise<T | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw Object.assign(new Error('מזהה לא תקין'), { status: 400 });
    }
    return this.model.findById(id); // שולף מסמך בודד לפי ה-_id שלו
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    if (!Types.ObjectId.isValid(id)) { 
      throw Object.assign(new Error('מזהה לא תקין'), { status: 400 });
    }
    assertSafeData(data); 
    return this.model.findByIdAndUpdate(id, data, { new: true });
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw Object.assign(new Error('מזהה לא תקין'), { status: 400 });
    }
    await this.model.findByIdAndDelete(id); // מוחק מסמך לפי id
  } 
}

function assertSafeData(data: unknown): void {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return;

  for (const key of Object.keys(data)) {
    if (key.startsWith('$') || key.includes('.')) {
      throw Object.assign(new Error(`שדה לא חוקי: ${key}`), { status: 400 });
    }
    assertSafeData((data as Record<string, unknown>)[key]); // בדיקה גם בתוך אובייקטים מקוננים
  }
}

