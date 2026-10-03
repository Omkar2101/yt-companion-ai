import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  fastApiUrl: process.env.FASTAPI_URL || "http://127.0.0.1:8000",
  databaseUrl: process.env.DATABASE_URL || "",
};

export default config;
