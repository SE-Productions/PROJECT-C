import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const createRouter = t.router;
export const publicQuery = t.procedure;

// Auth check — throws proper TRPCError that tRPC client can handle
const authedMiddleware = t.middleware(async ({ ctx, next }) => {
  // In dev, skip auth
  if (process.env.NODE_ENV !== "production") {
    return next();
  }

  // If no APP_SECRET configured, allow all (setup period)
  const appSecret = process.env.APP_SECRET;
  if (!appSecret) {
    return next();
  }

  const apiKey = ctx.req.headers.get("x-api-key");
  if (!apiKey || apiKey !== appSecret) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid or missing x-api-key header. Set it in Settings → App Authentication.",
    });
  }

  return next();
});

export const authedQuery = t.procedure.use(authedMiddleware);
