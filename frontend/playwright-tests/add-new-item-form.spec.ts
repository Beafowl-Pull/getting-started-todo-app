import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

test.describe('AddNewItemForm', () => {
    test.beforeEach(async ({ page }): Promise<void> => {
        await loginAs(page);
        await page.route(
            '/api/greeting',
            (route): Promise<void> =>
                route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({ greeting: 'Hello!' }),
                }),
        );
        await page.route('/api/items', (route): Promise<void> => {
            if (route.request().method() === 'GET') {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([]),
                });
            }
            return route.continue();
        });
    });

    test('the "Add Item" button is disabled when the input is empty', async ({
        page,
    }): Promise<void> => {
        await page.goto('/');

        await expect(page.getByRole('button', { name: 'Add Item' })).toBeDisabled();
    });

    test('the "Add Item" button is disabled when the input contains only whitespace', async ({
        page,
    }): Promise<void> => {
        await page.goto('/');

        await page.getByPlaceholder('New Item').fill('   ');

        await expect(page.getByRole('button', { name: 'Add Item' })).toBeDisabled();
    });

    test('the "Add Item" button is enabled when the input has text', async ({
        page,
    }): Promise<void> => {
        await page.goto('/');

        await page.getByPlaceholder('New Item').fill('Buy milk');

        await expect(page.getByRole('button', { name: 'Add Item' })).toBeEnabled();
    });

    test('adds a new item and clears the input on success', async ({ page }): Promise<void> => {
        await page.route('/api/items', (route): Promise<void> => {
            if (route.request().method() === 'POST') {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        id: '99',
                        name: 'Buy milk',
                        completed: false,
                        user_id: 'user-1',
                    }),
                });
            }
            return route.fallback();
        });

        await page.goto('/');

        await page.getByPlaceholder('New Item').fill('Buy milk');
        await page.getByRole('button', { name: 'Add Item' }).click();

        await expect(page.getByText('Buy milk')).toBeVisible();
        await expect(page.getByPlaceholder('New Item')).toHaveValue('');
    });

    test('shows "Adding..." and disables the button while submitting', async ({
        page,
    }): Promise<void> => {
        let resolveRoute!: () => void;
        const routeBlocked = new Promise<void>((resolve) => {
            resolveRoute = resolve;
        });

        await page.route('/api/items', async (route): Promise<void> => {
            if (route.request().method() === 'POST') {
                await routeBlocked;
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        id: '99',
                        name: 'Buy milk',
                        completed: false,
                        user_id: 'user-1',
                    }),
                });
            }
            return route.fallback();
        });

        await page.goto('/');

        await page.getByPlaceholder('New Item').fill('Buy milk');
        await page.getByRole('button', { name: 'Add Item' }).click();

        await expect(page.getByRole('button', { name: 'Adding...' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Adding...' })).toBeDisabled();
        await expect(page.getByPlaceholder('New Item')).toBeDisabled();

        resolveRoute();

        await expect(page.getByRole('button', { name: 'Add Item' })).toBeVisible();
    });

    test('shows an error message when the API call fails', async ({ page }): Promise<void> => {
        await page.route('/api/items', (route): Promise<void> => {
            if (route.request().method() === 'POST') {
                return route.fulfill({ status: 500 });
            }
            return route.fallback();
        });

        await page.goto('/');

        await page.getByPlaceholder('New Item').fill('Buy milk');
        await page.getByRole('button', { name: 'Add Item' }).click();

        const alert = page.getByRole('alert');
        await expect(alert).toBeVisible();
        await expect(alert).toContainText('Failed to add item');
    });

    test('the input is re-enabled and "Add Item" button restored after an error', async ({
        page,
    }): Promise<void> => {
        await page.route('/api/items', (route): Promise<void> => {
            if (route.request().method() === 'POST') {
                return route.fulfill({ status: 500 });
            }
            return route.fallback();
        });

        await page.goto('/');

        await page.getByPlaceholder('New Item').fill('Buy milk');
        await page.getByRole('button', { name: 'Add Item' }).click();

        await expect(page.getByRole('button', { name: 'Add Item' })).toBeVisible();
        await expect(page.getByPlaceholder('New Item')).toBeEnabled();
    });
});
