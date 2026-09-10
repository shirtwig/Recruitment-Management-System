# צילומי מסך - בדיקות API ידניות ב-Postman

תיעוד ויזואלי שהבדיקות של האימות וההרשאות עבדו כמצופה.

שמות מוצעים (לפי סדר הבדיקות שביצענו):

- `01-health-check.png` - GET /api/health מחזיר {"status":"ok"}
- `02-login-success.png` - POST /api/auth/login עם admin@recruitflow.local מחזיר token + user
- `03-users-no-token-401.png` - GET /api/users בלי טוקן, מחזיר 401 "לא מחוברת - חסר טוקן"
- `04-users-with-token-200.png` - GET /api/users עם Bearer token תקין, מחזיר רשימת משתמשים

אפשר גם לייצא את ה-Collection עצמו מ-Postman (קליק ימני על ה-collection → Export) ולשמור כאן כ-`RecruitFlow.postman_collection.json` - כך אפשר להריץ מחדש את כל הבדיקות בלחיצה, לא רק להסתכל על תמונה.
