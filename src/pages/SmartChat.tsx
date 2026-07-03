import { useState, useRef, useEffect } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Loader2, Sparkles, Check, X, Wand2, BrainCircuit, Target, Clock, Zap, MessageSquare, ChevronRight, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  role: "user" | "system" | "result";
  content: string;
  intent?: {
    action: string;
    agentType: string;
    description: string;
    confidence: number;
  };
  toolCalls?: Array<{ tool: string; success: boolean; output: string }>;
  crewTasks?: Array<{ id: number; description: string; assignedAgent: string; status: string }>;
}

const quickActions = [
  { label: "Create a campaign for my book", icon: Target },
  { label: "Write an Instagram post about my book launch", icon: MessageSquare },
  { label: "Generate a book cover image", icon: Sparkles },
  { label: "Research trending hashtags for my genre", icon: BrainCircuit },
  { label: "Schedule daily posts for next week", icon: Clock },
  { label: "Run a full marketing crew for my book", icon: Zap },
];

export default function SmartChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [bookId, setBookId] = useState<string>("");
  const [pendingIntent, setPendingIntent] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: books } = trpc.books.list.useQuery();

  const parseIntent = trpc.smart.parse.useMutation({
    onSuccess: (data) => {
      setPendingIntent(data);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "system",
          content: `I understood your request. Here's what I'll do:`,
          intent: {
            action: data.action,
            agentType: data.agentType,
            description: data.description,
            confidence: data.confidence,
          },
        },
      ]);
      setIsProcessing(false);
    },
    onError: (err) => {
      toast.error(err.message);
      setIsProcessing(false);
    },
  });

  const executeIntent = trpc.smart.execute.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "result",
          content: data.success ? (data.response ?? "Done") : `Error: ${data.error ?? "Unknown error"}`,
          toolCalls: data.toolCalls,
        },
      ]);
      setPendingIntent(null);
      setIsProcessing(false);
    },
    onError: (err) => {
      toast.error(err.message);
      setPendingIntent(null);
      setIsProcessing(false);
    },
  });

  const executeCrew = trpc.smart.executeCrew.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "result",
          content: data.finalReport,
          crewTasks: data.tasks,
        },
      ]);
      setPendingIntent(null);
      setIsProcessing(false);
    },
    onError: (err) => {
      toast.error(err.message);
      setPendingIntent(null);
      setIsProcessing(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    // If there's a pending intent, this is a confirmation
    if (pendingIntent) {
      const lower = input.trim().toLowerCase();
      if (lower === "yes" || lower === "y" || lower === "confirm" || lower === "do it") {
        confirmExecution();
      } else if (lower === "no" || lower === "n" || lower === "cancel") {
        setMessages((prev) => [...prev, { id: Date.now().toString(), role: "system", content: "Cancelled. What would you like to do instead?" }]);
        setPendingIntent(null);
      } else {
        // New request
        setPendingIntent(null);
        sendNewRequest(input.trim());
      }
      setInput("");
      return;
    }

    sendNewRequest(input.trim());
    setInput("");
  };

  function sendNewRequest(text: string) {
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: "user", content: text }]);
    setIsProcessing(true);
    parseIntent.mutate({ message: text });
  }

  function confirmExecution() {
    if (!pendingIntent) return;
    setIsProcessing(true);

    // Remove the confirmation card from messages
    setMessages((prev) => prev.filter((m) => m.role !== "system" || !m.intent));

    if (pendingIntent.action === "run_crew") {
      executeCrew.mutate({
        goal: pendingIntent.params.goal ?? pendingIntent.description,
        bookId: pendingIntent.params.book_id ?? (bookId ? parseInt(bookId) : undefined),
      });
    } else {
      executeIntent.mutate({
        action: pendingIntent.action,
        agentType: pendingIntent.agentType,
        params: pendingIntent.params,
        description: pendingIntent.description,
      });
    }
  }

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing]);

  const agentColors: Record<string, string> = {
    planner: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    search: "text-sky-500 bg-sky-500/10 border-sky-500/20",
    media: "text-violet-500 bg-violet-500/10 border-violet-500/20",
    social: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] bg-neutral-950">
      {/* Header */}
      <div className="h-14 flex items-center px-5 border-b border-neutral-800 bg-neutral-900/50 shrink-0">
        <div className="p-1.5 rounded-md mr-3 bg-amber-500/10">
          <Wand2 className="h-5 w-5 text-amber-500" />
        </div>
        <div>
          <div className="text-sm font-medium text-white">Smart Chat</div>
          <div className="text-xs text-neutral-400">Describe what you want. I'll make it happen.</div>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Select onValueChange={(v) => setBookId(v)} value={bookId}>
            <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white text-xs w-48">
              <SelectValue placeholder="Select a book" />
            </SelectTrigger>
            <SelectContent className="bg-neutral-800 border-neutral-700">
              {books?.map((book) => (
                <SelectItem key={book.id} value={String(book.id)} className="text-white text-xs">
                  {book.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-lg mx-auto">
            <div className="p-5 rounded-2xl bg-amber-500/10 mb-5">
              <Wand2 className="h-10 w-10 text-amber-500" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">What do you want to create?</h2>
            <p className="text-sm text-neutral-400 mb-6">
              Just describe what you need in plain English. I'll figure out which agents to use, what tools to call, and get it done.
            </p>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2 w-full">
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => {
                    setInput(action.label);
                    sendNewRequest(action.label);
                  }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-neutral-800/50 border border-neutral-800 hover:border-amber-500/30 hover:bg-neutral-800 transition-all text-left group"
                >
                  <action.icon className="h-4 w-4 text-neutral-500 group-hover:text-amber-500 transition-colors shrink-0" />
                  <span className="text-xs text-neutral-300 group-hover:text-white">{action.label}</span>
                  <ChevronRight className="h-3 w-3 text-neutral-600 ml-auto group-hover:text-amber-500 transition-colors" />
                </button>
              ))}
            </div>

            {/* Examples */}
            <div className="mt-6 space-y-1">
              <p className="text-[10px] text-neutral-600 uppercase tracking-wider">Or try saying:</p>
              {[
                "Schedule an Instagram post about my book every day at 9am",
                "Research what authors in my genre are doing on TikTok",
                "Generate a dramatic book cover with dark fantasy theme",
                "Create a launch campaign for my novel targeting young adults",
              ].map((ex) => (
                <button
                  key={ex}
                  onClick={() => {
                    setInput(ex);
                    sendNewRequest(ex);
                  }}
                  className="block text-xs text-neutral-500 hover:text-amber-400 transition-colors text-left py-0.5"
                >
                  "{ex}"
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.role === "user" && (
              <div className="flex justify-end">
                <div className="max-w-[70%] bg-amber-500 text-black rounded-2xl rounded-br-md px-4 py-3 text-sm">
                  {msg.content}
                </div>
              </div>
            )}

            {msg.role === "system" && msg.intent && (
              <div className="max-w-lg">
                <p className="text-sm text-neutral-400 mb-2">{msg.content}</p>
                <div className={cn("p-4 rounded-xl border", agentColors[msg.intent.agentType] ?? "bg-neutral-800 border-neutral-700")}>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-sm font-medium">{msg.intent.description}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/20 capitalize">
                      {msg.intent.agentType} agent
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      Confidence: {Math.round(msg.intent.confidence * 100)}%
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={confirmExecution}
                      disabled={isProcessing}
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Do It
                    </Button>
                    <Button
                      onClick={() => {
                        setPendingIntent(null);
                        setMessages((prev) => [...prev, { id: Date.now().toString(), role: "system", content: "Cancelled. What would you like to do instead?" }]);
                      }}
                      variant="outline"
                      size="sm"
                      className="border-neutral-600 text-neutral-300 hover:bg-neutral-700 text-xs"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                  </div>
                  <p className="text-[10px] text-neutral-500 mt-2">
                    Or type a different request to override
                  </p>
                </div>
              </div>
            )}

            {msg.role === "system" && !msg.intent && (
              <div className="text-sm text-neutral-400">{msg.content}</div>
            )}

            {msg.role === "result" && (
              <div className="max-w-lg">
                <div className="p-4 rounded-xl bg-neutral-800/50 border border-neutral-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium text-white">Done!</span>
                  </div>
                  <div className="text-sm text-neutral-300 whitespace-pre-wrap">{msg.content}</div>

                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <p className="text-[10px] text-neutral-500 uppercase">Tools used:</p>
                      {msg.toolCalls.map((tc, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          {tc.success ? (
                            <Check className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <X className="h-3 w-3 text-red-500" />
                          )}
                          <span className="text-neutral-400">{tc.tool}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {msg.crewTasks && msg.crewTasks.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <p className="text-[10px] text-neutral-500 uppercase">Crew tasks:</p>
                      {msg.crewTasks.map((t) => (
                        <div key={t.id} className="flex items-center gap-2 text-xs">
                          <Check className="h-3 w-3 text-emerald-500" />
                          <span className="text-neutral-400">{t.description}</span>
                          <span className="text-[10px] text-neutral-600 capitalize">({t.assignedAgent})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {isProcessing && !pendingIntent && (
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-neutral-800">
              <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
            </div>
            <span className="text-sm text-neutral-400">Working on it...</span>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-neutral-800 bg-neutral-900/50 shrink-0">
        <div className="flex items-center gap-3 bg-neutral-800 rounded-xl px-4 py-2 border border-neutral-700 focus-within:border-amber-500/50 transition-colors">
          {pendingIntent ? (
            <RefreshCw className="h-4 w-4 text-emerald-500 shrink-0" />
          ) : (
            <Wand2 className="h-4 w-4 text-amber-500 shrink-0" />
          )}
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              pendingIntent
                ? "Type 'yes' to confirm, 'no' to cancel, or a new request..."
                : "Describe what you want to create..."
            }
            className="bg-transparent border-0 text-white placeholder:text-neutral-500 focus-visible:ring-0 px-0"
            disabled={isProcessing && !pendingIntent}
          />
          <Button
            type="submit"
            disabled={!input.trim() || (isProcessing && !pendingIntent)}
            size="icon"
            className={cn(
              "h-8 w-8 shrink-0 transition-colors",
              input.trim() ? "bg-amber-500 hover:bg-amber-600 text-black" : "bg-neutral-700 text-neutral-500"
            )}
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </form>
    </div>
  );
}
