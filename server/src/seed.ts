// RecruitFlow — נתוני התחלה: פרופילי הרשאה + משתמש מנהל ראשוני

import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { AuthorizationModel, Permission, CRUD_ACTIONS } from './models/authorization.model';
import { UserModel } from './models/user.model';

const AUTHORIZATION_PROFILES: { name: string; permissions: Permission[] }[] = [
  {
    name: 'מנהל_ראשי',
    permissions: [{ resource: 'Position', actions: CRUD_ACTIONS }],
  },
  {
    // דוגמה: פרופיל עם הרשאת קריאה בלבד (במקום לכתוב 'READ' בכל פרופיל בנפרד)
    name: 'מראיין',
    permissions: [{ resource: 'EvaluationScore', actions: ['READ'] }],
  },
  {
    name: 'רפרנט',
    permissions: [
      { resource: 'Position', actions: CRUD_ACTIONS },
      { resource: 'Application', actions: ['READ'] },
      { resource: 'Document', actions: CRUD_ACTIONS },
    ],
  },
  {
    name: 'ועדת_מכרזים',
    permissions: [
      { resource: 'Position', actions: CRUD_ACTIONS },
      { resource: 'TenderSummary', actions: CRUD_ACTIONS },
    ],
  },
  {
    name: 'מנהל_מערכת',
    permissions: [
      { resource: 'User', actions: CRUD_ACTIONS },
      { resource: 'Authorization', actions: CRUD_ACTIONS },
    ],
  },
];

async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log('מחוברת ל-MongoDB');

  // upsert: true = אם פרופיל בשם הזה כבר קיים - מעדכן אותו; אם לא - יוצר חדש.
  // ככה אפשר להריץ את הסקריפט הזה כמה פעמים בלי ליצור כפילויות.
  for (const profile of AUTHORIZATION_PROFILES) {
    await AuthorizationModel.findOneAndUpdate(
      { name: profile.name },
      { name: profile.name, permissions: profile.permissions },
      { upsert: true, returnDocument: 'after' }
    );
  }
  console.log(`נוצרו/עודכנו ${AUTHORIZATION_PROFILES.length} פרופילי הרשאה`);

  // עכשיו שיש בוודאות פרופיל "מנהל_מערכת" - יוצרים איתו את המשתמש הראשון, רק אם הוא עוד לא קיים
  const adminAuth = await AuthorizationModel.findOne({ name: 'מנהל_מערכת' });
  const adminEmail = 'admin@recruitflow.local';
  const existingAdmin = await UserModel.findOne({ email: adminEmail });

  if (!existingAdmin && adminAuth) {
    const passwordHash = await bcrypt.hash('Admin123!', 10);
    await UserModel.create({
      name: 'מנהל מערכת ראשי',
      email: adminEmail,
      passwordHash,
      authorizationId: adminAuth._id,
    });
    console.log(`נוצר משתמש מנהל: ${adminEmail} / Admin123! (להחליף סיסמה בהמשך!)`);
  }

  console.log('הסתיים בהצלחה.');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
