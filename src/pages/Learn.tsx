import { useState } from "react";
import {
  Bot,
  Image,
  Share2,
  Megaphone,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Play,
  Lightbulb,
  Zap,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import PageHero from "@/components/PageHero";

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  content: React.ReactNode;
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="h-8 w-8 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-sm font-bold shrink-0">
          {number}
        </div>
        <div className="w-px h-full bg-neutral-800 my-2" />
      </div>
      <div className="pb-6">
        <h4 className="text-white font-medium mb-2">{title}</h4>
        <div className="text-sm text-neutral-400">{children}</div>
      </div>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 p-4 rounded-lg bg-sky-500/10 border border-sky-500/20 my-3">
      <Lightbulb className="h-5 w-5 text-sky-500 shrink-0 mt-0.5" />
      <div className="text-sm text-sky-200">{children}</div>
    </div>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 my-3">
      <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
      <div className="text-sm text-amber-200">{children}</div>
    </div>
  );
}

export default function Learn() {
  const [openSection, setOpenSection] = useState<string>("getting-started");

  const sections: Section[] = [
    {
      id: "getting-started",
      title: "Getting Started",
      icon: <Zap className="h-5 w-5" />,
      color: "text-amber-500",
      content: (
        <div className="space-y-2">
          <p className="text-neutral-300 mb-4">
            AURA Publishing is an AI-powered platform for managing book marketing campaigns across social media. Here is how to get up and running in minutes.
          </p>

          <Step number={1} title="Add Your First Book">
            Go to the <strong className="text-white">Books</strong> page and click{" "}
            <span className="text-amber-500">Add Book</span>. Enter the title, author, genre, and description. This is the foundation everything else builds on.
          </Step>

          <Step number={2} title="Connect Social Media Accounts">
            Go to <strong className="text-white">Settings</strong> and click{" "}
            <span className="text-emerald-500">Connect</span> next to each platform (Instagram, TikTok, Facebook, X, YouTube, Reddit). This opens Composio where you authenticate each account.
          </Step>

          <Step number={3} title="Create a Campaign">
            Go to <strong className="text-white">Campaigns</strong> and click{" "}
            <span className="text-amber-500">New Campaign</span>. Select your book, choose platforms, set dates. A campaign organizes all your marketing activity.
          </Step>

          <Step number={4} title="Launch AI Agents">
            Go to <strong className="text-white">Agent Hub</strong>, select your book from the dropdown, and click{" "}
            <span className="text-amber-500">Run All Agents</span>. This activates all 4 AI agents simultaneously to plan your marketing strategy.
          </Step>

          <Step number={5} title="Schedule & Publish Posts">
            Go to <strong className="text-white">Scheduler</strong> to create posts for each platform. Set a schedule or click the send button to publish immediately via Composio.
          </Step>

          <Tip>
            You do not need to connect all social platforms at once. Start with 1-2 platforms, get comfortable, then expand.
          </Tip>
        </div>
      ),
    },
    {
      id: "agents",
      title: "AI Agents Explained",
      icon: <Bot className="h-5 w-5" />,
      color: "text-sky-500",
      content: (
        <div className="space-y-4">
          <p className="text-neutral-300">
            AURA has 4 specialized AI agents, each powered by Gemini 2.0 Flash. They work independently or together through the orchestration system.
          </p>

          <div className="grid gap-3">
            {[
              {
                name: "Planner Agent",
                color: "text-amber-500",
                bg: "bg-amber-500/10",
                border: "border-amber-500/20",
                desc: "The strategist. Creates marketing plans, sets timelines, coordinates the other agents. Ask it to build a full launch strategy or refine your campaign objectives.",
                example: "Create a 30-day launch plan for my mystery novel targeting readers aged 25-45.",
              },
              {
                name: "Research Agent",
                color: "text-sky-500",
                bg: "bg-sky-500/10",
                border: "border-sky-500/20",
                desc: "The investigator. Searches the web for market trends, competitor analysis, hashtag trends, and audience insights using Firecrawl web search.",
                example: "What are the top trending hashtags for book launches on Instagram this month?",
              },
              {
                name: "Media Agent",
                color: "text-violet-500",
                bg: "bg-violet-500/10",
                border: "border-violet-500/20",
                desc: "The creative director. Generates detailed creative briefs for images and videos. Describes exactly what visuals should be created for maximum impact.",
                example: "Design a book cover reveal animation concept for TikTok with dramatic lighting.",
              },
              {
                name: "Social Agent",
                color: "text-emerald-500",
                bg: "bg-emerald-500/10",
                border: "border-emerald-500/20",
                desc: "The copywriter. Crafts platform-optimized posts for all 6 social networks. Knows the best formats, lengths, and styles for each platform.",
                example: "Write 5 Instagram captions for my sci-fi book launch with relevant hashtags.",
              },
            ].map((agent) => (
              <div key={agent.name} className={`p-4 rounded-lg border ${agent.border} ${agent.bg}`}>
                <h4 className={`font-semibold ${agent.color} mb-1`}>{agent.name}</h4>
                <p className="text-sm text-neutral-300 mb-2">{agent.desc}</p>
                <div className="text-xs text-neutral-500">
                  <span className="text-neutral-400">Try asking: </span>
                  <span className="italic">{agent.example}</span>
                </div>
              </div>
            ))}
          </div>

          <Tip>
            Select a book from the dropdown in Agent Hub before chatting. This gives the agent full context about your book for better responses.
          </Tip>

          <Warning>
            The "Run All Agents" button creates tasks for all 4 agents at once. Check the Dashboard to track their progress.
          </Warning>
        </div>
      ),
    },
    {
      id: "media",
      title: "AI Image & Video Generation",
      icon: <Image className="h-5 w-5" />,
      color: "text-violet-500",
      content: (
        <div className="space-y-4">
          <p className="text-neutral-300">
            Generate promotional visuals for your books using AI. The Media page handles both static images and video content.
          </p>

          <h4 className="text-white font-medium flex items-center gap-2">
            <Image className="h-4 w-4 text-violet-500" />
            Image Generation
          </h4>
          <ol className="list-decimal list-inside text-sm text-neutral-400 space-y-2 ml-2">
            <li>Go to <strong className="text-white">Media</strong> and click <span className="text-violet-500">Generate Media</span>.</li>
            <li>Select <strong className="text-white">Image</strong> as the type.</li>
            <li>Write a detailed prompt describing what you want (e.g., "A dramatic dark fantasy book cover with a dragon silhouette against a blood-red moon").</li>
            <li>Optionally link it to a book and select a target platform for optimized dimensions.</li>
            <li>Click <span className="text-violet-500">Generate</span>. The AI creates the image using Stable Diffusion XL via NVIDIA.</li>
            <li>Preview the result and click <span className="text-emerald-500">Save to Gallery</span> to store it.</li>
          </ol>

          <h4 className="text-white font-medium flex items-center gap-2 mt-4">
            <Play className="h-4 w-4 text-red-500" />
            Video Generation
          </h4>
          <ol className="list-decimal list-inside text-sm text-neutral-400 space-y-2 ml-2">
            <li>In the Media modal, select <strong className="text-white">Video</strong> as the type.</li>
            <li>Write a prompt describing the video (e.g., "A cinematic book trailer scene with floating pages and glowing text").</li>
            <li>Click <span className="text-violet-500">Generate</span> to create a 5-8 second AI video.</li>
            <li>Preview and save to your gallery for use in social posts.</li>
          </ol>

          <Tip>
            Be specific in your prompts. Include style references (cinematic, anime, photorealistic), mood (dramatic, cozy, mysterious), and key visual elements.
          </Tip>

          <Warning>
            Video generation takes 1-2 minutes. Do not close the modal while processing. The gallery shows a "generating" status until complete.
          </Warning>
        </div>
      ),
    },
    {
      id: "social",
      title: "Social Media Publishing",
      icon: <Share2 className="h-5 w-5" />,
      color: "text-emerald-500",
      content: (
        <div className="space-y-4">
          <p className="text-neutral-300">
            Create, schedule, and publish content to 6 social platforms through Composio integration.
          </p>

          <h4 className="text-white font-medium">Supported Platforms</h4>
          <div className="grid grid-cols-2 gap-2">
            {[
              { name: "Instagram", color: "text-pink-500", note: "Photos, carousels, Reels (video)" },
              { name: "TikTok", color: "text-cyan-400", note: "Short-form video posts" },
              { name: "Facebook", color: "text-blue-500", note: "Feed posts, stories" },
              { name: "X (Twitter)", color: "text-sky-400", note: "Text posts, images, threads" },
              { name: "YouTube", color: "text-red-500", note: "Video uploads, Shorts" },
              { name: "Reddit", color: "text-orange-500", note: "Subreddit posts, AMAs" },
            ].map((p) => (
              <div key={p.name} className="p-3 rounded-lg bg-neutral-800/50 border border-neutral-800">
                <div className={`font-medium ${p.color} text-sm`}>{p.name}</div>
                <div className="text-xs text-neutral-500">{p.note}</div>
              </div>
            ))}
          </div>

          <h4 className="text-white font-medium mt-4">Publishing Workflow</h4>
          <Step number={1} title="Create a Post">
            In the Scheduler, click <span className="text-emerald-500">New Post</span>, select your book, platform, and write content. You can also attach media from your gallery.
          </Step>
          <Step number={2} title="Schedule or Draft">
            Pick a date/time to schedule, or leave blank to save as a draft. Drafts can be edited before publishing.
          </Step>
          <Step number={3} title="Publish">
            Click the <span className="text-emerald-500">send icon</span> to publish immediately via Composio, or let the scheduler handle it automatically.
          </Step>

          <Tip>
            Best posting times: Instagram (11am-1pm), TikTok (7pm-9pm), X (8am-10am), Facebook (1pm-3pm). All times are local to your audience.
          </Tip>
        </div>
      ),
    },
    {
      id: "campaigns",
      title: "Campaign Management",
      icon: <Megaphone className="h-5 w-5" />,
      color: "text-rose-500",
      content: (
        <div className="space-y-4">
          <p className="text-neutral-300">
            Campaigns organize all marketing activity around a single book. Think of them as containers for posts, media, and agent tasks.
          </p>

          <h4 className="text-white font-medium">Campaign Objectives</h4>
          <div className="grid gap-2">
            {[
              { name: "Brand Awareness", desc: "Get your book in front of as many eyes as possible. Focus on reach and impressions." },
              { name: "Engagement", desc: "Drive likes, comments, shares, and saves. Best for building a community." },
              { name: "Sales", desc: "Convert followers into buyers. Use strong CTAs and promotional content." },
              { name: "Book Launch", desc: "The full-court press. All agents active, daily posts, countdown content." },
            ].map((o) => (
              <div key={o.name} className="p-3 rounded-lg bg-neutral-800/50 border border-neutral-800">
                <div className="text-white font-medium text-sm">{o.name}</div>
                <div className="text-xs text-neutral-400">{o.desc}</div>
              </div>
            ))}
          </div>

          <h4 className="text-white font-medium mt-4">Lifecycle</h4>
          <Step number={1} title="Draft">
            Plan your campaign. Select platforms, set dates, write descriptions. Nothing is public yet.
          </Step>
          <Step number={2} title="Active">
            Campaign is running. Posts go out on schedule. Agents are processing tasks. You can pause anytime.
          </Step>
          <Step number={3} title="Paused">
            Temporarily stopped. All scheduled posts are held. Resume when ready.
          </Step>
          <Step number={4} title="Completed">
            Campaign finished. Review analytics in the Scheduler to see what worked.
          </Step>
        </div>
      ),
    },
    {
      id: "troubleshooting",
      title: "Troubleshooting",
      icon: <AlertCircle className="h-5 w-5" />,
      color: "text-red-500",
      content: (
        <div className="space-y-4">
          <h4 className="text-white font-medium">Common Issues</h4>

          <div className="space-y-3">
            {[
              {
                problem: "Social post failed to publish",
                solution: "Check that your social account is still connected in Settings. Composio tokens expire and need to be refreshed. Re-authenticate if needed.",
              },
              {
                problem: "Agent responses are slow",
                solution: "Gemini API can be slow during peak hours. Responses typically take 5-15 seconds. If it times out, the agent falls back to a pre-generated strategy.",
              },
              {
                problem: "Image generation not working",
                solution: "Verify your NVIDIA API key is set correctly in the .env file (or Render dashboard). The key should start with nvapi-.",
              },
              {
                problem: "Video generation times out",
                solution: "Video generation can take 1-2 minutes. Do not close the modal. If it fails, try a simpler prompt with fewer details.",
              },
              {
                problem: "Database connection error",
                solution: "Check that DATABASE_URL is set correctly. The MySQL database should be accessible from your deployment region.",
              },
              {
                problem: "Campaign posts not scheduling",
                solution: "Ensure the campaign status is set to Active. Draft and Paused campaigns will not publish scheduled posts.",
              },
            ].map((item) => (
              <div key={item.problem} className="p-4 rounded-lg bg-neutral-800/50 border border-neutral-800">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-white font-medium text-sm">{item.problem}</span>
                </div>
                <p className="text-sm text-neutral-400 ml-6">{item.solution}</p>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mt-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span className="text-emerald-400 font-medium">Still stuck?</span>
            </div>
            <p className="text-sm text-neutral-300 ml-7">
              All API keys and settings can be verified on the Settings page. If a platform will not connect, try disconnecting and reconnecting it via Composio directly at{" "}
              <a
                href="https://app.composio.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 hover:underline inline-flex items-center gap-1"
              >
                app.composio.dev <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHero
        image="/images/hero-learn.jpg"
        title="Learn AURA"
        subtitle="Everything you need to master AURA Publishing — from your first book to your first viral post."
        height="md"
      />

      {/* Quick Start Banner */}
      <div className="p-5 rounded-xl bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/20 mb-8">
        <div className="flex items-start gap-4">
          <Sparkles className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-white font-semibold mb-1">Quick Start Guide</h3>
            <p className="text-sm text-neutral-400 mb-3">
              New to AURA? Follow these 5 steps to go from zero to your first published post.
            </p>
            <div className="flex flex-wrap gap-2">
              {["Add Book", "Connect Social", "Create Campaign", "Run Agents", "Publish"].map((step, i) => (
                <div key={step} className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 font-medium">
                    {i + 1}. {step}
                  </span>
                  {i < 4 && <ChevronRight className="h-3 w-3 text-neutral-600" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Accordion Sections */}
      <div className="space-y-2">
        {sections.map((section) => {
          const isOpen = openSection === section.id;
          return (
            <div
              key={section.id}
              className={cn(
                "rounded-xl border transition-colors",
                isOpen
                  ? "bg-neutral-900 border-neutral-700"
                  : "bg-neutral-900/50 border-neutral-800 hover:border-neutral-700"
              )}
            >
              <button
                onClick={() => setOpenSection(isOpen ? "" : section.id)}
                className="w-full flex items-center gap-3 p-4 text-left"
              >
                <div className={cn("p-1.5 rounded-md", section.color.replace("text-", "bg-").replace("500", "500/10"))}>
                  <span className={section.color}>{section.icon}</span>
                </div>
                <span className={cn("font-medium flex-1", isOpen ? "text-white" : "text-neutral-300")}>
                  {section.title}
                </span>
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-neutral-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-neutral-500" />
                )}
              </button>
              {isOpen && (
                <div className="px-4 pb-4 border-t border-neutral-800/50 pt-4">
                  {section.content}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-xs text-neutral-600">
          AURA Publishing v1.0.0 — Built with React 19, tRPC, Drizzle ORM, Gemini AI, and Composio.
        </p>
      </div>
    </div>
  );
}
