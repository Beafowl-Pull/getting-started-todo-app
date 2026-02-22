import { test, expect } from '@playwright/test';
import { loginAs, MOCK_USER, FAKE_TOKEN } from './helpers/auth';

async function mockUnauthenticated(page: import('@playwright/test').Page): Promise<void> {
    await page.route('/api/me', (route) => route.fulfill({ status: 401 }));
}

const MOCK_AUTH_RESPONSE = { token: FAKE_TOKEN, user: MOCK_USER };

test.describe('Auth screen', () => {
    test.beforeEach(async ({ page }): Promise<void> => {
        await mockUnauthenticated(page);
    });

    test('shows login form by default when unauthenticated', async ({ page }): Promise<void> => {
        await page.goto('/');

        await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
        await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
        await expect(page.getByPlaceholder('Password')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
    });

    test('does not show the todo app when unauthenticated', async ({ page }): Promise<void> => {
        await page.goto('/');

        await expect(page.getByPlaceholder('New Item')).not.toBeVisible();
    });

    test('switches to the register form when clicking "Register"', async ({ page }): Promise<void> => {
        await page.goto('/');

        await page.getByRole('button', { name: 'Register' }).click();

        await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();
        await expect(page.getByPlaceholder('Your name')).toBeVisible();
    });

    test('switches back to login form from register', async ({ page }): Promise<void> => {
        await page.goto('/');

        await page.getByRole('button', { name: 'Register' }).click();
        await page.getByRole('button', { name: 'Sign In' }).click();

        await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
    });
});

test.describe('Login', () => {
    test.beforeEach(async ({ page }): Promise<void> => {
        await mockUnauthenticated(page);
    });

    test('logs in successfully and shows the todo app', async ({ page }): Promise<void>  => {
        await page.route('/api/auth/login', (route): Promise<void> =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(MOCK_AUTH_RESPONSE),
            }),
        );
        await page.route('/api/items', (route): Promise<void> =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([]),
            }),
        );
        await page.route('/api/greeting', (route): Promise<void> =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ greeting: 'Hello!' }),
            }),
        );

        await page.goto('/');
        await page.getByPlaceholder('you@example.com').fill('test@example.com');
        await page.getByPlaceholder('Password').fill('password123');
        await page.getByRole('button', { name: 'Sign In' }).click();

        await expect(page.getByPlaceholder('New Item')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Test User' })).toBeVisible();
    });

    test('shows an error on invalid credentials', async ({ page }): Promise<void> => {
        await page.route('/api/auth/login', (route): Promise<void> =>
            route.fulfill({
                status: 401,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'Invalid credentials' }),
            }),
        );

        await page.goto('/');
        await page.getByPlaceholder('you@example.com').fill('wrong@example.com');
        await page.getByPlaceholder('Password').fill('wrongpassword');
        await page.getByRole('button', { name: 'Sign In' }).click();

        await expect(page.getByRole('alert')).toContainText('Invalid credentials');
        await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
    });

    test('shows "Signing in..." and disables the button while submitting', async ({ page }): Promise<void> => {
        let resolveRoute!: () => void;
        const routeBlocked = new Promise<void>((resolve) => {
            resolveRoute = resolve;
        });

        await page.route('/api/auth/login', async (route): Promise<void> => {
            await routeBlocked;
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(MOCK_AUTH_RESPONSE),
            });
        });
        await page.route('/api/items', (route): Promise<void> =>
            route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
        );
        await page.route('/api/greeting', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ greeting: 'Hi' }),
            }),
        );

        await page.goto('/');
        await page.getByPlaceholder('you@example.com').fill('test@example.com');
        await page.getByPlaceholder('Password').fill('password123');
        await page.getByRole('button', { name: 'Sign In' }).click();

        await expect(page.getByRole('button', { name: 'Signing in...' })).toBeDisabled();

        resolveRoute();

        await expect(page.getByPlaceholder('New Item')).toBeVisible();
    });
});

test.describe('Register', () => {
    test.beforeEach(async ({ page }): Promise<void> => {
        await mockUnauthenticated(page);
    });

    test('registers successfully and shows the todo app', async ({ page }): Promise<void> => {
        await page.route('/api/auth/register', (route) =>
            route.fulfill({
                status: 201,
                contentType: 'application/json',
                body: JSON.stringify(MOCK_AUTH_RESPONSE),
            }),
        );
        await page.route('/api/items', (route) =>
            route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
        );
        await page.route('/api/greeting', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ greeting: 'Hello!' }),
            }),
        );

        await page.goto('/');
        await page.getByRole('button', { name: 'Register' }).click();
        await page.getByPlaceholder('Your name').fill('Test User');
        await page.getByPlaceholder('you@example.com').fill('test@example.com');
        await page.getByPlaceholder('At least 8 characters').fill('password123');
        await page.getByRole('button', { name: 'Create Account' }).click();

        await expect(page.getByPlaceholder('New Item')).toBeVisible();
    });

    test('shows an error when email is already taken', async ({ page }): Promise<void> => {
        await page.route('/api/auth/register', (route) =>
            route.fulfill({
                status: 409,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'Email already in use' }),
            }),
        );

        await page.goto('/');
        await page.getByRole('button', { name: 'Register' }).click();
        await page.getByPlaceholder('Your name').fill('Test User');
        await page.getByPlaceholder('you@example.com').fill('taken@example.com');
        await page.getByPlaceholder('At least 8 characters').fill('password123');
        await page.getByRole('button', { name: 'Create Account' }).click();

        await expect(page.getByRole('alert')).toContainText('Email already in use');
        await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();
    });
});

