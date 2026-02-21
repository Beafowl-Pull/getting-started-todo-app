import waitPort from 'wait-port';
import fs from 'fs';
import type { Pool, RowDataPacket, OkPacket } from 'mysql2';
import mysql from 'mysql2';
import type { TodoItem } from '../types/todo';

interface MySQLTodoRow extends RowDataPacket {
    id: string;
    name: string;
    completed: number;
}

interface DbConfig {
    host: string;
    user: string;
    password: string;
    database: string;
}

const {
    MYSQL_HOST: HOST,
    MYSQL_HOST_FILE: HOST_FILE,
    MYSQL_USER: USER,
    MYSQL_USER_FILE: USER_FILE,
    MYSQL_PASSWORD: PASSWORD,
    MYSQL_PASSWORD_FILE: PASSWORD_FILE,
    MYSQL_DB: DB,
    MYSQL_DB_FILE: DB_FILE,
} = process.env;

let pool: Pool;

const readSecret = (filePath: string | undefined, fallback: string | undefined): string => {
    if (filePath) {return fs.readFileSync(filePath, 'utf-8').trim();}
    if (fallback) {return fallback;}
    throw new Error(`Missing required environment variable (file or value)`);
};

const rowToTodoItem = (row: MySQLTodoRow): TodoItem => ({
    id: row.id,
    name: row.name,
    completed: row.completed === 1,
});

const init = async (): Promise<void> => {
    const config: DbConfig = {
        host: readSecret(HOST_FILE, HOST),
        user: readSecret(USER_FILE, USER),
        password: readSecret(PASSWORD_FILE, PASSWORD),
        database: readSecret(DB_FILE, DB),
    };

    await waitPort({
        host: config.host,
        port: 3306,
        timeout: 10000,
        waitForDns: true,
    });

    pool = mysql.createPool({
        connectionLimit: 5,
        charset: 'utf8mb4',
        ...config,
    });

    return new Promise((resolve, reject) => {
        pool.query(
            'CREATE TABLE IF NOT EXISTS todo_items (id varchar(36), name varchar(255), completed boolean) DEFAULT CHARSET utf8mb4',
            (err) => {
                if (err) {return reject(err);}
                console.log(`Connected to MySQL database at host ${config.host}`);
                resolve();
            },
        );
    });
};

const teardown = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        pool.end((err) => {
            if (err) {reject(err);}
            else resolve();
        });
    });
};

const getItems = (): Promise<TodoItem[]> => {
    return new Promise((resolve, reject) => {
        pool.query<MySQLTodoRow[]>('SELECT * FROM todo_items', (err, rows) => {
            if (err) {return reject(err);}
            resolve(rows.map(rowToTodoItem));
        });
    });
};

const getItem = (id: string): Promise<TodoItem | undefined> => {
    return new Promise((resolve, reject) => {
        pool.query<MySQLTodoRow[]>(
            'SELECT * FROM todo_items WHERE id = ?',
            [id],
            (err, rows) => {
                if (err) {return reject(err);}
                resolve(rows.map(rowToTodoItem)[0]);
            },
        );
    });
};

const storeItem = (item: TodoItem): Promise<void> => {
    return new Promise((resolve, reject) => {
        pool.query<OkPacket>(
            'INSERT INTO todo_items (id, name, completed) VALUES (?, ?, ?)',
            [item.id, item.name, item.completed ? 1 : 0],
            (err) => {
                if (err) {return reject(err);}
                resolve();
            },
        );
    });
};

const updateItem = (id: string, item: Pick<TodoItem, 'name' | 'completed'>): Promise<void> => {
    return new Promise((resolve, reject) => {
        pool.query<OkPacket>(
            'UPDATE todo_items SET name = ?, completed = ? WHERE id = ?',
            [item.name, item.completed ? 1 : 0, id],
            (err) => {
                if (err) {return reject(err);}
                resolve();
            },
        );
    });
};

const removeItem = (id: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        pool.query<OkPacket>(
            'DELETE FROM todo_items WHERE id = ?',
            [id],
            (err, result) => {
                if (err) return reject(err);
                resolve(result.affectedRows > 0);
            },
        );
    });
};

export default { init, teardown, getItems, getItem, storeItem, updateItem, removeItem };