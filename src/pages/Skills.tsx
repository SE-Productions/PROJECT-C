import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { cn } from "@/lib/utils";
import {
  Search,
  Zap,
  Brain,
  BarChart3,
  BookOpen,
  Share2,
  Wand2,
  Layers,
  ChevronRight,
  X,
  Loader2,
  Sparkles,
  Target,
  ListChecks,
  Terminal,
  RefreshCw,
} from "lucide-react";
import PageHero from "@/components/PageHero";

const categoryConfig: Record<string, { label: string; icon: typeof Zap; color: string }> = {
  book_marketing: { label: "Book Marketing", icon: BookOpen, color: "bg-blue-600" },
  social_media: { label: "Social Media", icon: Share2, color: "bg-pink-600" },
  content_generation: { label: "Content Generation", icon: Wand2, color: "bg-purple-600" },
  analytics: { label: "Analytics & Optimization", icon: BarChart3, color: "bg-emerald-600" },
  agent_operations: { label: "Agent Operations", icon: Brain, color: "bg-amber-600" },
  publishing_operations: { label: "Publishing Operations", icon: Layers, color: "bg-cyan-600" },
};

const agentTypeColors: Record<string, string> = {
  planner: "bg-blue-600",
  search: "bg-emerald-600",
  media: "bg-purple-600",
  social: "bg-pink-600",
  any: "bg-neutral-600",
};

const complexityIcons: Record<string, string> = {
  simple: "●",
  medium: "●●",
  complex: "●●●",
};

interface Skill {
  id: string;
  name: string;
  category: string;
  description: string;
  triggerKeywords: string[];
  agentType: string;
  complexity: string;
  tools: string[];
  siePhase: string;
  examples: string[];
}

