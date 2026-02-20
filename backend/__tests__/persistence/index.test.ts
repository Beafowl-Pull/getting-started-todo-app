describe("persistence/index.ts", () => {
  beforeEach(() => {
    jest.resetModules(); // Reset module registry between each test
  });

  it("should load the sqlite adapter when MYSQL_HOST is not set", async () => {
    delete process.env.MYSQL_HOST;

    const sqlite = await import("../../src/persistence/sqlite");
    const { default: adapter } = await import("../../src/persistence");

    expect(adapter).toBe(sqlite.default);
  });

  it("should load the mysql adapter when MYSQL_HOST is set", async () => {
    process.env.MYSQL_HOST = "localhost";

    const mysql = await import("../../src/persistence/mysql");
    const { default: adapter } = await import("../../src/persistence");

    expect(adapter).toBe(mysql.default);

    delete process.env.MYSQL_HOST;
  });

  it("should export an adapter with the correct DbAdapter interface", async () => {
    delete process.env.MYSQL_HOST;

    const { default: adapter } = await import("../../src/persistence");

    expect(typeof adapter.init).toBe("function");
    expect(typeof adapter.teardown).toBe("function");
    expect(typeof adapter.getItems).toBe("function");
    expect(typeof adapter.getItem).toBe("function");
    expect(typeof adapter.storeItem).toBe("function");
    expect(typeof adapter.updateItem).toBe("function");
    expect(typeof adapter.removeItem).toBe("function");
  });
});
