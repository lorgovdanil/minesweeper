import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pkg;

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 5432;
const DB_NAME = process.env.DB_NAME || 'minesweeper';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || '';

async function createDatabaseIfNotExists() {
    // Подключаемся к стандартной базе данных PostgreSQL для создания новой БД
    const adminClient = new Client({
        host: DB_HOST,
        port: DB_PORT,
        database: 'postgres', // Подключаемся к стандартной БД
        user: DB_USER,
        password: DB_PASSWORD,
    });

    try {
        await adminClient.connect();
        console.log('Connected to PostgreSQL server');

        // Проверяем, существует ли база данных
        const result = await adminClient.query(
            `SELECT 1 FROM pg_database WHERE datname = $1`,
            [DB_NAME]
        );

        if (result.rows.length === 0) {
            // База данных не существует, создаём её
            console.log(`Creating database "${DB_NAME}"...`);
            // Используем идентификатор в двойных кавычках для экранирования имени
            await adminClient.query(`CREATE DATABASE "${DB_NAME}"`);
            console.log(`Database "${DB_NAME}" created successfully`);
        } else {
            console.log(`Database "${DB_NAME}" already exists`);
        }
    } catch (error) {
        console.error('Error creating database:', error.message);
        throw error;
    } finally {
        await adminClient.end();
    }
}

async function initDatabase() {
    try {
        // Сначала создаём базу данных, если её нет
        await createDatabaseIfNotExists();

        // Теперь подключаемся к нужной базе данных для создания таблиц
        const client = new Client({
            host: DB_HOST,
            port: DB_PORT,
            database: DB_NAME,
            user: DB_USER,
            password: DB_PASSWORD,
        });

        await client.connect();
        console.log(`Connected to database "${DB_NAME}"`);

        // Создаём таблицы
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
        await client.end();
    } catch (error) {
        console.error('Database initialization failed:', error.message);
        process.exit(1);
    }
}

initDatabase();