export default function Skills() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [loadStatus, setLoadStatus] = useState<string>("");

  const { data: skills, isLoading } = trpc.scratchPad.listSkills.useQuery({
    category: activeCategory || undefined,
    search: search || undefined,
  });

  const loadMutation = trpc.scratchPad.loadSkills.useMutation({
    onSuccess: (data) => setLoadStatus(`${data.loaded} loaded, ${data.skipped} already present`),
  });
  const reloadMutation = trpc.scratchPad.reloadSkills.useMutation({
    onSuccess: (data) => setLoadStatus(`${data.updated} skills reloaded`),
  });

  const grouped = skills?.reduce<Record<string, Skill[]>>((acc, skill) => {
    const cat = skill.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(skill);
    return acc;
  }, {}) ?? {};

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6">
      <PageHero
        image="/images/hero-skills.jpg"
        title="Skill Library"
        subtitle={`${skills?.length ?? 0} state-of-the-art skills available for runtime agent execution`}
        height="sm"
      />
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="sm:ml-auto flex items-center gap-2">
          <button
            onClick={() => { setLoadStatus(""); loadMutation.mutate(); }}
            disabled={loadMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 transition-colors text-xs font-medium border border-emerald-600/20"
          >
            {loadMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            Load to RAG
          </button>
          <button
            onClick={() => { setLoadStatus(""); reloadMutation.mutate(); }}
            disabled={reloadMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors text-xs font-medium"
          >
            {reloadMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Reload
          </button>
        </div>
      </div>

      {loadStatus && (
        <div className="px-4 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          {loadStatus}
        </div>
      )}

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
          <input
            type="text"
            placeholder="Search skills by name, keyword, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-white text-sm placeholder:text-neutral-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {/* Category Chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory("")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
            !activeCategory
              ? "bg-amber-500/15 text-amber-500 border border-amber-500/20"
              : "bg-neutral-800 text-neutral-400 hover:text-white border border-transparent"
          )}
        >
          All ({skills?.length ?? 0})
        </button>
        {Object.entries(categoryConfig).map(([key, config]) => {
          const count = skills?.filter((s) => s.category === key).length ?? 0;
          if (search && count === 0) return null;
          return (
            <button
              key={key}
              onClick={() => setActiveCategory(activeCategory === key ? "" : key)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5",
                activeCategory === key
                  ? "bg-amber-500/15 text-amber-500 border border-amber-500/20"
                  : "bg-neutral-800 text-neutral-400 hover:text-white border border-transparent"
              )}
            >
              <span className={cn("w-2 h-2 rounded-full", config.color)} />
              {config.label}
              <span className="text-neutral-500 ml-0.5">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Skills Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-neutral-500 text-sm">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading skills...
        </div>
      ) : !skills || skills.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-neutral-500">
          <Zap className="h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm">No skills found matching your criteria.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, catSkills]) => {
            const config = categoryConfig[cat] ?? { label: cat, icon: Zap, color: "bg-neutral-600" };
            const Icon = config.icon;
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="h-4 w-4 text-neutral-400" />
                  <h2 className="text-sm font-semibold text-white uppercase tracking-wider">{config.label}</h2>
                  <span className="text-xs text-neutral-500">({catSkills.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {catSkills.map((skill) => (
                    <button
                      key={skill.id}
                      onClick={() => setSelectedSkill(skill)}
                      className="text-left p-4 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-amber-500/30 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="text-sm font-semibold text-white group-hover:text-amber-400 transition-colors">
                          {skill.name}
                        </h3>
                        <ChevronRight className="h-4 w-4 text-neutral-600 group-hover:text-amber-500 transition-colors shrink-0" />
                      </div>
                      <p className="text-xs text-neutral-400 line-clamp-2 mb-3">{skill.description}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold uppercase text-white", agentTypeColors[skill.agentType] ?? "bg-neutral-600")}>
                          {skill.agentType}
                        </span>
                        <span className="text-[10px] text-neutral-500">
                          {complexityIcons[skill.complexity]}
                        </span>
                        <span className="text-[10px] text-neutral-600">
                          {skill.tools.length} tools
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {skill.triggerKeywords.slice(0, 4).map((kw) => (
                          <span key={kw} className="px-1.5 py-0.5 rounded bg-neutral-800 text-[10px] text-neutral-400">
                            {kw}
                          </span>
                        ))}
                        {skill.triggerKeywords.length > 4 && (
                          <span className="text-[10px] text-neutral-600">+{skill.triggerKeywords.length - 4}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Skill Detail Modal */}
      {selectedSkill && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 overflow-auto">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSelectedSkill(null)} />
          <div className="relative w-full max-w-2xl bg-neutral-900 rounded-2xl border border-neutral-700 shadow-2xl max-h-[85vh] overflow-auto">
            {/* Header */}
            <div className="sticky top-0 bg-neutral-900 border-b border-neutral-800 p-5 flex items-start justify-between z-10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase text-white", (categoryConfig[selectedSkill.category]?.color) ?? "bg-neutral-600")}>
                    {(categoryConfig[selectedSkill.category]?.label) ?? selectedSkill.category}
                  </span>
                  <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase text-white", agentTypeColors[selectedSkill.agentType] ?? "bg-neutral-600")}>
                    {selectedSkill.agentType}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white">{selectedSkill.name}</h2>
              </div>
              <button
                onClick={() => setSelectedSkill(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Description */}
              <p className="text-sm text-neutral-300">{selectedSkill.description}</p>

              {/* Meta */}
              <div className="flex flex-wrap gap-3 text-xs">
                <span className="flex items-center gap-1 text-neutral-400">
                  <Target className="h-3 w-3" /> Complexity: <span className="text-white">{selectedSkill.complexity}</span>
                </span>
                <span className="flex items-center gap-1 text-neutral-400">
                  <Terminal className="h-3 w-3" /> Tools: <span className="text-white">{selectedSkill.tools.join(", ")}</span>
                </span>
                <span className="flex items-center gap-1 text-neutral-400">
                  <ListChecks className="h-3 w-3" /> SIE: <span className="text-neutral-300">{selectedSkill.siePhase}</span>
                </span>
              </div>

              {/* Trigger Keywords */}
              <div>
                <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Trigger Keywords</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedSkill.triggerKeywords.map((kw) => (
                    <span key={kw} className="px-2 py-1 rounded-md bg-neutral-800 text-xs text-neutral-300 border border-neutral-700">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>

              {/* Examples */}
              <div>
                <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Example Prompts</h4>
                <div className="space-y-1.5">
                  {selectedSkill.examples.map((ex, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-neutral-300 bg-neutral-800/50 rounded-lg px-3 py-2">
                      <span className="text-amber-500 mt-0.5">&quot;</span>
                      <span>{ex}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ID for runtime reference */}
              <div className="pt-3 border-t border-neutral-800">
                <span className="text-[10px] text-neutral-600 font-mono">Runtime ID: {selectedSkill.id}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
