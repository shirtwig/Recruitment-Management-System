// RecruitFlow — ניהול פרופילי הרשאה (מי מותר לו לעשות מה במערכת)
import { Router } from 'express';
import { AuthorizationModel, authorizationRepository } from '../models/authorization.model';
import { requireAuth, requireAuthorization, AuthedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/asyncHandler';
import { parsePermissions } from '../permissions';

const router = Router();

// רשימת כל פרופילי ההרשאה, כולל ה-permissions המלאים - לצורך מסך ניהול ההרשאות
router.get('/', requireAuth, requireAuthorization('Authorization', 'READ'), asyncHandler(async (_req, res) => {
  const authorizations = await AuthorizationModel.find();
  res.json(
    authorizations.map((a) => ({ id: a._id, name: a.name, permissions: a.permissions }))
  );
}));

// יצירת פרופיל הרשאה חדש
router.post('/', requireAuth, requireAuthorization('Authorization', 'CREATE'), asyncHandler(async (req: AuthedRequest, res) => {
  const { name, permissions } = req.body as { name?: string; permissions?: unknown };

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'חסר שם פרופיל' });
  }

  const parsedPermissions = parsePermissions(permissions ?? []);

  const existing = await AuthorizationModel.findOne({ name });
  if (existing) {
    return res.status(400).json({ error: `פרופיל בשם ${name} כבר קיים` });
  }

  const authorization = await authorizationRepository.add({ name, permissions: parsedPermissions });
  res.status(201).json({ id: authorization._id, name: authorization.name, permissions: authorization.permissions });
}));

// עריכת פרופיל הרשאה קיים - שם ו/או permissions
router.put('/:id', requireAuth, requireAuthorization('Authorization', 'UPDATE'), asyncHandler(async (req: AuthedRequest, res) => {
  const { id } = req.params;
  const { name, permissions } = req.body as { name?: string; permissions?: unknown };

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) {
    if (!name.trim()) {
      return res.status(400).json({ error: 'שם פרופיל לא יכול להיות ריק' });
    }
    updateData.name = name;
  }
  if (permissions !== undefined) {
    updateData.permissions = parsePermissions(permissions);
  }

  const authorization = await authorizationRepository.update(id, updateData);
  if (!authorization) {
    return res.status(404).json({ error: 'פרופיל לא נמצא' });
  }

  res.json({ id: authorization._id, name: authorization.name, permissions: authorization.permissions });
}));

export default router;
