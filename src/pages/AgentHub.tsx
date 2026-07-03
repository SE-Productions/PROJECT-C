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
  Zap,
  User,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const agentTypes = [
  {
    id: "planner" as const,
    name: "Planner",
    icon: BrainCircuit,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    desc: "Orchestrates campaigns & strategy",
  },
  {
    id: "search" as const,
    name: "Research",
    icon: Search,
    color: "text-sky-500",
    bg: "bg-sky-500/10",
    border: "border-sky-500/30",
    desc: "Searches web for trends & insights",
  },
  {
    id: "media" as const,
    name: "Media",
    icon: Image,
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    desc: "Generates images & video ideas",
  },
  {
    id: "social" as const,
    name: "Social",
    icon: Share2,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    desc: "Creates posts for all platforms",
  },
];

export default function AgentHub() {
  const utils = trpc.useUtils();
  const [selectedAgent, setSelectedAgent] = useState<"planner" | "search" | "media" | "social">("planner");
  const [message, setMessage] = useState("");
  const [bookId, setBookId] = useState<string>("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: books } = trpc.books.list.useQuery();
  const { data: messages, isLoading } = trpc.agents.listMessages.useQuery(
    bookId ? { bookId: parseInt(bookId) } : {}
  );
  const sendMessage = trpc.agents.sendMessage.useMutation({
    onSuccess: () => {
      utils.agents.listMessages.invalidate();
      setIsTyping(false);
    },
    onError: () => {
      setIsTyping(false);
    },
  });

  const orchestrate = trpc.agents.orchestrate.useMutation({
    onSuccess: () => {
      utils.agents.listTasks.invalidate();
      toast.success("All agents activated for this book!");
    },
  });

  const filteredMessages = messages?.filter(
    (m) => m.agentType === selectedAgent
  );

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setIsTyping(true);
    sendMessage.mutate({
      agentType: selectedAgent,
      bookId: bookId ? parseInt(bookId) : undefined,
      message: message.trim(),
    });
    setMessage("");
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [filteredMessages, isTyping]);

  const agent = agentTypes.find((a) => a.id === selectedAgent)!;

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Agent Selector Sidebar */}
      <div className="w-64 border-r border-neutral-800 bg-neutral-900/50 p-4 space-y-3">
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

        <div className="space-y-2">
          {agentTypes.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelectedAgent(a.id)}
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

        {bookId && (
          <div className="pt-4 border-t border-neutral-800">
            <Button
              onClick={() => orchestrate.mutate({ bookId: parseInt(bookId), goal: "Launch marketing campaign" })}
              disabled={orchestrate.isPending}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black text-xs font-medium"
              size="sm"
            >
              {orchestrate.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Zap className="h-3 w-3 mr-1" />
              )}
              Run All Agents
            </Button>
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-neutral-950">
        {/* Chat Header */}
        <div className="h-14 flex items-center px-5 border-b border-neutral-800 bg-neutral-900/50">
          <div className={cn("p-1.5 rounded-md mr-3", agent.bg)}>
            <agent.icon className={cn("h-4 w-4", agent.color)} />
          </div>
          <div>
            <div className="text-sm font-medium text-white">{agent.name} Agent</div>
            <div className="text-xs text-neutral-400">{agent.desc}</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-neutral-400">Online</span>
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
              <h3 className="text-lg font-semibold text-white mb-1">
                {agent.name} Agent
              </h3>
              <p className="text-sm text-neutral-400 max-w-sm">
                {agent.id === "planner" && "Ask me to create marketing plans, set timelines, or coordinate campaigns for your books."}
                {agent.id === "search" && "I can research market trends, find competitor insights, and discover audience opportunities."}
                {agent.id === "media" && "Tell me what images or videos you need for your book marketing campaigns."}
                {agent.id === "social" && "I'll craft platform-optimized posts for Instagram, TikTok, Facebook, X, YouTube, and Reddit."}
              </p>
            </div>
          ) : (
            filteredMessages?.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-3",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {msg.role === "agent" && (
                  <div className={cn("p-2 rounded-lg h-fit shrink-0", agent.bg)}>
                    <agent.icon className={cn("h-4 w-4", agent.color)} />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-amber-500 text-black rounded-br-md"
                      : "bg-neutral-800 text-neutral-200 rounded-bl-md"
                  )}
                >
                  {msg.message}
                </div>
                {msg.role === "user" && (
                  <div className="p-2 rounded-lg bg-neutral-800 h-fit shrink-0">
                    <User className="h-4 w-4 text-neutral-400" />
                  </div>
                )}
              </div>
            ))
          )}

          {isTyping && (
            <div className="flex gap-3">
              <div className={cn("p-2 rounded-lg h-fit shrink-0", agent.bg)}>
                <agent.icon className={cn("h-4 w-4", agent.color)} />
              </div>
              <div className="bg-neutral-800 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-neutral-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="h-2 w-2 rounded-full bg-neutral-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="h-2 w-2 rounded-full bg-neutral-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSend}
          className="p-4 border-t border-neutral-800 bg-neutral-900/50"
        >
          <div className="flex items-center gap-3 bg-neutral-800 rounded-xl px-4 py-2 border border-neutral-700 focus-within:border-neutral-600 transition-colors">
            <Sparkles className={cn("h-4 w-4 shrink-0", agent.color)} />
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Ask the ${agent.name} agent...`}
              className="bg-transparent border-0 text-white placeholder:text-neutral-500 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
            />
            <Button
              type="submit"
              disabled={!message.trim() || sendMessage.isPending}
              size="icon"
              className={cn(
                "h-8 w-8 shrink-0 transition-colors",
                message.trim()
                  ? "bg-amber-500 hover:bg-amber-600 text-black"
                  : "bg-neutral-700 text-neutral-500"
              )}
            >
              {sendMessage.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
