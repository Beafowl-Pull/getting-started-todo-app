/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-db-in-routes',
      comment: 'Routes must not import DB adapters directly — use the persistence interface',
      severity: 'error',
      from: { path: '^src/routes' },
      to: { path: '^src/persistence/(sqlite|mysql)' },
    },
    {
      name: 'no-db-in-middleware',
      comment: 'Middleware must not import DB adapters directly',
      severity: 'error',
      from: { path: '^src/middleware' },
      to: { path: '^src/persistence/(sqlite|mysql)' },
    },
    {
      name: 'no-circular',
      comment: 'No circular dependencies allowed',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsConfig: {
      fileName: 'tsconfig.json',
    },
    reporterOptions: {
      text: {
        highlightFocused: true,
      },
    },
  },
};
