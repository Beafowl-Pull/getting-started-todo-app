import type { DbAdapter } from "./index";
import type { TodoItem } from "../types/todo";
import type { User, PublicUser } from "../types/user";

const userToPublicUser = (user: User): PublicUser => ({
    id: user.id,
    name: user.name,
    email: user.email,
    created_at: user.created_at.toISOString(),
});

const createInMemoryAdapter = (): DbAdapter => {
    const todos: TodoItem[] = [];
    const users: User[] = [];

    return {
        init: (): Promise<void> => Promise.resolve(),
        teardown: (): Promise<void> => Promise.resolve(),

        getItems: (userId: string): Promise<TodoItem[]> =>
            Promise.resolve(todos.filter((t) => t.user_id === userId)),

        getItem: (id: string, userId: string): Promise<TodoItem | undefined> =>
            Promise.resolve(todos.find((t) => t.id === id && t.user_id === userId)),

        storeItem: (item: TodoItem): Promise<void> => {
            todos.push(item);
            return Promise.resolve();
        },

        updateItem: (
            id: string,
            userId: string,
            item: Pick<TodoItem, "name" | "completed">,
        ): Promise<void> => {
            const idx = todos.findIndex((t) => t.id === id && t.user_id === userId);
            if (idx !== -1) {
                todos[idx] = { ...todos[idx]!, ...item };
            }
            return Promise.resolve();
        },

        removeItem: (id: string, userId: string): Promise<boolean> => {
            const idx = todos.findIndex((t) => t.id === id && t.user_id === userId);
            if (idx === -1) return Promise.resolve(false);
            todos.splice(idx, 1);
            return Promise.resolve(true);
        },

        createUser: (user: User): Promise<void> => {
            const exists = users.some((u) => u.email === user.email);
            if (exists) return Promise.reject(new Error("Email already in use"));
            users.push(user);
            return Promise.resolve();
        },

        findUserByEmail: (email: string): Promise<User | undefined> =>
            Promise.resolve(users.find((u) => u.email === email)),

        findUserById: (id: string): Promise<User | undefined> =>
            Promise.resolve(users.find((u) => u.id === id)),

        updateUser: (
            id: string,
            fields: Partial<Pick<User, "name" | "email" | "password">>,
        ): Promise<void> => {
            const idx = users.findIndex((u) => u.id === id);
            if (idx !== -1) {
                users[idx] = { ...users[idx]!, ...fields };
            }
            return Promise.resolve();
        },

        deleteUser: (id: string): Promise<void> => {
            const userIdx = users.findIndex((u) => u.id === id);
            if (userIdx !== -1) users.splice(userIdx, 1);
            const todoIndexes = todos
                .map((t, i) => (t.user_id === id ? i : -1))
                .filter((i) => i !== -1)
                .reverse();
            for (const i of todoIndexes) todos.splice(i, 1);
            return Promise.resolve();
        },

        getAllUserData: (userId: string): Promise<{ user: PublicUser; todos: TodoItem[] }> => {
            const user = users.find((u) => u.id === userId);
            if (!user) return Promise.reject(new Error(`User not found: ${userId}`));
            return Promise.resolve({
                user: userToPublicUser(user),
                todos: todos.filter((t) => t.user_id === userId),
            });
        },
    };
};

export default createInMemoryAdapter;
