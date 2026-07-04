import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { cn } from "@/lib/utils";
import {
  Search,
  Plus,
  Brain,
  Lightbulb,
  ShieldCheck,
  Trash2,
  Edit3,
  X,
  Save,
  BookOpen,
  Tag,
  Clock,
  Database,
  Activity,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";

type Tab = "memory" | "thoughts" | "reflections";

interface MemoryItem {
  id: number;
  key: string;
  value: string;
  category: string;
  tags: string[];
  source: string | null;
  bookId: number | null;
  accessCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export default function ScratchPad() {
  const [activeTab, setActiveTab] = useState<Tab>("memory");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form state
  const [formKey, setFormKey] = useState("");
  const [formValue, setFormValue] = useState("");
  const [formCategory, setFormCategory] = useState("general");
  const [formTags, setFormTags] = useState("");

  const utils = trpc.useUtils();

  const { data: stats } = trpc.scratchPad.getStats.useQuery();
  const { data: memoryData, isLoading: memLoading } = trpc.scratchPad.list.useQuery(
    { search: searchQuery || undefined, category: categoryFilter || undefined, limit: 50 }
  );
  const { data: categories } = trpc.scratchPad.getCategories.useQuery();
  const { data: thoughtsData } = trpc.scratchPad.listThoughts.useQuery(
    { limit: 100 }, { enabled: activeTab === "thoughts" }
  );
  const { data: reflectionsData } = trpc.scratchPad.listReflections.useQuery(
    { limit: 100 }, { enabled: activeTab === "reflections" }
  );

  const createMutation = trpc.scratchPad.create.useMutation({
    onSuccess: () => { utils.scratchPad.list.invalidate(); utils.scratchPad.getStats.invalidate(); resetForm(); setShowCreate(false); },
  });
  const updateMutation = trpc.scratchPad.update.useMutation({
    onSuccess: () => { utils.scratchPad.list.invalidate(); setEditingId(null); },
  });
  const deleteMutation = trpc.scratchPad.delete.useMutation({
    onSuccess: () => { utils.scratchPad.list.invalidate(); utils.scratchPad.getStats.invalidate(); },
  });

  function resetForm() {
    setFormKey(""); setFormValue(""); setFormCategory("general"); setFormTags("");
  }

  function handleCreate() {
    if (!formKey.trim() || !formValue.trim()) return;
    createMutation.mutate({
      key: formKey, value: formValue, category: formCategory,
      tags: formTags.split(",").map((t) => t.trim()).filter(Boolean),
    });
  }

  function handleUpdate(id: number) {
    if (!formKey.trim() || !formValue.trim()) return;
    updateMutation.mutate({
      id, key: formKey, value: formValue,
      category: formCategory,
      tags: formTags.split(",").map((t) => t.trim()).filter(Boolean),
    });
  }

  function startEdit(item: MemoryItem) {
    setEditingId(item.id);
    setFormKey(item.key);
    setFormValue(item.value);
    setFormCategory(item.category ?? "general");
    setFormTags((item.tags ?? []).join(", "));
  }

  const memories = memoryData;

  const tabs: { id: Tab; label: string; icon: typeof Brain; count?: number }[] = [
    { id: "memory", label: "Global Memory", icon: Database, count: stats?.totalMemories ?? 0 },
    { id: "thoughts", label: "Agent Thoughts", icon: Brain, count: stats?.totalThoughts ?? 0 },
    { id: "reflections", label: "Reflection Log", icon: ShieldCheck, count: stats?.totalReflections ?? 0 },
  ];

  const categoryColors: Record<string, string> = {
    general: "bg-neutral-700",
    research: "bg-blue-600",
    agent_output: "bg-emerald-600",
    decision: "bg-amber-600",
    insight: "bg-purple-600",
  };

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/15">
            <Lightbulb className="h-6 w-6 text-amber-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Scratch Pad</h1>
            <p className="text-sm text-neutral-400">Persistent memory, agent thoughts & reflection logs</p>
          </div>
        </div>
        <div className="sm:ml-auto flex items-center gap-3">
          {stats && (
            <div className="flex items-center gap-4 text-xs text-neutral-400">
              <span className="flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5" /> {stats.totalMemories}
              </span>
              <span className="flex items-center gap-1.5">
                <Brain className="h-3.5 w-3.5" /> {stats.totalThoughts}
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" /> {stats.totalReflections}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
              activeTab === tab.id
                ? "bg-amber-500/15 text-amber-500 border border-amber-500/20"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800/60 border border-transparent"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            <span className={cn(
              "ml-1 px-1.5 py-0.5 rounded-full text-xs",
              activeTab === tab.id ? "bg-amber-500/20 text-amber-400" : "bg-neutral-800 text-neutral-500"
            )}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ─── GLOBAL MEMORY TAB ─── */}
      {activeTab === "memory" && (
        <div className="space-y-4">
          {/* Search + Filter + Create */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                <input
                  type="text"
                  placeholder="Search memory..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-sm placeholder:text-neutral-500 focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-sm focus:outline-none focus:border-amber-500/50"
            >
              <option value="">All categories</option>
              {(categories ?? []).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button
              onClick={() => { setShowCreate(!showCreate); resetForm(); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-600 text-white hover:bg-amber-500 transition-colors text-sm font-medium"
            >
              {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showCreate ? "Cancel" : "Add Memory"}
            </button>
          </div>

          {/* Create/Edit Form */}
          {(showCreate || editingId !== null) && (
            <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
              <h3 className="text-sm font-semibold text-white">
                {editingId ? "Edit Memory" : "Add New Memory"}
              </h3>
              <input
                type="text"
                placeholder="Key / Title"
                value={formKey}
                onChange={(e) => setFormKey(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-amber-500/50"
              />
              <textarea
                placeholder="Value / Content"
                value={formValue}
                onChange={(e) => setFormValue(e.target.value)}
                rows={4}
                className="w-full px-4 py-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-amber-500/50 resize-none"
              />
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Category"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-amber-500/50"
                />
                <input
                  type="text"
                  placeholder="Tags (comma separated)"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white text-sm placeholder:text-neutral-600 focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => editingId ? handleUpdate(editingId) : handleCreate()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-500 transition-colors text-sm font-medium"
                >
                  <Save className="h-4 w-4" />
                  {editingId ? "Update" : "Save"}
                </button>
                <button
                  onClick={() => { setShowCreate(false); setEditingId(null); resetForm(); }}
                  className="px-4 py-2 rounded-lg bg-neutral-800 text-neutral-300 hover:text-white transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Memory Grid */}
          {memLoading ? (
            <div className="flex items-center justify-center h-40 text-neutral-500 text-sm">
              <Activity className="h-5 w-5 animate-spin mr-2" /> Loading memories...
            </div>
          ) : memories?.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-neutral-500">
              <Database className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No memories found. Create one to get started.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {memories?.items.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h3 className="text-sm font-semibold text-white truncate">{item.key}</h3>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide text-white",
                          categoryColors[item.category ?? "general"] ?? "bg-neutral-700"
                        )}>
                          {item.category ?? "general"}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-300 whitespace-pre-wrap line-clamp-3">{item.value}</p>
                      <div className="flex items-center gap-3 mt-2.5 text-xs text-neutral-500">
                        {item.tags && item.tags.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            {item.tags.join(", ")}
                          </span>
                        )}
                        {item.source && (
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            {item.source}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(item.updatedAt), "MMM d, yyyy HH:mm")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          {item.accessCount} recalls
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEdit(item)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 transition-colors"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => { if (confirm("Delete this memory?")) deleteMutation.mutate({ id: item.id }); }}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-neutral-800 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── AGENT THOUGHTS TAB ─── */}
      {activeTab === "thoughts" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-neutral-400">
            <Brain className="h-4 w-4" />
            <span>Real-time working memory from agent execution. Each row is a step in an agent&apos;s reasoning process.</span>
          </div>

          {!thoughtsData || thoughtsData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-neutral-500">
              <Brain className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No agent thoughts recorded yet. Run an agent to see working memory.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {thoughtsData.map((t) => (
                <div
                  key={t.id}
                  className={cn(
                    "p-4 rounded-xl border transition-colors",
                    t.status === "active" ? "bg-neutral-900 border-neutral-800" : "bg-neutral-900/50 border-neutral-800/50"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white",
                      t.agentType === "planner" && "bg-blue-600",
                      t.agentType === "search" && "bg-emerald-600",
                      t.agentType === "media" && "bg-purple-600",
                      t.agentType === "social" && "bg-amber-600"
                    )}>
                      {t.agentType}
                    </span>
                    <span className="text-xs text-neutral-500">
                      Task #{t.taskId} {t.bookId && `· Book #${t.bookId}`}
                    </span>
                    <span className={cn(
                      "ml-auto px-1.5 py-0.5 rounded text-[10px] font-medium",
                      t.status === "active" ? "bg-blue-500/15 text-blue-400" :
                      t.status === "resolved" ? "bg-emerald-500/15 text-emerald-400" :
                      "bg-neutral-700 text-neutral-400"
                    )}>
                      {t.status}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-200 mb-1.5">{t.thought}</p>
                  {t.decision && (
                    <p className="text-xs text-neutral-400 mb-1">
                      <span className="font-medium text-neutral-300">Decision:</span> {t.decision}
                    </p>
                  )}
                  {t.reasoning && (
                    <p className="text-xs text-neutral-500 line-clamp-2">
                      <span className="font-medium text-neutral-400">Reasoning:</span> {t.reasoning}
                    </p>
                  )}
                  {t.reflectionScore !== null && t.reflectionScore !== undefined && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            t.reflectionScore >= 0.8 ? "bg-emerald-500" :
                            t.reflectionScore >= 0.5 ? "bg-amber-500" : "bg-red-500"
                          )}
                          style={{ width: `${Math.round(t.reflectionScore * 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-neutral-500">
                        {Math.round(t.reflectionScore * 100)}%
                      </span>
                    </div>
                  )}
                  <p className="mt-2 text-[10px] text-neutral-600">
                    {format(new Date(t.createdAt), "MMM d, yyyy HH:mm:ss")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── REFLECTION LOGS TAB ─── */}
      {activeTab === "reflections" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-neutral-400">
            <ShieldCheck className="h-4 w-4" />
            <span>Self-reflection audit trail. The runtime checks every decision against the user&apos;s goal before executing.</span>
          </div>

          {!reflectionsData || reflectionsData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-neutral-500">
              <ShieldCheck className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No reflections recorded yet. The hardened runtime logs reflections during agent execution.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {reflectionsData.map((r) => (
                <div
                  key={r.id}
                  className="p-4 rounded-xl bg-neutral-900 border border-neutral-800"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-white",
                      r.agentType === "planner" && "bg-blue-600",
                      r.agentType === "search" && "bg-emerald-600",
                      r.agentType === "media" && "bg-purple-600",
                      r.agentType === "social" && "bg-amber-600"
                    )}>
                      {r.agentType}
                    </span>
                    <span className="text-xs text-neutral-500">Task #{r.taskId}</span>
                    <span className={cn(
                      "ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                      r.alignedWithGoal === "yes" && "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
                      r.alignedWithGoal === "no" && "bg-red-500/15 text-red-400 border border-red-500/20",
                      r.alignedWithGoal === "partial" && "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                    )}>
                      {r.alignedWithGoal === "yes" ? "Aligned" : r.alignedWithGoal === "no" ? "Misaligned" : "Partial"}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-0.5">Original Decision</p>
                      <p className="text-sm text-neutral-300 bg-neutral-950 rounded-lg p-2.5 border border-neutral-800/50">{r.originalDecision}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-0.5">Reflection Result</p>
                      <p className="text-sm text-neutral-300">{r.reflectionResult}</p>
                    </div>
                    {r.correction && (
                      <div>
                        <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-0.5">Correction Applied</p>
                        <p className="text-sm text-amber-400/80">{r.correction}</p>
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-[10px] text-neutral-600">
                    {format(new Date(r.createdAt), "MMM d, yyyy HH:mm:ss")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
