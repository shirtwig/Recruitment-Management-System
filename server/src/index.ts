// RecruitFlow — נקודת הכניסה של השרת

import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import authorizationsRouter from './routes/authorizations';

const app = express(); 

app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json());

// בדיקת חיים בסיסית - שימושי כדי לוודא שהשרת בכלל רץ
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// כל בקשה שמתחילה ב-/api/auth/... תטופל ע"י authRouter, וכל /api/users/... ע"י usersRouter
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/authorizations', authorizationsRouter);

// middleware לטיפול בשגיאות - חייב להיות אחרי כל ה-routes, ומזוהה ע"י Express בזכות 4 הפרמטרים (err, req, res, next)
// תופס כל שגיאה שמגיעה מ-next(err) - למשל מ-asyncHandler שעוטף route אסינכרוני
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  const status = err.status ?? 500;
  res.status(status).json({ error: err.message ?? 'שגיאת שרת' });
});

const port = Number(process.env.PORT) || 4000;
const mongoUri = process.env.MONGODB_URI as string;

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log(`מחובר ל-MongoDB (${mongoUri})`);
    app.listen(port, () => {
      console.log(`RecruitFlow server listening on http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error('נכשל להתחבר ל-MongoDB:', err);
    process.exit(1);
  });
