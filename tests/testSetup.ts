/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import schema from "../convex/schema";

export const modules = import.meta.glob("../convex/**/*.ts");

export function newTest() {
  const t = convexTest(schema, modules);
  rateLimiterTest.register(t, "rateLimiter");
  return t;
}
