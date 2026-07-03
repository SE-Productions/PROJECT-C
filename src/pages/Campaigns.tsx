import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Megaphone,
  Plus,
  Loader2,
  Target,
  Calendar,
  Layers,
  Play,
  Pause,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

const platforms = [
  { id: "instagram", label: "Instagram" },
  { id: "tiktok", label: "TikTok" },
  { id: "facebook", label: "Facebook" },
  { id: "x", label: "X (Twitter)" },
  { id: "youtube", label: "YouTube" },
  { id: "reddit", label: "Reddit" },
];

export default function Campaigns() {
  const utils = trpc.useUtils();
  const { data: campaigns, isLoading } = trpc.campaigns.list.useQuery();
  const { data: books } = trpc.books.list.useQuery();
  const createCampaign = trpc.campaigns.create.useMutation({
    onSuccess: () => {
      utils.campaigns.list.invalidate();
      toast.success("Campaign created");
      setOpen(false);
      resetForm();
    },
  });
  const updateCampaign = trpc.campaigns.update.useMutation({
    onSuccess: () => utils.campaigns.list.invalidate(),
  });
  const deleteCampaign = trpc.campaigns.delete.useMutation({
    onSuccess: () => {
      utils.campaigns.list.invalidate();
      toast.success("Campaign deleted");
    },
  });

  const [open, setOpen] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [form, setForm] = useState({
    bookId: "",
    name: "",
    description: "",
    objective: "awareness",
    startDate: "",
    endDate: "",
  });

  const resetForm = () => {
    setForm({ bookId: "", name: "", description: "", objective: "awareness", startDate: "", endDate: "" });
    setSelectedPlatforms([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.bookId || !form.name) return;
    createCampaign.mutate({
      bookId: parseInt(form.bookId),
      name: form.name,
      description: form.description,
      objective: form.objective as any,
      platforms: selectedPlatforms,
      startDate: form.startDate,
      endDate: form.endDate,
    });
  };

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((p) => p !== platformId)
        : [...prev, platformId]
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Campaigns</h2>
          <p className="text-sm text-neutral-400 mt-1">
            Marketing campaigns for your books
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-amber-500 hover:bg-amber-600 text-black font-medium">
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-neutral-900 border-neutral-800 text-white max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-amber-500" />
                Create Campaign
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div>
                <label className="text-sm text-neutral-400">Book *</label>
                <Select onValueChange={(v) => setForm({ ...form, bookId: v })}>
                  <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white mt-1">
                    <SelectValue placeholder="Select a book" />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-800 border-neutral-700">
                    {books?.map((book) => (
                      <SelectItem key={book.id} value={String(book.id)} className="text-white">
                        {book.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-neutral-400">Campaign Name *</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Book Launch Week 1"
                  className="bg-neutral-800 border-neutral-700 text-white mt-1"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-neutral-400">Description</label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Campaign goals and strategy"
                  className="bg-neutral-800 border-neutral-700 text-white mt-1 min-h-[60px]"
                />
              </div>
              <div>
                <label className="text-sm text-neutral-400">Objective</label>
                <Select onValueChange={(v) => setForm({ ...form, objective: v })}>
                  <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white mt-1">
                    <SelectValue placeholder="Select objective" />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-800 border-neutral-700">
                    <SelectItem value="awareness" className="text-white">Brand Awareness</SelectItem>
                    <SelectItem value="engagement" className="text-white">Engagement</SelectItem>
                    <SelectItem value="sales" className="text-white">Sales</SelectItem>
                    <SelectItem value="launch" className="text-white">Book Launch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-neutral-400 mb-2 block">Platforms</label>
                <div className="grid grid-cols-3 gap-2">
                  {platforms.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePlatform(p.id)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        selectedPlatforms.includes(p.id)
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "bg-neutral-800 text-neutral-400 border border-neutral-700 hover:border-neutral-600"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-neutral-400">Start Date</label>
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="bg-neutral-800 border-neutral-700 text-white mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm text-neutral-400">End Date</label>
                  <Input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="bg-neutral-800 border-neutral-700 text-white mt-1"
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={createCampaign.isPending}
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-medium"
              >
                {createCampaign.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Create Campaign
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Campaigns List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : campaigns?.length === 0 ? (
        <div className="text-center py-16">
          <Megaphone className="h-12 w-12 text-neutral-700 mx-auto mb-3" />
          <p className="text-neutral-500 text-sm">No campaigns yet. Create your first campaign.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns?.map((campaign) => {
            const book = books?.find((b) => b.id === campaign.bookId);
            const campaignPlatforms = (campaign.platforms as string[]) ?? [];
            return (
              <div
                key={campaign.id}
                className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 hover:border-neutral-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-white">{campaign.name}</h3>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          campaign.status === "active"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : campaign.status === "draft"
                            ? "bg-amber-500/10 text-amber-400"
                            : campaign.status === "paused"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-sky-500/10 text-sky-400"
                        }`}
                      >
                        {campaign.status}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-400 mt-1">
                      {book ? `For: ${book.title}` : "No book assigned"}
                    </p>
                    {campaign.description && (
                      <p className="text-sm text-neutral-500 mt-1">{campaign.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 mt-3">
                      <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                        <Target className="h-3.5 w-3.5" />
                        {campaign.objective}
                      </div>
                      {(campaign.startDate || campaign.endDate) && (
                        <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                          <Calendar className="h-3.5 w-3.5" />
                          {campaign.startDate ? new Date(campaign.startDate).toLocaleDateString() : "?"}
                          {" - "}
                          {campaign.endDate ? new Date(campaign.endDate).toLocaleDateString() : "?"}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                        <Layers className="h-3.5 w-3.5" />
                        {campaignPlatforms.length} platforms
                      </div>
                    </div>
                    {campaignPlatforms.length > 0 && (
                      <div className="flex gap-1.5 mt-3">
                        {campaignPlatforms.map((p) => (
                          <span
                            key={p}
                            className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 capitalize"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    {campaign.status === "active" ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-neutral-400 hover:text-amber-400"
                        onClick={() => updateCampaign.mutate({ id: campaign.id, status: "paused" })}
                      >
                        <Pause className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-neutral-400 hover:text-emerald-400"
                        onClick={() => updateCampaign.mutate({ id: campaign.id, status: "active" })}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-neutral-400 hover:text-red-400"
                      onClick={() => {
                        if (confirm("Delete this campaign?")) {
                          deleteCampaign.mutate({ id: campaign.id });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
