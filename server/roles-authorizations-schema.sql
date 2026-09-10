-- ============================================================
-- RecruitFlow — טבלאות תפקידים והרשאות)
-- ============================================================

-- משתמשי המערכת
CREATE TABLE users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name     TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role_id       INTEGER NOT NULL REFERENCES roles(id),
    company_id    INTEGER REFERENCES companies(id),  -- מוגדר רק אם role = 'חברת_גיוס'
    is_active     INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- פעולות בודדות שאפשר להרשות/לשלול לכל תפקיד
-- (כדי שמנהל המערכת יוכל לנהל הרשאות במסך, בלי לשנות קוד)
CREATE TABLE authorizations (
    id  INTEGER PRIMARY KEY AUTOINCREMENT,
    -- למשל: 'position.create' | 'position.approve' | 'tender.publish'
    --      | 'application.score' | 'application.decide'
    --      | 'document.generate' | 'users.manage'
        name TEXT NOT NULL UNIQUE
    -- ערכים: 'מנהל_מקצועי' | 'רפרנט' | 'ועדת_מכרזים' | 'מראיין' | 'מנהל_מערכת' | 'חברת_גיוס'

);

-- ============================================================
-- נתוני בסיס (seed) - הצעה ראשונית, לעדכן לפי הצורך בפועל

INSERT INTO authorizations (name) VALUES
    ('מנהל_מקצועי'),
    ('רפרנט'),
    ('ועדת_מכרזים'),
    ('מראיין'),
    ('מנהל_מערכת'),
    ('חברת_גיוס');

INSERT INTO authorizations (key) VALUES
    ('position.create'),          -- פתיחת משרה חדשה + הגדרת מפ"ל
    ('position.submit_approval'), -- שליחת משרה לאישור ועדה
    ('position.approve'),         -- אישור/החזרת משרה בוועדה
    ('tender.publish'),           -- פרסום לתיחור
    ('application.submit'),       -- הגשת מועמד (חברת גיוס)
    ('application.view_own'),     -- צפייה בהגשות של החברה עצמה בלבד
    ('application.score'),        -- ניקוד מועמד (רק את מי ששובץ אליי, אם role=מראיין)
    ('application.decide'),       -- החלטה סופית על הגשה
    ('document.generate'),        -- הפקת מכתב תיחור / מכתב אישור סופי
    ('users.manage'),             -- ניהול משתמשים ותפקידים
    ('authorizations.manage');    -- עריכת מיפוי תפקיד-להרשאות

-- מיפוי התחלתי תפקיד -> הרשאות (להתאים בהמשך מול שאר הקבוצות)
INSERT INTO authorizations (authorization_id, authorization_name)
SELECT a.id, a.name FROM authorization_id a, authorizations k WHERE
    (a.name = 'מנהל_מקצועי' AND k.key IN ('position.create', 'position.submit_approval')) OR
    (a.name = 'רפרנט'        AND k.key IN ('position.submit_approval', 'tender.publish', 'application.decide')) OR
    (a.name = 'ועדת_מכרזים'  AND k.key IN ('position.approve')) OR
    (a.name = 'מראיין'       AND k.key IN ('application.score')) OR
    (a.name = 'מנהל_מערכת'   AND k.key IN ('users.manage', 'authorizations.manage')) OR
    (a.name = 'חברת_גיוס'    AND k.key IN ('application.submit', 'application.view_own'));
