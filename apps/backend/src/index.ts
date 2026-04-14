import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/hello', (_req, res) => {
  res.json({ message: 'Hello from Express backend' });
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});