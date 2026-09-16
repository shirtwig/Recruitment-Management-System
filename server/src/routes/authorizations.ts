// RecruitFlow — רשימת פרופילי הרשאה (בשימוש למשל ב-dropdown של מסך ניהול משתמשים)
import { Router } from 'express';
import { AuthorizationModel } from '../models/authorization.model';
import { requireAuth, requireAuthorization } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// רשימת שמות פרופילי ההרשאה בלבד - לא חושפים את פירוט ה-permissions כאן
router.get('/', requireAuth, requireAuthorization('Authorization', 'READ'), asyncHandler(async (_req, res) => {
  const authorizations = await AuthorizationModel.find().select('name');
  res.json(authorizations.map((a) => ({ id: a._id, name: a.name })));
}));

export default router;
