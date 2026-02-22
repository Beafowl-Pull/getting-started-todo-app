import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

test.describe('App', () => {
    test.beforeEach(async ({ page }): Promise<void> => {
        await loginAs(page);
        await page.route(
            '/api/greeting',
            (route): Promise<void> =>
                route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ greeting: 'Welcome to your Todo App!' }),
                }),
        );
        await page.route(
            '/api/items',
            (route): Promise<void> =>
                route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([]),
                }),
        );
    });

    test('has the correct page title', async ({ page }): Promise<void> => {
        await page.goto('/');

        await expect(page).toHaveTitle('Todo App');
    });

    test('renders the Greeting component', async ({ page }): Promise<void> => {
        await page.goto('/');

        await expect(
            page.getByRole('heading', { name: 'Welcome to your Todo App!' }),
        ).toBeVisible();
    });

    test('renders the TodoListCard with the add form', async ({ page }): Promise<void> => {
        await page.goto('/');

        await expect(page.getByPlaceholder('New Item')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Add Item' })).toBeVisible();
    });

    test('renders both Greeting and TodoListCard together', async ({ page }): Promise<void> => {
        await page.goto('/');

        await expect(
            page.getByRole('heading', { name: 'Welcome to your Todo App!' }),
        ).toBeVisible();
        await expect(page.getByPlaceholder('New Item')).toBeVisible();
    });

    test('shows the user menu with the user name', async ({ page }): Promise<void> => {
        await page.goto('/');

        await expect(page.getByRole('button', { name: 'Test User' })).toBeVisible();
    });
});
