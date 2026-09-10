// RecruitFlow — נקודת הכניסה של השרת

import 'dotenv/config'; 
import express from 'express'; 
import cors from 'cors'; 
import mongoose from 'mongoose'; 
import authRouter from './routes/auth';
import usersRouter from './routes/users';

const app = express(); 

app.use(cors());
app.use(express.json());

// בדיקת חיים בסיסית - שימושי כדי לוודא שהשרת בכלל רץ
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// כל בקשה שמתחילה ב-/api/auth/... תטופל ע"י authRouter, וכל /api/users/... ע"י usersRouter
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);

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
