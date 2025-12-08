import express from 'express';
import { getAllScores, addScore, getTopScores } from '../database.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const scores = await getAllScores();
        res.json(scores);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/top', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const scores = await getTopScores(limit);
        res.json(scores);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.post('/', async (req, res) => {
    try {
        const { player_name, time_seconds, board_size, mines_count, difficulty } = req.body;

        if (!player_name || !time_seconds || !board_size || !mines_count || !difficulty) {
            return res.status(400).json({ error: 'Все поля должны быть заполнены' });
        }

        const score = {
            player_name: player_name.trim(),
            time_seconds: time_seconds,
            board_size: parseInt(board_size),
            mines_count: parseInt(mines_count),
            difficulty: difficulty
        };

        const newScore = await addScore(score);
        res.status(201).json({
            message: 'Результат успешно добавлен',
            score: newScore
        });

    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

export default router;