// RecruitFlow — Document: מכתב תיחור, פרוטוקולים, גרסאות
// relatedType/relatedId = הפניה פולימורפית: אותו שדה יכול להצביע לכל אוסף, לפי מה שכתוב ב-relatedType
import { Schema, model, Types } from 'mongoose';
import { Repository } from '../repository';

export interface DocumentRecord {
  relatedType: string; // למשל: "Position"
  relatedId: Types.ObjectId; // ה-id באוסף שצוין ב-relatedType
  url: string;
  version: number;
  uploadedAt: Date;
}

const documentSchema = new Schema<DocumentRecord>({
  relatedType: { type: String, required: true },
  relatedId: { type: Schema.Types.ObjectId, required: true },
  url: { type: String, required: true },
  version: { type: Number, default: 1 },
  uploadedAt: { type: Date, default: Date.now },
});

export const DocumentModel = model<DocumentRecord>('Document', documentSchema);
export const documentRepository = new Repository<DocumentRecord>(DocumentModel);
