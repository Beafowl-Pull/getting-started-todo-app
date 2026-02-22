const requireEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {throw new Error(`Missing required environment variable: ${key}`);}
  return value;
};

export const config = {
  port: parseInt(process.env["PORT"] ?? "3000", 10),
  nodeEnv: process.env["NODE_ENV"] ?? "development",
  mysql: {
    host: process.env["MYSQL_HOST"],
    hostFile: process.env["MYSQL_HOST_FILE"],
    user: process.env["MYSQL_USER"],
    userFile: process.env["MYSQL_USER_FILE"],
    password: process.env["MYSQL_PASSWORD"],
    passwordFile: process.env["MYSQL_PASSWORD_FILE"],
    database: process.env["MYSQL_DB"],
    databaseFile: process.env["MYSQL_DB_FILE"],
  },
  sqlite: {
    dbLocation: process.env["SQLITE_DB_LOCATION"] ?? "/etc/todos/todo.db",
  },
  get jwt(): { secret: string | undefined; expiresIn: string } {
    return {
      secret: process.env["JWT_SECRET"],
      expiresIn: process.env["JWT_EXPIRES_IN"] ?? "15m",
    };
  },
};

// Each tuple is [envVar, fileVar] — at least one must be defined
const MYSQL_REQUIRED_PAIRS: [string, string][] = [
  ["MYSQL_HOST", "MYSQL_HOST_FILE"],
  ["MYSQL_USER", "MYSQL_USER_FILE"],
  ["MYSQL_PASSWORD", "MYSQL_PASSWORD_FILE"],
  ["MYSQL_DB", "MYSQL_DB_FILE"],
];

export const validateConfig = (): void => {
  if (!process.env["JWT_SECRET"]) {
    throw new Error("Missing required environment variable: JWT_SECRET");
  }

  if (!process.env["MYSQL_HOST"]) {return;}

  for (const [envVar, fileVar] of MYSQL_REQUIRED_PAIRS) {
    const hasEnv = Boolean(process.env[envVar]);
    const hasFile = Boolean(process.env[fileVar]);

    if (!hasEnv && !hasFile) {
      throw new Error(`Missing required config: set ${envVar} or ${fileVar}`);
    }
  }
};

export { requireEnv };
