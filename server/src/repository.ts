// RecruitFlow — Repository גנרי, לפי ההנחיה: "לא לשכפל, לכתוב פעם אחת"
// כל ישות (User, Authorization, Document, StatusLog, וגם Position/Candidate של הקבוצות האחרות)
// מקבלת גישה ל-add/getAll/getById/update/remove בלי לכתוב אף פונקציה בעצמה.

import { Model } from 'mongoose';

export class Repository<T> {
  // מקבל בקונסטרוקטור את המודל הספציפי (UserModel / AuthorizationModel / וכו') ושומר אותו
  constructor(private model: Model<T>) {}

  async add(data: Partial<T>): Promise<T> {
    return this.model.create(data); // מוסיף מסמך חדש לאוסף
  }

  async getAll(): Promise<T[]> {
    return this.model.find(); // שולף את כל המסמכים באוסף
  }

  async getById(id: string): Promise<T | null> {
    return this.model.findById(id); // שולף מסמך בודד לפי ה-_id שלו
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    // מעדכן שדות במסמך קיים; { new: true } אומר "תחזירי לי את הגרסה המעודכנת", לא הישנה
    return this.model.findByIdAndUpdate(id, data, { new: true });
  }

  async remove(id: string): Promise<void> {
    await this.model.findByIdAndDelete(id); // מוחק מסמך לפי id
  }
}
