import waitPort from 'wait-port';
import fs from 'fs';
import type { Pool, RowDataPacket, OkPacket } from 'mysql2';
import mysql from 'mysql2';
import type { TodoItem } from '../types/todo';
import type { User, PublicUser } from '../types/user';

interface MySQLTodoRow extends RowDataPacket {
    id: string;
    name: string;
    completed: number;
    user_id: string;
}

interface MySQLUserRow extends RowDataPacket {
    id: string;
    name: string;
    email: string;
    password: string;
    created_at: Date;
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
    user_id: row.user_id,
});

const rowToUser = (row: MySQLUserRow): User => ({
    id: row.id,
    name: row.name,
    email: row.email,
    password: row.password,
    created_at: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
});

const userToPublicUser = (user: User): PublicUser => ({
    id: user.id,
    name: user.name,
    email: user.email,
    created_at: user.created_at.toISOString(),
});

const query = <T>(sql: string, values?: unknown[]): Promise<T> => {
    return new Promise((resolve, reject) => {
        pool.query(sql, values ?? [], (err, result) => {
            if (err) {return reject(err);}
            resolve(result as T);
        });
    });
};

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

    await query(
        'CREATE TABLE IF NOT EXISTS todo_items (id varchar(36), name varchar(255), completed boolean, user_id varchar(36)) DEFAULT CHARSET utf8mb4',
    );

    // Migration: add user_id column if it doesn't exist (compatible with MySQL < 8.0.3)
    interface CountRow extends RowDataPacket { count: number; }
    const [countRow] = await query<CountRow[]>(
        `SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'todo_items' AND COLUMN_NAME = 'user_id'`,
    );
    if (countRow.count === 0) {
        await query('ALTER TABLE todo_items ADD COLUMN user_id VARCHAR(36)');
    }

    // Add index on user_id if not exists (ignore error if it already exists)
    try {
        await query('CREATE INDEX idx_todo_items_user_id ON todo_items (user_id)');
    } catch {
        // Index may already exist, ignore
    }

    await query(`
        CREATE TABLE IF NOT EXISTS users (
            id         VARCHAR(36)  NOT NULL PRIMARY KEY,
            name       VARCHAR(255) NOT NULL,
            email      VARCHAR(255) NOT NULL,
            password   VARCHAR(255) NOT NULL,
            created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_users_email (email)
        ) DEFAULT CHARSET utf8mb4
    `);

    console.log(`Connected to MySQL database at host ${config.host}`);
};

const teardown = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        pool.end((err) => {
            if (err) {reject(err);}
            else resolve();
        });
    });
};

// ---- Todo methods (scoped by userId) ----

const getItems = (userId: string): Promise<TodoItem[]> => {
    return new Promise((resolve, reject) => {
        pool.query<MySQLTodoRow[]>(
            'SELECT * FROM todo_items WHERE user_id = ?',
            [userId],
            (err, rows) => {
                if (err) {return reject(err);}
                resolve(rows.map(rowToTodoItem));
            },
        );
    });
};

const getItem = (id: string, userId: string): Promise<TodoItem | undefined> => {
    return new Promise((resolve, reject) => {
        pool.query<MySQLTodoRow[]>(
            'SELECT * FROM todo_items WHERE id = ? AND user_id = ?',
            [id, userId],
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
            'INSERT INTO todo_items (id, name, completed, user_id) VALUES (?, ?, ?, ?)',
            [item.id, item.name, item.completed ? 1 : 0, item.user_id],
            (err) => {
                if (err) {return reject(err);}
                resolve();
            },
        );
    });
};

const updateItem = (id: string, userId: string, item: Pick<TodoItem, 'name' | 'completed'>): Promise<void> => {
    return new Promise((resolve, reject) => {
        pool.query<OkPacket>(
            'UPDATE todo_items SET name = ?, completed = ? WHERE id = ? AND user_id = ?',
            [item.name, item.completed ? 1 : 0, id, userId],
            (err) => {
                if (err) {return reject(err);}
                resolve();
            },
        );
    });
};

const removeItem = (id: string, userId: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        pool.query<OkPacket>(
            'DELETE FROM todo_items WHERE id = ? AND user_id = ?',
            [id, userId],
            (err, result) => {
                if (err) return reject(err);
                resolve(result.affectedRows > 0);
            },
        );
    });
};

// ---- User methods ----

const createUser = (user: User): Promise<void> => {
    return new Promise((resolve, reject) => {
        pool.query<OkPacket>(
            'INSERT INTO users (id, name, email, password, created_at) VALUES (?, ?, ?, ?, ?)',
            [user.id, user.name, user.email, user.password, user.created_at],
            (err) => {
                if (err) {return reject(err);}
                resolve();
            },
        );
    });
};

const findUserByEmail = (email: string): Promise<User | undefined> => {
    return new Promise((resolve, reject) => {
        pool.query<MySQLUserRow[]>(
            'SELECT * FROM users WHERE email = ?',
            [email],
            (err, rows) => {
                if (err) {return reject(err);}
                resolve(rows[0] ? rowToUser(rows[0]) : undefined);
            },
        );
    });
};

const findUserById = (id: string): Promise<User | undefined> => {
    return new Promise((resolve, reject) => {
        pool.query<MySQLUserRow[]>(
            'SELECT * FROM users WHERE id = ?',
            [id],
            (err, rows) => {
                if (err) {return reject(err);}
                resolve(rows[0] ? rowToUser(rows[0]) : undefined);
            },
        );
    });
};

const updateUser = (
    id: string,
    fields: Partial<Pick<User, 'name' | 'email' | 'password'>>,
): Promise<void> => {
    const setClauses: string[] = [];
    const values: unknown[] = [];

    if (fields.name !== undefined) {
        setClauses.push('name = ?');
        values.push(fields.name);
    }
    if (fields.email !== undefined) {
        setClauses.push('email = ?');
        values.push(fields.email);
    }
    if (fields.password !== undefined) {
        setClauses.push('password = ?');
        values.push(fields.password);
    }

    if (setClauses.length === 0) return Promise.resolve();

    values.push(id);
    return new Promise((resolve, reject) => {
        pool.query<OkPacket>(
            `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`,
            values,
            (err) => {
                if (err) {return reject(err);}
                resolve();
            },
        );
    });
};

const deleteUser = (id: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        pool.query<OkPacket>(
            'DELETE FROM todo_items WHERE user_id = ?',
            [id],
            (err) => {
                if (err) {return reject(err);}
                pool.query<OkPacket>(
                    'DELETE FROM users WHERE id = ?',
                    [id],
                    (err2) => {
                        if (err2) {return reject(err2);}
                        resolve();
                    },
                );
            },
        );
    });
};

const getAllUserData = async (userId: string): Promise<{ user: PublicUser; todos: TodoItem[] }> => {
    const userRow = await new Promise<MySQLUserRow | undefined>((resolve, reject) => {
        pool.query<MySQLUserRow[]>(
            'SELECT * FROM users WHERE id = ?',
            [userId],
            (err, rows) => {
                if (err) {return reject(err);}
                resolve(rows[0]);
            },
        );
    });

    if (!userRow) {
        throw new Error(`User not found: ${userId}`);
    }

    const user = userToPublicUser(rowToUser(userRow));
    const todos = await getItems(userId);

    return { user, todos };
};

export default {
    init,
    teardown,
    getItems,
    getItem,
    storeItem,
    updateItem,
    removeItem,
    createUser,
    findUserByEmail,
    findUserById,
    updateUser,
    deleteUser,
    getAllUserData,
};
