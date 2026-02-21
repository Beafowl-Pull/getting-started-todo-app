import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import type { TodoItem } from '../types/todo';

const { verbose } = sqlite3;
const SQLite3 = verbose();

const DB_LOCATION = process.env.SQLITE_DB_LOCATION ?? '/etc/todos/todo.db';

interface SQLiteTodoRow {
    id: string;
    name: string;
    completed: number;
}

let db: sqlite3.Database;

const rowToTodoItem = (row: SQLiteTodoRow): TodoItem => ({
    id: row.id,
    name: row.name,
    completed: row.completed === 1,
});

const init = (): Promise<void> => {
    const dirName = path.dirname(DB_LOCATION);

    if (!fs.existsSync(dirName)) {
        fs.mkdirSync(dirName, { recursive: true });
    }

    return new Promise((resolve, reject) => {
        db = new SQLite3.Database(DB_LOCATION, (err) => {
            if (err) {return reject(err);}

            if (process.env.NODE_ENV !== 'test') {
                console.log(`Using SQLite database at ${DB_LOCATION}`);
            }

            db.run(
                'CREATE TABLE IF NOT EXISTS todo_items (id varchar(36), name varchar(255), completed boolean)',
                (err: Error | null) => {
                    if (err) {return reject(err);}
                    resolve();
                },
            );
        });
    });
};

const teardown = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        db.close((err) => {
            if (err) {reject(err);}
            else {resolve();}
        });
    });
};

const getItems = (): Promise<TodoItem[]> => {
    return new Promise((resolve, reject) => {
        db.all<SQLiteTodoRow>('SELECT * FROM todo_items', (err, rows) => {
            if (err) {return reject(err);}
            resolve(rows.map(rowToTodoItem));
        });
    });
};

const getItem = (id: string): Promise<TodoItem | undefined> => {
    return new Promise((resolve, reject) => {
        db.all<SQLiteTodoRow>(
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
        db.run(
            'INSERT INTO todo_items (id, name, completed) VALUES (?, ?, ?)',
            [item.id, item.name, item.completed ? 1 : 0],
            (err: Error | null) => {
                if (err) {return reject(err);}
                resolve();
            },
        );
    });
};

const updateItem = (id: string, item: Pick<TodoItem, 'name' | 'completed'>): Promise<void> => {
    return new Promise((resolve, reject) => {
        db.run(
            'UPDATE todo_items SET name = ?, completed = ? WHERE id = ?',
            [item.name, item.completed ? 1 : 0, id],
            (err: Error | null) => {
                if (err) {return reject(err);}
                resolve();
            },
        );
    });
};

const removeItem = (id: string): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        db.run(
            'DELETE FROM todo_items WHERE id = ?',
            [id],
            function (this: sqlite3.RunResult, err: Error | null) {
            if (err) {return reject(err);}
            resolve(this.changes > 0);
        },
    );
    });
};

export default { init, teardown, getItems, getItem, storeItem, updateItem, removeItem };