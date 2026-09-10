// RecruitFlow — StatusLog: יומן ביקורת - כל פעולה, מי ביצע, מתי
// entityType/entityId = הפניה פולימורפית, כמו ב-Document
import { Schema, model, Types } from 'mongoose';
import { Repository } from '../repository';

export interface StatusLog {
  entityType: string; // למשל: "Position"
  entityId: Types.ObjectId;
  action: string; // למשל: "APPROVED", "STATUS_CHANGED"
  performedBy: Types.ObjectId; // -> User
  timestamp: Date;
}

const statusLogSchema = new Schema<StatusLog>({
  entityType: { type: String, required: true },
  entityId: { type: Schema.Types.ObjectId, required: true },
  action: { type: String, required: true },
  performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  timestamp: { type: Date, default: Date.now },
});

export const StatusLogModel = model<StatusLog>('StatusLog', statusLogSchema);
export const statusLogRepository = new Repository<StatusLog>(StatusLogModel);
