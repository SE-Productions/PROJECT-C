import { trpc } from "@/providers/trpc";
import {
  BookOpen,
  Megaphone,
  FileText,
  Image,
  TrendingUp,
  Activity,
  Bot,
  CalendarDays,
} from "lucide-react";
import { Link } from "react-router";

export default function Dashboard() {
  const { data: books } = trpc.books.list.useQuery();
  const { data: campaigns } = trpc.campaigns.list.useQuery();
  const { data: posts } = trpc.posts.list.useQuery();
  const { data: media } = trpc.media.list.useQuery();
  const { data: tasks } = trpc.agents.listTasks.useQuery();

  const stats = [
    {
      label: "Books",
      value: books?.length ?? 0,
      icon: BookOpen,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      link: "/books",
    },
    {
      label: "Campaigns",
      value: campaigns?.length ?? 0,
      icon: Megaphone,
      color: "text-sky-500",
      bg: "bg-sky-500/10",
      link: "/campaigns",
    },
    {
      label: "Posts",
      value: posts?.length ?? 0,
      icon: FileText,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      link: "/posts",
    },
    {
      label: "Media Assets",
      value: media?.length ?? 0,
      icon: Image,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
      link: "/media",
    },
  ];

  const recentTasks = tasks?.slice(0, 5) ?? [];
  const scheduledPosts = posts?.filter((p) => p.status === "scheduled").slice(0, 5) ?? [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Dashboard</h2>
        <p className="text-sm text-neutral-400 mt-1">
          Overview of your publishing operations
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            to={stat.link}
            className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 hover:border-neutral-700 transition-colors group"
          >
            <div className="flex items-center justify-between">
              <div className={`p-2.5 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <TrendingUp className="h-4 w-4 text-neutral-600 group-hover:text-neutral-400 transition-colors" />
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-xs text-neutral-400 mt-0.5">{stat.label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Agent Status */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="h-5 w-5 text-amber-500" />
            <h3 className="font-semibold text-white">Agent Status</h3>
          </div>
          <div className="space-y-3">
            {[
              { name: "Planner", status: "Active", desc: "Orchestrating campaigns" },
              { name: "Research", status: "Active", desc: "Web search ready" },
              { name: "Media", status: "Active", desc: "Image/Video gen ready" },
              { name: "Social", status: "Active", desc: "6 platforms connected" },
            ].map((agent) => (
              <div
                key={agent.name}
                className="flex items-center gap-3 p-3 rounded-lg bg-neutral-800/50"
              >
                <div className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white">{agent.name} Agent</div>
                  <div className="text-xs text-neutral-400">{agent.desc}</div>
                </div>
                <span className="text-xs text-emerald-400 font-medium shrink-0">
                  {agent.status}
                </span>
              </div>
            ))}
          </div>
          <Link
            to="/agents"
            className="mt-4 block text-center text-sm text-amber-500 hover:text-amber-400 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/15 transition-colors"
          >
            Open Agent Hub
          </Link>
        </div>

        {/* Recent Tasks */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5 text-sky-500" />
            <h3 className="font-semibold text-white">Recent Agent Tasks</h3>
          </div>
          {recentTasks.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 text-sm">
              No tasks yet. Start by creating a campaign or talking to an agent.
            </div>
          ) : (
            <div className="space-y-2">
              {recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-neutral-800/50"
                >
                  <div
                    className={`h-2 w-2 rounded-full shrink-0 ${
                      task.status === "completed"
                        ? "bg-emerald-500"
                        : task.status === "running"
                        ? "bg-amber-500"
                        : task.status === "failed"
                        ? "bg-red-500"
                        : "bg-neutral-500"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{task.task}</div>
                    <div className="text-xs text-neutral-400 capitalize">
                      {task.agentType} agent
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium shrink-0 capitalize ${
                      task.status === "completed"
                        ? "text-emerald-400"
                        : task.status === "running"
                        ? "text-amber-400"
                        : task.status === "failed"
                        ? "text-red-400"
                        : "text-neutral-400"
                    }`}
                  >
                    {task.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scheduled Posts */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="h-5 w-5 text-violet-500" />
            <h3 className="font-semibold text-white">Scheduled Posts</h3>
          </div>
          {scheduledPosts.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 text-sm">
              No scheduled posts. Create posts in the scheduler.
            </div>
          ) : (
            <div className="space-y-2">
              {scheduledPosts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-neutral-800/50"
                >
                  <div className="text-xs font-medium text-violet-400 uppercase w-16 shrink-0">
                    {post.platform}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{post.content}</div>
                    <div className="text-xs text-neutral-400">
                      {post.scheduledAt
                        ? new Date(post.scheduledAt).toLocaleDateString()
                        : "No date"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Link
            to="/posts"
            className="mt-4 block text-center text-sm text-violet-500 hover:text-violet-400 py-2 rounded-lg bg-violet-500/10 hover:bg-violet-500/15 transition-colors"
          >
            Manage Posts
          </Link>
        </div>
      </div>
    </div>
  );
}
