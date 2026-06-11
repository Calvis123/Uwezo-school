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
  AUTH_SECRET: required("AUTH_SECRET"),
  BACKEND_URL: process.env.BACKEND_URL ?? "http://localhost:4000",
  NODE_ENV: process.env.NODE_ENV ?? "development",
};
