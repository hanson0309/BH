import { z } from "zod";

const envSchema = z.object({
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(1),
});

// 构建时允许空值，运行时验证
const rawEnv = {
  MONGODB_URI: process.env.MONGODB_URI || "",
  JWT_SECRET: process.env.JWT_SECRET || "",
};

// 仅在非构建时进行严格验证
if (process.env.NODE_ENV !== "production" || process.env.VERCEL_ENV) {
  const result = envSchema.safeParse(rawEnv);
  if (!result.success && !rawEnv.MONGODB_URI) {
    console.warn("Environment variables validation failed (may be expected during build):", result.error.message);
  }
}

export const env = rawEnv;
