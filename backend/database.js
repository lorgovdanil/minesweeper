import pkg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config();

const { Pool } = pkg;

export const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

export async function addScore(score) {
    const { player_name, time_seconds, board_size, mines_count, difficulty } = score;

    try {
        const timeSeconds = parseFloat(time_seconds);

        const result = await pool.query(`
            INSERT INTO scores (player_name, time_seconds, board_size, mines_count, difficulty)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [player_name, timeSeconds, board_size, mines_count, difficulty]);

        return result.rows[0];
    } catch (error) {
        console.error('Error adding score:', error);
        throw error;
    }
}

export async function getAllScores() {
    try {
        const result = await pool.query(`
            SELECT * FROM scores 
            ORDER BY time_seconds ASC, created_at ASC 
            LIMIT 100
        `);
        return result.rows;
    } catch (error) {
        console.error('Error getting all scores:', error);
        throw error;
    }
}

export async function getTopScores(limit = 10) {
    try {
        const result = await pool.query(`
            SELECT * FROM scores 
            ORDER BY time_seconds ASC 
            LIMIT $1
        `, [limit]);
        return result.rows;
    } catch (error) {
        console.error('Error getting top scores:', error);
        throw error;
    }
}

export async function createUser(username, password) {
    try {
        if (typeof password !== 'string') {
            throw new Error('Password must be a string');
        }

        if (!password || password.length === 0) {
            throw new Error('Password cannot be empty');
        }

        const saltRounds = 10;
        let hashedPassword;
        try {
            hashedPassword = await bcrypt.hash(password, saltRounds);
        } catch (hashError) {
            console.error('Bcrypt hash error:', hashError);
            throw new Error('Failed to hash password');
        }

        const result = await pool.query(`
            INSERT INTO users (username, password) 
            VALUES ($1, $2) 
            RETURNING id, username, created_at
        `, [username, hashedPassword]);

        return result.rows[0];
    } catch (error) {
        console.error('Error creating user:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            username: username,
            passwordType: typeof password
        });
        throw error;
    }
}

export async function findUserByUsername(username) {
    try {
        const result = await pool.query(`
            SELECT id, username, password FROM users 
            WHERE username = $1
        `, [username]);

        return result.rows[0];
    } catch (error) {
        console.error('Error finding user by username:', error);
        throw error;
    }
}

export async function validateUser(username, password) {
    try {
        const result = await pool.query(`
            SELECT * FROM users 
            WHERE username = $1
        `, [username]);

        if (result.rows.length === 0) {
            return null;
        }

        const user = result.rows[0];

        const isHashed = user.password && (user.password.startsWith('$2a$') ||
            user.password.startsWith('$2b$') ||
            user.password.startsWith('$2y$'));

        let isPasswordValid = false;

        if (isHashed) {
            try {
                isPasswordValid = await bcrypt.compare(password, user.password);
            } catch (bcryptError) {
                console.error('Bcrypt compare error:', bcryptError);
                return null;
            }
        } else {
            if (user.password === password) {
                isPasswordValid = true;
                try {
                    const saltRounds = 10;
                    const hashedPassword = await bcrypt.hash(password, saltRounds);
                    await pool.query(`
                        UPDATE users 
                        SET password = $1 
                        WHERE id = $2
                    `, [hashedPassword, user.id]);
                } catch (hashError) {
                    console.error('Error hashing password during migration:', hashError);
                }
            }
        }

        if (!isPasswordValid) {
            return null;
        }

        return {
            id: user.id,
            username: user.username,
            created_at: user.created_at
        };
    } catch (error) {
        console.error('Error validating user:', error);
        throw error;
    }
}
