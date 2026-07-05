// Crew Router — CrewAI-inspired multi-agent crew management
import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { runCrew } from "./runtime/crew";

export const crewRouter = createRouter({
  runCrew: authedQuery
    .input(z.object({
      goal: z.string().min(1),
      bookId: z.number().optional(),
      bookContext: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await runCrew(input.goal, input.bookId, input.bookContext);
      return {
        crewId: result.crewId,
        goal: result.goal,
        completed: result.completed,
        finalReport: result.finalReport,
        tasks: result.tasks.map((t) => ({
          id: t.id,
          description: t.description,
          assignedAgent: t.assignedAgent,
          status: t.status,
          output: t.output,
          error: t.error,
        })),
      };
    }),
});
