import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

test.describe('TodoListCard', () => {
    test.beforeEach(async ({ page }) => {
        await loginAs(page);
        await page.route('/api/greeting', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ greeting: 'Hello!' }),
            }),
        );
    });

    test('shows a loading indicator while fetching items', async ({ page }) => {
        let resolveRoute!: () => void;
        const routeBlocked = new Promise<void>((resolve) => {
            resolveRoute = resolve;
        });

        await page.route('/api/items', async (route) => {
            await routeBlocked;
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([]),
            });
        });

        await page.goto('/');

        await expect(page.getByText('Loading...')).toBeVisible();

        resolveRoute();

        await expect(page.getByText('Loading...')).not.toBeVisible();
    });

    test('shows an error alert when the API call fails', async ({ page }) => {
        await page.route('/api/items', (route) =>
            route.fulfill({ status: 500, statusText: 'Internal Server Error' }),
        );

        await page.goto('/');

        await expect(page.getByRole('alert')).toBeVisible();
        await expect(
            page.getByText('Failed to load items. Please try again later.'),
        ).toBeVisible();
    });

    test('shows "No items yet!" when the list is empty', async ({ page }) => {
        await page.route('/api/items', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([]),
            }),
        );

        await page.goto('/');

        await expect(page.getByText('No items yet! Add one above!')).toBeVisible();
    });

    test('renders a list of items returned by the API', async ({ page }) => {
        await page.route('/api/items', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    { id: '1', name: 'Buy groceries', completed: false },
                    { id: '2', name: 'Walk the dog', completed: false },
                    { id: '3', name: 'Read a book', completed: true },
                ]),
            }),
        );

        await page.goto('/');

        await expect(page.getByText('Buy groceries')).toBeVisible();
        await expect(page.getByText('Walk the dog')).toBeVisible();
        await expect(page.getByText('Read a book')).toBeVisible();
    });

    test('does not show "No items yet!" when items are present', async ({ page }) => {
        await page.route('/api/items', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([{ id: '1', name: 'Buy groceries', completed: false }]),
            }),
        );

        await page.goto('/');

        await expect(page.getByText('No items yet! Add one above!')).not.toBeVisible();
    });

    test('renders the AddItemForm alongside the items', async ({ page }) => {
        await page.route('/api/items', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([{ id: '1', name: 'Buy groceries', completed: false }]),
            }),
        );

        await page.goto('/');

        await expect(page.getByPlaceholder('New Item')).toBeVisible();
        await expect(page.getByText('Buy groceries')).toBeVisible();
    });
});
