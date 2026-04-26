function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Add it to your .env (see .env.example).`
    );
  }
  return value;
}

export const env = {
  DATABASE_URL: required("DATABASE_URL"),
  DIRECT_URL: required("DIRECT_URL"),
  AUTH_SECRET: required("AUTH_SECRET"),
  NODE_ENV: process.env.NODE_ENV ?? "development",
};
