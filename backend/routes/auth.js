import express from 'express';
import { createUser, findUserByUsername, validateUser } from '../database.js';

const router = express.Router();

const activeSessions = {};

router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Имя пользователя и пароль обязательны' });
        }

        if (username.length < 3) {
            return res.status(400).json({ error: 'Имя пользователя должно быть не менее 3 символов' });
        }

        const existingUser = await findUserByUsername(username);

        if (existingUser) {
            return res.status(400).json({ error: 'Пользователь с таким именем уже существует' });
        }

        const user = await createUser(username, password);

        const sessionId = Math.random().toString(36).substring(2);
        activeSessions[sessionId] = {
            userId: user.id,
            username: user.username
        };

        res.status(201).json({
            message: 'Пользователь успешно зарегистрирован',
            user: {
                id: user.id,
                username: user.username
            },
            sessionId: sessionId
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Ошибка сервера при регистрации' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Имя пользователя и пароль обязательны' });
        }

        const user = await validateUser(username, password);

        if (!user) {
            return res.status(401).json({ error: 'Неверное имя пользователя или пароль' });
        }

        const sessionId = Math.random().toString(36).substring(2);
        activeSessions[sessionId] = {
            userId: user.id,
            username: user.username
        };

        res.json({
            message: 'Вход выполнен успешно',
            user: {
                id: user.id,
                username: user.username
            },
            sessionId: sessionId
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Ошибка сервера при входе' });
    }
});

router.post('/logout', (req, res) => {
    const { sessionId } = req.body;

    if (sessionId && activeSessions[sessionId]) {
        delete activeSessions[sessionId];
    }

    res.json({ message: 'Выход выполнен успешно' });
});

router.get('/check', (req, res) => {
    const sessionId = req.query.sessionId;

    if (sessionId && activeSessions[sessionId]) {
        res.json({
            authenticated: true,
            user: activeSessions[sessionId]
        });
    } else {
        res.json({
            authenticated: false
        });
    }
});

export default router;