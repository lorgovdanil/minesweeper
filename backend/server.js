import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import scoresRouter from './routes/scores.js';
import authRouter from './routes/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(join(__dirname, '../frontend')));
app.use('/api/scores', scoresRouter);
app.use('/api/auth', authRouter);

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Minesweeper API is running' });
});

app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`API: http://localhost:${PORT}/api/scores`);
    console.log(`Auth: http://localhost:${PORT}/api/auth`);
    console.log(`Health: http://localhost:${PORT}/api/health`);
});