import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { posts, agentTasks } from "@db/schema";
import { eq } from "drizzle-orm";
import { getInsertId } from "./lib/db-utils";

const COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY;

async function callComposio(action: string, params: Record<string, any>) {
  const response = await fetch(`https://backend.composio.dev/api/v2/actions/${action}/execute`, {
    method: "POST",
    headers: {
      "x-api-key": COMPOSIO_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      appName: action.split("_")[0].toUpperCase(),
      input: params,
      entityId: "default",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Composio error: ${error}`);
  }

  return response.json();
}

export const socialRouter = createRouter({
  publish: publicQuery
    .input(z.object({
      postId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();

      // Get post details
      const postResult = await db.select().from(posts).where(eq(posts.id, input.postId));
      const post = postResult[0];
      if (!post) throw new Error("Post not found");
      if (!COMPOSIO_API_KEY) throw new Error("Composio API key not configured");

      // Create agent task
      const taskResult = await db.insert(agentTasks).values({
        agentType: "social",
        bookId: post.bookId,
        task: `Publishing to ${post.platform}: ${post.content.substring(0, 100)}`,
        status: "running",
      });
      const taskId = Number(getInsertId(taskResult));

      try {
        let result: any;

        switch (post.platform) {
          case "instagram":
            // Note: Instagram requires OAuth connected entity
            result = await callComposio("INSTAGRAM_PUBLISH_PHOTO", {
              caption: post.content,
              media_type: "PHOTO",
            });
            break;

          case "x":
            result = await callComposio("TWITTER_POST_TWEET", {
              text: post.content,
            });
            break;

          case "facebook":
            result = await callComposio("FACEBOOK_POST_TO_FEED", {
              message: post.content,
            });
            break;

          case "reddit":
            result = await callComposio("REDDIT_SUBMIT_POST", {
              title: post.content.substring(0, 100),
              text: post.content,
              subreddit: "books",
            });
            break;

          case "tiktok":
          case "youtube":
            // Video platforms require video upload flow
            result = { scheduled: true, note: "Video upload requires manual file upload. Post content saved." };
            break;

          default:
            throw new Error(`Unsupported platform: ${post.platform}`);
        }

        // Update post as published
        await db.update(posts).set({
          status: "published",
          publishedAt: new Date(),
          composioActionId: result?.id ?? null,
          updatedAt: new Date(),
        }).where(eq(posts.id, input.postId));

        // Update task
        await db.update(agentTasks).set({
          status: "completed",
          output: JSON.stringify(result),
          completedAt: new Date(),
        }).where(eq(agentTasks.id, taskId));

        return { success: true, result };
      } catch (error: any) {
        // Update task as failed
        await db.update(agentTasks).set({
          status: "failed",
          error: error.message,
          completedAt: new Date(),
        }).where(eq(agentTasks.id, taskId));

        // Update post as failed
        await db.update(posts).set({
          status: "failed",
          updatedAt: new Date(),
        }).where(eq(posts.id, input.postId));

        throw error;
      }
    }),

  schedule: publicQuery
    .input(z.object({
      postId: z.number(),
      scheduledAt: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();

      await db.update(posts).set({
        status: "scheduled",
        scheduledAt: new Date(input.scheduledAt),
        updatedAt: new Date(),
      }).where(eq(posts.id, input.postId));

      return { success: true };
    }),

  getStatus: publicQuery
    .input(z.object({
      postId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db.select().from(posts).where(eq(posts.id, input.postId));
      return result[0]?.status ?? "unknown";
    }),
});
