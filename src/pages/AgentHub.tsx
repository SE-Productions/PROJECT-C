import { useState, useRef, useEffect } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Send,
  Loader2,
  BrainCircuit,
  Search,
  Image,
  Share2,
  User,
  Sparkles,
  Wrench,
  CheckCircle2,
  XCircle,
  Users,
  Target,
  ListTodo,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const agentTypes = [
  {
    id: "planner" as const,
    name: "Orion",
    role: "Planner",
    icon: BrainCircuit,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    desc: "Orchestrates campaigns & strategy",
  },
  {
    id: "search" as const,
    name: "Scout",
    role: "Research",
    icon: Search,
    color: "text-sky-500",
    bg: "bg-sky-500/10",
    border: "border-sky-500/30",
    desc: "Searches web for trends & insights",
  },
  {
    id: "media" as const,
    name: "Vision",
    role: "Media",
    icon: Image,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    desc: "Generates images & video concepts",
  },
  {
    id: "social" as const,
    name: "Echo",
    role: "Social",
    icon: Share2,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    desc: "Creates posts for all platforms",
  },
];

type ViewMode = "chat" | "crew";

export default function AgentHub() {
  const utils = trpc.useUtils();
  const [selectedAgent, setSelectedAgent] = useState<"planner" | "search" | "media" | "social">("planner");
  const [message, setMessage] = useState("");
  const [bookId, setBookId] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [lastToolCalls, setLastToolCalls] = useState<Array<{ tool: string; success: boolean; output: string }>>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("chat");
  const [crewGoal, setCrewGoal] = useState("");
  const [crewResult, setCrewResult] = useState<any>(null);
  const [crewRunning, setCrewRunning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: books } = trpc.books.list.useQuery();
  const { data: messages, isLoading } = trpc.agents.listMessages.useQuery(
    bookId ? { bookId: parseInt(bookId) } : {}
  );
  const { data: personas } = trpc.runtime.getPersonas.useQuery();
  const { data: agentStats } = trpc.runtime.getStats.useQuery();

  const runAgent = trpc.runtime.runAgent.useMutation({
    onSuccess: (data) => {
      utils.agents.listMessages.invalidate();
      utils.runtime.getStats.invalidate();
      setLastToolCalls(data.toolCalls ?? []);
      toast.success(`${agent.name} executed ${data.iterations} tool call(s)`);
      setIsRunning(false);
    },
    onError: (err) => {
      toast.error(err.message ?? "Agent execution failed");
      setIsRunning(false);
    },
  });

  const runCrew = trpc.crew.runCrew.useMutation({
    onSuccess: (data) => {
      setCrewResult(data);
      setCrewRunning(false);
      toast.success(`Crew completed ${data.tasks.filter((t: any) => t.status === "completed").length}/${data.tasks.length} tasks`);
    },
    onError: (err) => {
      toast.error(err.message ?? "Crew execution failed");
      setCrewRunning(false);
    },
  });

  const filteredMessages = messages?.filter((m) => m.agentType === selectedAgent);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setIsRunning(true);
    setLastToolCalls([]);
    runAgent.mutate({
      agentType: selectedAgent,
      message: message.trim(),
      bookId: bookId ? parseInt(bookId) : undefined,
    });
    setMessage("");
  };

  const handleCrewRun = (e: React.FormEvent) => {
    e.preventDefault();
    if (!crewGoal.trim()) return;
    setCrewRunning(true);
    setCrewResult(null);
    const book = books?.find((b) => b.id === parseInt(bookId));
    runCrew.mutate({
      goal: crewGoal.trim(),
      bookId: bookId ? parseInt(bookId) : undefined,
      bookContext: book ? `"${book.title}" by ${book.author}. ${book.description ?? ""}` : undefined,
    });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [filteredMessages, isRunning, lastToolCalls]);

  const agent = agentTypes.find((a) => a.id === selectedAgent)!;

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Sidebar */}
      <div className="w-64 border-r border-neutral-800 bg-neutral-900/50 p-4 space-y-3 overflow-y-auto">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-white mb-3">Select Agent</h3>
          <Select onValueChange={(v) => setBookId(v)} value={bookId}>
            <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white text-xs">
              <SelectValue placeholder="Filter by book (optional)" />
            </SelectTrigger>
            <SelectContent className="bg-neutral-800 border-neutral-700">
              <SelectItem value="" className="text-white text-xs">All Books</SelectItem>
              {books?.map((book) => (
                <SelectItem key={book.id} value={String(book.id)} className="text-white text-xs">
                  {book.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* View Toggle */}
        <div className="flex rounded-lg bg-neutral-800 p-0.5">
          <button
            onClick={() => setViewMode("chat")}
            className={cn(
              "flex-1 text-xs py-1.5 rounded-md transition-colors font-medium",
              viewMode === "chat" ? "bg-neutral-700 text-white" : "text-neutral-400 hover:text-white"
            )}
          >
            Chat
          </button>
          <button
            onClick={() => setViewMode("crew")}
            className={cn(
              "flex-1 text-xs py-1.5 rounded-md transition-colors font-medium flex items-center justify-center gap-1",
              viewMode === "crew" ? "bg-amber-500/20 text-amber-400" : "text-neutral-400 hover:text-white"
            )}
          >
            <Users className="h-3 w-3" />
            Crew
          </button>
        </div>

        {/* Agent Cards */}
        {viewMode === "chat" && (
          <div className="space-y-2">
            {agentTypes.map((a) => (
              <button
                key={a.id}
                onClick={() => { setSelectedAgent(a.id); setLastToolCalls([]); }}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left",
                  selectedAgent === a.id
                    ? `${a.bg} border ${a.border}`
                    : "hover:bg-neutral-800/60 border border-transparent"
                )}
              >
                <div className={cn("p-1.5 rounded-md", a.bg)}>
                  <a.icon className={cn("h-4 w-4", a.color)} />
                </div>
                <div>
                  <div className={cn("text-sm font-medium", selectedAgent === a.id ? "text-white" : "text-neutral-300")}>
                    {a.name}
                  </div>
                  <div className="text-[10px] text-neutral-500 leading-tight">{a.desc}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Crew Info */}
        {viewMode === "crew" && (
          <div className="space-y-2">
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium text-white">Crew Manager</span>
              </div>
              <p className="text-[10px] text-neutral-400">Enter a goal. The manager breaks it into tasks and delegates to agents.</p>
            </div>
            {agentTypes.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg bg-neutral-800/30">
                <div className={cn("p-1 rounded", a.bg)}>
                  <a.icon className={cn("h-3 w-3", a.color)} />
                </div>
                <div className="text-xs text-neutral-400">{a.name} — {a.role}</div>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        {agentStats && (
          <div className="pt-3 border-t border-neutral-800">
            <div className="text-[10px] text-neutral-500 font-medium mb-2 uppercase tracking-wider">Runtime Stats</div>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(agentStats.byAgent).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between px-2 py-1 rounded bg-neutral-800/50">
                  <span className="text-[10px] text-neutral-400 capitalize">{type}</span>
                  <span className="text-[10px] text-white font-medium">{String(count)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-neutral-950">
        {viewMode === "chat" ? (
          <>
            {/* Chat Header */}
            <div className="relative h-14 flex items-center px-5 border-b border-neutral-800 overflow-hidden">
              <img src="/images/hero-agents.jpg" alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
              <div className="absolute inset-0 bg-gradient-to-r from-neutral-900/80 to-neutral-900/40" />
              <div className={cn("relative z-10 p-1.5 rounded-md mr-3", agent.bg)}>
                <agent.icon className={cn("h-4 w-4", agent.color)} />
              </div>
              <div className="relative z-10">
                <div className="text-sm font-medium text-white">{agent.name} <span className="text-neutral-500 text-xs">({agent.role})</span></div>
                <div className="text-xs text-neutral-400">{agent.desc}</div>
              </div>
              <div className="relative z-10 ml-auto flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-xs text-neutral-400">Runtime Active</span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
                </div>
              ) : filteredMessages?.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className={cn("p-4 rounded-xl mb-4", agent.bg)}>
                    <agent.icon className={cn("h-8 w-8", agent.color)} />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1">{agent.name} — {agent.role}</h3>
                  <p className="text-sm text-neutral-400 max-w-sm mb-2">
                    {agent.id === "planner" && "Create marketing plans, timelines, coordinate campaigns using tools."}
                    {agent.id === "search" && "Research trends, competitors, audiences using web search and scraping."}
                    {agent.id === "media" && "Generate images and videos using AI. Saves to Media Gallery."}
                    {agent.id === "social" && "Craft posts and publish via Composio. Platform-optimized content."}
                  </p>
                  <div className="flex flex-wrap gap-1.5 justify-center max-w-sm">
                    {personas?.find((p) => p.type === selectedAgent)?.tools.map((tool: string) => (
                      <span key={tool} className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 flex items-center gap-1">
                        <Wrench className="h-2.5 w-2.5" />{tool}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                filteredMessages?.map((msg, i) => (
                  <div key={i} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
                    {msg.role === "agent" && (
                      <div className={cn("p-2 rounded-lg h-fit shrink-0", agent.bg)}>
                        <agent.icon className={cn("h-4 w-4", agent.color)} />
                      </div>
                    )}
                    <div className={cn(
                      "max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                      msg.role === "user" ? "bg-amber-500 text-black rounded-br-md" : "bg-neutral-800 text-neutral-200 rounded-bl-md"
                    )}>{msg.message}</div>
                    {msg.role === "user" && (
                      <div className="p-2 rounded-lg bg-neutral-800 h-fit shrink-0"><User className="h-4 w-4 text-neutral-400" /></div>
                    )}
                  </div>
                ))
              )}

              {lastToolCalls.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Tool Executions</div>
                  {lastToolCalls.map((tc, i) => (
                    <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-neutral-800/50 border border-neutral-800">
                      {tc.success ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" /> : <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />}
                      <div>
                        <div className="text-xs font-medium text-white">{tc.tool}</div>
                        <div className="text-xs text-neutral-400">{tc.output}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {isRunning && (
                <div className="flex gap-3">
                  <div className={cn("p-2 rounded-lg h-fit shrink-0", agent.bg)}>
                    <agent.icon className={cn("h-4 w-4", agent.color)} />
                  </div>
                  <div className="bg-neutral-800 rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                      <span className="text-sm text-neutral-400">Executing agent loop...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSend} className="p-4 border-t border-neutral-800 bg-neutral-900/50">
              <div className="flex items-center gap-3 bg-neutral-800 rounded-xl px-4 py-2 border border-neutral-700 focus-within:border-neutral-600">
                <Sparkles className={cn("h-4 w-4 shrink-0", agent.color)} />
                <Input value={message} onChange={(e) => setMessage(e.target.value)}
                  placeholder={`Ask ${agent.name} (${agent.role})...`}
                  className="bg-transparent border-0 text-white placeholder:text-neutral-500 focus-visible:ring-0 px-0"
                  disabled={isRunning} />
                <Button type="submit" disabled={!message.trim() || isRunning} size="icon"
                  className={cn("h-8 w-8 shrink-0", message.trim() ? "bg-amber-500 hover:bg-amber-600 text-black" : "bg-neutral-700 text-neutral-500")}>
                  {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </form>
          </>
        ) : (
          <>
            {/* Crew Manager Header */}
            <div className="h-14 flex items-center px-5 border-b border-neutral-800 bg-neutral-900/50">
              <div className="p-1.5 rounded-md mr-3 bg-amber-500/10">
                <Users className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">Crew Manager</div>
                <div className="text-xs text-neutral-400">Multi-agent task delegation</div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-xs text-amber-400">Crew Mode</span>
              </div>
            </div>

            {/* Crew Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {!crewResult && !crewRunning && (
                <div className="flex flex-col items-center justify-center h-full text-center max-w-lg mx-auto">
                  <div className="p-4 rounded-xl mb-4 bg-amber-500/10">
                    <Users className="h-8 w-8 text-amber-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1">Crew Manager</h3>
                  <p className="text-sm text-neutral-400 mb-4">
                    Enter a marketing goal and the Crew Manager will break it into sub-tasks, delegate to the right agents, execute them, and deliver a final report.
                  </p>
                  <div className="grid grid-cols-2 gap-2 w-full mb-4">
                    {[
                      "Launch my mystery novel",
                      "Create a 30-day campaign",
                      "Research competitors",
                      "Generate social content",
                    ].map((example) => (
                      <button key={example} onClick={() => setCrewGoal(example)}
                        className="p-2 rounded-lg bg-neutral-800 border border-neutral-700 text-xs text-neutral-300 hover:border-amber-500/30 hover:text-white transition-colors text-left">
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Crew Result */}
              {crewResult && (
                <div className="space-y-4">
                  {/* Final Report */}
                  <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-medium text-white">Goal: {crewResult.goal}</span>
                    </div>
                    <div className="text-sm text-neutral-300 whitespace-pre-wrap">{crewResult.finalReport}</div>
                    <div className="flex items-center gap-4 mt-3 text-xs text-neutral-500">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        {crewResult.tasks.filter((t: any) => t.status === "completed").length} completed
                      </span>
                      <span className="flex items-center gap-1">
                        <ListTodo className="h-3 w-3" />
                        {crewResult.tasks.length} total tasks
                      </span>
                    </div>
                  </div>

                  {/* Task List */}
                  <div className="space-y-2">
                    <div className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Task Execution Log</div>
                    {crewResult.tasks.map((task: any) => {
                      const agentConfig = agentTypes.find((a) => a.id === task.assignedAgent);
                      return (
                        <div key={task.id} className="p-3 rounded-lg bg-neutral-800/50 border border-neutral-800">
                          <div className="flex items-center gap-2 mb-1">
                            {task.status === "completed" ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                            <span className="text-xs font-medium text-white">Task {task.id}: {task.description}</span>
                          </div>
                          <div className="flex items-center gap-2 ml-6">
                            {agentConfig && (
                              <span className={cn("text-[10px] px-1.5 py-0.5 rounded", agentConfig.bg, agentConfig.color)}>
                                {agentConfig.name}
                              </span>
                            )}
                            <span className={cn("text-[10px] capitalize",
                              task.status === "completed" ? "text-emerald-400" : "text-red-400"
                            )}>{task.status}</span>
                          </div>
                          {task.output && (
                            <p className="text-xs text-neutral-400 ml-6 mt-1 line-clamp-3">{task.output}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Running Indicator */}
              {crewRunning && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-amber-500 mb-3" />
                  <p className="text-sm text-neutral-400">Crew Manager planning and executing tasks...</p>
                  <p className="text-xs text-neutral-500 mt-1">This may take 30-60 seconds</p>
                </div>
              )}
            </div>

            {/* Crew Input */}
            <form onSubmit={handleCrewRun} className="p-4 border-t border-neutral-800 bg-neutral-900/50">
              <div className="flex items-center gap-3 bg-neutral-800 rounded-xl px-4 py-2 border border-neutral-700 focus-within:border-amber-500/50">
                <Target className="h-4 w-4 shrink-0 text-amber-500" />
                <Input value={crewGoal} onChange={(e) => setCrewGoal(e.target.value)}
                  placeholder="Enter a marketing goal for the crew..."
                  className="bg-transparent border-0 text-white placeholder:text-neutral-500 focus-visible:ring-0 px-0"
                  disabled={crewRunning} />
                <Button type="submit" disabled={!crewGoal.trim() || crewRunning} size="sm"
                  className="bg-amber-500 hover:bg-amber-600 text-black font-medium shrink-0">
                  {crewRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Play className="h-4 w-4 mr-1" />Run Crew</>}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
