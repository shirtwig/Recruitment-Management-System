// RecruitFlow — ולידציה משותפת למערך permissions שמגיע מה-client
// בשימוש גם ב-routes/users.ts (permissions אישיים למשתמש) וגם ב-routes/authorizations.ts (permissions של פרופיל)
import { Action, Permission } from './models/authorization.model';

export const VALID_ACTIONS: Action[] = ['CREATE', 'READ', 'UPDATE', 'DELETE'];

export function parsePermissions(input: unknown): Permission[] {
  if (!Array.isArray(input)) {
    throw Object.assign(new Error('permissions חייב להיות מערך'), { status: 400 });
  }

  return input.map((p) => {
    if (typeof p?.resource !== 'string' || !p.resource.trim() || !Array.isArray(p.actions)) {
      throw Object.assign(new Error('כל permission חייב resource (טקסט) ו-actions (מערך)'), { status: 400 });
    }
    const actions = p.actions.filter((a: unknown): a is Action => VALID_ACTIONS.includes(a as Action));
    return { resource: p.resource.trim(), actions };
  });
}
