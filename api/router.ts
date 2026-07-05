import { createRouter, publicQuery } from "./middleware";
import { booksRouter } from "./books";
import { campaignsRouter } from "./campaigns";
import { postsRouter } from "./posts";
import { mediaRouter } from "./media";
import { agentsRouter } from "./agents";
import { searchRouter } from "./search";
import { socialRouter } from "./social";
import { generateRouter } from "./generate";
import { composioRouter } from "./composio";
import { runtimeRouter } from "./runtime";
import { crewRouter } from "./crew";
import { cronRouter } from "./cron";
import { smartChatRouter } from "./smart-chat";
import { scratchPadRouter } from "./scratch-pad";
import { healthRouter } from "./health";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  books: booksRouter,
  campaigns: campaignsRouter,
  posts: postsRouter,
  media: mediaRouter,
  agents: agentsRouter,
  search: searchRouter,
  social: socialRouter,
  generate: generateRouter,
  composio: composioRouter,
  runtime: runtimeRouter,
  crew: crewRouter,
  cron: cronRouter,
  smart: smartChatRouter,
  scratchPad: scratchPadRouter,
  health: healthRouter,
});

export type AppRouter = typeof appRouter;
// deploy-trigger-1783221908
// deploy-trigger
