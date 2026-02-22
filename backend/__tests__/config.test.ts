describe('validateConfig()', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('should not throw when MYSQL_HOST is not set (sqlite mode)', async (): Promise<void> => {
        process.env['JWT_SECRET'] = 'test-secret';
        delete process.env['MYSQL_HOST'];

        const { validateConfig } = await import('../src/config');
        expect(() => validateConfig()).not.toThrow();
    });

    it('should not throw when all MySQL env vars are set', async (): Promise<void> => {
        process.env['JWT_SECRET'] = 'test-secret';
        process.env['MYSQL_HOST'] = 'localhost';
        process.env['MYSQL_USER'] = 'user';
        process.env['MYSQL_PASSWORD'] = 'password';
        process.env['MYSQL_DB'] = 'todo_db';

        const { validateConfig } = await import('../src/config');
        expect(() => validateConfig()).not.toThrow();
    });

    it('should throw if JWT_SECRET is missing', async (): Promise<void> => {
        delete process.env['JWT_SECRET'];

        const { validateConfig } = await import('../src/config');
        expect(() => validateConfig()).toThrow('Missing required environment variable: JWT_SECRET');
    });

    it('should throw if MYSQL_HOST is set but MYSQL_USER is missing', async (): Promise<void> => {
        process.env['JWT_SECRET'] = 'test-secret';
        process.env['MYSQL_HOST'] = 'localhost';
        delete process.env['MYSQL_USER'];
        delete process.env['MYSQL_USER_FILE'];
        process.env['MYSQL_PASSWORD'] = 'password';
        process.env['MYSQL_DB'] = 'todo_db';

        const { validateConfig } = await import('../src/config');
        expect(() => validateConfig()).toThrow('Missing required config');
    });

    it('should accept file-based vars as alternative to env vars', async (): Promise<void> => {
        process.env['JWT_SECRET'] = 'test-secret';
        process.env['MYSQL_HOST'] = 'localhost';
        process.env['MYSQL_USER_FILE'] = '/run/secrets/user';
        delete process.env['MYSQL_USER'];
        process.env['MYSQL_PASSWORD'] = 'password';
        process.env['MYSQL_DB'] = 'todo_db';

        const { validateConfig } = await import('../src/config');
        expect(() => validateConfig()).not.toThrow();
    });
});