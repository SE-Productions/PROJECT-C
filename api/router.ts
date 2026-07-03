import { createRouter, publicQuery } from "./middleware";
import { booksRouter } from "./books";
import { campaignsRouter } from "./campaigns";
import { postsRouter } from "./posts";
import { mediaRouter } from "./media";
import { agentsRouter } from "./agents";
import { searchRouter } from "./search";
import { socialRouter } from "./social";
import { generateRouter } from "./generate";

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
});

export type AppRouter = typeof appRouter;
