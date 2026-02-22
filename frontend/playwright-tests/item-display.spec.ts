import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth';

const MOCK_ITEMS = [
    { id: '1', name: 'Buy groceries', completed: false, user_id: 'user-1' },
    { id: '2', name: 'Walk the dog', completed: true, user_id: 'user-1' },
];

test.describe('ItemDisplay', () => {
    test.beforeEach(async ({ page }) => {
        await loginAs(page);
        await page.route('/api/greeting', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ greeting: 'Hello!' }),
            }),
        );
        await page.route('/api/items', (route) => {
            if (route.request().method() === 'GET') {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify(MOCK_ITEMS),
                });
            }
            return route.continue();
        });
    });

    test('displays item names', async ({ page }) => {
        await page.goto('/');

        await expect(page.getByText('Buy groceries')).toBeVisible();
        await expect(page.getByText('Walk the dog')).toBeVisible();
    });

    test('applies the "completed" CSS class on completed items', async ({ page }) => {
        await page.goto('/');

        const completedItem = page.locator('.item.completed');
        await expect(completedItem).toHaveCount(1);
        await expect(completedItem).toContainText('Walk the dog');
    });

    test('does not apply the "completed" class on incomplete items', async ({ page }) => {
        await page.goto('/');

        const incompleteItem = page.locator('.item:not(.completed)');
        await expect(incompleteItem).toContainText('Buy groceries');
    });

    test('shows the correct aria-label on the toggle button for an incomplete item', async ({
        page,
    }) => {
        await page.goto('/');

        const toggleBtn = page
            .locator('.item')
            .filter({ hasText: 'Buy groceries' })
            .getByLabel('Mark item as complete');

        await expect(toggleBtn).toBeVisible();
    });

    test('shows the correct aria-label on the toggle button for a completed item', async ({
        page,
    }) => {
        await page.goto('/');

        const toggleBtn = page
            .locator('.item')
            .filter({ hasText: 'Walk the dog' })
            .getByLabel('Mark item as incomplete');

        await expect(toggleBtn).toBeVisible();
    });

    test('toggling an incomplete item marks it as complete', async ({ page }) => {
        await page.route('/api/items/1', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: '1',
                    name: 'Buy groceries',
                    completed: true,
                    user_id: 'user-1',
                }),
            }),
        );

        await page.goto('/');

        await page
            .locator('.item')
            .filter({ hasText: 'Buy groceries' })
            .getByLabel('Mark item as complete')
            .click();

        await expect(page.locator('.item.completed')).toHaveCount(2);
    });

    test('toggling a completed item marks it as incomplete', async ({ page }) => {
        await page.route('/api/items/2', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    id: '2',
                    name: 'Walk the dog',
                    completed: false,
                    user_id: 'user-1',
                }),
            }),
        );

        await page.goto('/');

        await page
            .locator('.item')
            .filter({ hasText: 'Walk the dog' })
            .getByLabel('Mark item as incomplete')
            .click();

        await expect(page.locator('.item.completed')).toHaveCount(0);
    });

    test('clicking "Remove Item" removes the item from the list', async ({ page }) => {
        await page.route('/api/items/1', (route) => {
            if (route.request().method() === 'DELETE') {
                return route.fulfill({ status: 200 });
            }
            return route.continue();
        });

        await page.goto('/');

        await expect(page.getByText('Buy groceries')).toBeVisible();

        await page
            .locator('.item')
            .filter({ hasText: 'Buy groceries' })
            .getByLabel('Remove "Buy groceries"')
            .click();

        await expect(page.getByText('Buy groceries')).not.toBeVisible();
        await expect(page.getByText('Walk the dog')).toBeVisible();
    });

    test('shows "No items yet!" after all items are removed', async ({ page }) => {
        await page.route('/api/items', (route) => {
            if (route.request().method() === 'GET') {
                return route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify([
                        { id: '1', name: 'Only item', completed: false, user_id: 'user-1' },
                    ]),
                });
            }
            return route.continue();
        });
        await page.route('/api/items/1', (route) => {
            if (route.request().method() === 'DELETE') {
                return route.fulfill({ status: 200 });
            }
            return route.continue();
        });

        await page.goto('/');

        await page.getByLabel('Remove "Only item"').click();

        await expect(page.getByText('No items yet! Add one above!')).toBeVisible();
    });
});
