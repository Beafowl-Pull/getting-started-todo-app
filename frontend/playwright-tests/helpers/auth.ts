import type { Page } from '@playwright/test';

export const MOCK_USER = {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
    created_at: '2026-01-01T00:00:00.000Z',
};

// Build a fake JWT with exp far in the future (no signature validation on client)
const payloadB64 = Buffer.from(
    JSON.stringify({ sub: 'user-1', email: 'test@example.com', exp: 9999999999 }),
).toString('base64');
export const FAKE_TOKEN = `eyJhbGciOiJIUzI1NiJ9.${payloadB64}.fake-sig`;

/**
 * Simulates a logged-in session:
 * - Injects the fake JWT into localStorage before page load
 * - Mocks /api/me to return MOCK_USER
 */
export async function loginAs(page: Page, user = MOCK_USER): Promise<void> {
    await page.addInitScript((token) => {
        localStorage.setItem('auth_token', token);
    }, FAKE_TOKEN);

    await page.route('/api/me', (route) =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(user),
        }),
    );
}
