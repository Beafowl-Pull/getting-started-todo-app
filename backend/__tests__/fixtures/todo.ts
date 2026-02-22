import { TodoItem } from '../../src/types/todo';

export const todoFixtures: TodoItem[] = [
    { id: 'test-uuid-1', name: 'Buy groceries', completed: false, user_id: 'user-uuid-1' },
    { id: 'test-uuid-2', name: 'Do laundry', completed: true, user_id: 'user-uuid-1' },
];

export const sampleTodo: TodoItem = todoFixtures[0]!;
export const completedTodo: TodoItem = todoFixtures[1]!;
