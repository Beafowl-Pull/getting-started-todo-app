import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

test.describe('Greeting', () => {
    test.beforeEach(async ({ page }) => {
        await loginAs(page);
        await page.route('/api/items', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([]),
            }),
        );
    });

    test('displays the greeting returned by the API', async ({ page }) => {
        await page.route('/api/greeting', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ greeting: 'Hello, World!' }),
            }),
        );

        await page.goto('/');

        await expect(page.getByRole('heading', { name: 'Hello, World!' })).toBeVisible();
    });

    test('renders the greeting as an h1 element', async ({ page }) => {
        await page.route('/api/greeting', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ greeting: 'Bonjour!' }),
            }),
        );

        await page.goto('/');

        const heading = page.getByRole('heading', { level: 1, name: 'Bonjour!' });
        await expect(heading).toBeVisible();
    });

    test('displays an error message when the API returns an error', async ({ page }) => {
        await page.route('/api/greeting', (route) =>
            route.fulfill({
                status: 500,
                statusText: 'Internal Server Error',
            }),
        );

        await page.goto('/');

        const error = page.locator('p.text-danger').first();
        await expect(error).toBeVisible();
        await expect(error).toContainText('Failed to fetch greeting');
    });

    test('displays an error message when the network request fails', async ({ page }) => {
        await page.route('/api/greeting', (route) => route.abort());

        await page.goto('/');

        const error = page.locator('p.text-danger').first();
        await expect(error).toBeVisible();
    });

    test('does not render an h1 while the greeting is loading', async ({ page }) => {
        let resolveRoute!: () => void;
        const routeBlocked = new Promise<void>((resolve) => {
            resolveRoute = resolve;
        });

        await page.route('/api/greeting', async (route) => {
            await routeBlocked;
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ greeting: 'Hello!' }),
            });
        });

        await page.goto('/');

        await expect(page.getByRole('heading', { level: 1 })).not.toBeVisible();

        resolveRoute();

        await expect(page.getByRole('heading', { name: 'Hello!' })).toBeVisible();
    });
});
