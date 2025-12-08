import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pkg;

const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function initDatabase() {
    try {
        await client.connect();
        console.log('Connected to PostgreSQL');

        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        console.log('Users table created/verified');

        await client.query(`
            CREATE TABLE IF NOT EXISTS scores (
                id SERIAL PRIMARY KEY,
                player_name VARCHAR(50) NOT NULL,
                time_seconds DECIMAL(10, 3) NOT NULL CHECK (time_seconds > 0),
                board_size INTEGER NOT NULL CHECK (board_size BETWEEN 5 AND 20),
                mines_count INTEGER NOT NULL CHECK (mines_count > 0),
                difficulty VARCHAR(10) NOT NULL CHECK (difficulty IN ('Легко', 'Средне', 'Сложно')),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Scores table created/verified');

        console.log('Database initialization completed!');

    } catch (error) {
        console.error('Database initialization failed:', error);
    } finally {
        await client.end();
    }
}

initDatabase();