test.describe('Logout', () => {
    test.beforeEach(async ({ page }): Promise<void> => {
        await loginAs(page);
        await page.route('/api/greeting', (route): Promise<void> =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ greeting: 'Hello!' }),
            }),
        );
        await page.route('/api/items', (route): Promise<void> =>
            route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
        );
    });

    test('clicking Sign Out returns to the auth screen', async ({ page }): Promise<void> => {
        await page.goto('/');

        await page.getByRole('button', { name: 'Test User' }).click();
        await page.locator('.dropdown-menu.show').getByText('Sign Out').click();

        await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
        await expect(page.getByPlaceholder('New Item')).not.toBeVisible();
    });
});

test.describe('GDPR export', () => {
    test.beforeEach(async ({ page }): Promise<void> => {
        await loginAs(page);
        await page.route('/api/greeting', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ greeting: 'Hello!' }),
            }),
        );
        await page.route('/api/items', (route): Promise<void> =>
            route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
        );
        await page.route('/api/me/export', (route): Promise<void> =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    exportedAt: new Date().toISOString(),
                    user: MOCK_USER,
                    todos: [],
                }),
            }),
        );
    });

    test('triggers a file download when clicking Export My Data', async ({ page }): Promise<void> => {
        await page.goto('/');

        const downloadPromise = page.waitForEvent('download');
        await page.getByRole('button', { name: 'Test User' }).click();
        await page.locator('.dropdown-menu.show').getByText(/export my data/i).click();
        const download = await downloadPromise;

        expect(download.suggestedFilename()).toMatch(/my-data-.+\.json/);
    });
});

test.describe('Delete account', () => {
    test.beforeEach(async ({ page }): Promise<void> => {
        await loginAs(page);
        await page.route('/api/greeting', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ greeting: 'Hello!' }),
            }),
        );
        await page.route('/api/items', (route) =>
            route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
        );
    });

    test('opens delete account modal', async ({ page }): Promise<void> => {
        await page.goto('/');

        await page.getByRole('button', { name: 'Test User' }).click();
        await page.locator('.dropdown-menu.show').getByText(/delete account/i).click();

        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.getByText(/permanently delete your account/i)).toBeVisible();
    });

    test('delete button is disabled until password is entered', async ({ page }): Promise<void> => {
        await page.goto('/');

        await page.getByRole('button', { name: 'Test User' }).click();
        await page.locator('.dropdown-menu.show').getByText(/delete account/i).click();

        await expect(page.getByRole('button', { name: /delete my account/i })).toBeDisabled();

        await page.getByPlaceholder(/your password/i).fill('password123');

        await expect(page.getByRole('button', { name: /delete my account/i })).toBeEnabled();
    });

    test('deletes account and shows auth screen on success', async ({ page }): Promise<void> => {
        await page.route('/api/me', async (route) => {
            if (route.request().method() === 'DELETE') {
                return route.fulfill({ status: 204 });
            }
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(MOCK_USER),
            });
        });

        await page.goto('/');

        await page.getByRole('button', { name: 'Test User' }).click();
        await page.locator('.dropdown-menu.show').getByText(/delete account/i).click();
        await page.getByPlaceholder(/your password/i).fill('password123');
        await page.getByRole('button', { name: /delete my account/i }).click();

        await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
    });

    test('shows error if password is wrong', async ({ page }): Promise<void> => {
        await page.route('/api/me', async (route) => {
            if (route.request().method() === 'DELETE') {
                return route.fulfill({
                    status: 403,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: 'Password is incorrect' }),
                });
            }
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(MOCK_USER),
            });
        });

        await page.goto('/');

        await page.getByRole('button', { name: 'Test User' }).click();
        await page.locator('.dropdown-menu.show').getByText(/delete account/i).click();
        await page.getByPlaceholder(/your password/i).fill('wrongpassword');
        await page.getByRole('button', { name: /delete my account/i }).click();

        await expect(page.getByRole('alert')).toContainText('Password is incorrect');
        await expect(page.getByRole('dialog')).toBeVisible();
    });
});
