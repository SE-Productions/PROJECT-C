import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
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
  Image,
  Video,
  Plus,
  Loader2,
  Trash2,
  ExternalLink,
  Sparkles,
  Play,
} from "lucide-react";
import PageHero from "@/components/PageHero";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function MediaGallery() {
  const utils = trpc.useUtils();
  const { data: media, isLoading } = trpc.media.list.useQuery();
  const { data: books } = trpc.books.list.useQuery();
  const deleteMedia = trpc.media.delete.useMutation({
    onSuccess: () => {
      utils.media.list.invalidate();
      toast.success("Media deleted");
    },
  });

  const generateImage = trpc.generate.image.useMutation({
    onSuccess: (data) => {
      utils.media.list.invalidate();
      toast.success("Image generated!");
      setGeneratedUrl(data.url);
      setGenerating(false);
    },
    onError: (err) => {
      toast.error(err.message ?? "Image generation failed");
      setGenerating(false);
    },
  });

  const generateVideo = trpc.generate.video.useMutation({
    onSuccess: (data) => {
      utils.media.list.invalidate();
      toast.success("Video generated!");
      setGeneratedUrl(data.thumbnailUrl || data.url);
      setGenerating(false);
    },
    onError: (err) => {
      toast.error(err.message ?? "Video generation failed");
      setGenerating(false);
    },
  });

  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState<"all" | "image" | "video">("all");
  const [genForm, setGenForm] = useState({
    type: "image" as "image" | "video",
    prompt: "",
    bookId: "",
    platform: "",
  });
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  const filteredMedia = media?.filter((m) =>
    filter === "all" ? true : m.type === filter
  );

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genForm.prompt) return;
    setGenerating(true);
    setGeneratedUrl(null);

    if (genForm.type === "image") {
      generateImage.mutate({
        prompt: genForm.prompt,
        bookId: genForm.bookId ? parseInt(genForm.bookId) : undefined,
        platform: genForm.platform || undefined,
      });
    } else {
      generateVideo.mutate({
        prompt: genForm.prompt,
        bookId: genForm.bookId ? parseInt(genForm.bookId) : undefined,
        platform: genForm.platform || undefined,
      });
    }
  };

  const resetForm = () => {
    setGenForm({ type: "image", prompt: "", bookId: "", platform: "" });
    setGeneratedUrl(null);
    setGenerating(false);
  };

  return (
    <div className="p-6 space-y-6">
      <PageHero
        image="/images/hero-media.jpg"
        title="Media Gallery"
        subtitle="AI-generated images and videos for your campaigns"
        height="sm"
      />
      <div className="flex items-center justify-between">
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="bg-violet-500 hover:bg-violet-600 text-white font-medium">
              <Plus className="h-4 w-4 mr-2" />
              Generate Media
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-neutral-900 border-neutral-800 text-white max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-500" />
                AI Media Generation
              </DialogTitle>
            </DialogHeader>

            {!generatedUrl ? (
              <form onSubmit={handleGenerate} className="space-y-4 mt-2">
                <div>
                  <label className="text-sm text-neutral-400">Type</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {[
                      { id: "image" as const, label: "Image", icon: Image },
                      { id: "video" as const, label: "Video", icon: Video },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setGenForm({ ...genForm, type: t.id })}
                        className={cn(
                          "flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors",
                          genForm.type === t.id
                            ? "bg-violet-500/20 border-violet-500/40 text-violet-400"
                            : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600"
                        )}
                      >
                        <t.icon className="h-4 w-4" />
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-neutral-400">Prompt *</label>
                  <textarea
                    value={genForm.prompt}
                    onChange={(e) => setGenForm({ ...genForm, prompt: e.target.value })}
                    placeholder={
                      genForm.type === "image"
                        ? "A dramatic dark fantasy book cover with a dragon silhouette against a blood-red moon..."
                        : "A cinematic book trailer scene with floating pages and glowing text, dramatic lighting..."
                    }
                    className="w-full mt-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-violet-500 min-h-[80px] resize-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm text-neutral-400">Book (optional)</label>
                  <Select onValueChange={(v) => setGenForm({ ...genForm, bookId: v })}>
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
                  <label className="text-sm text-neutral-400">Platform (optional)</label>
                  <Select onValueChange={(v) => setGenForm({ ...genForm, platform: v })}>
                    <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white mt-1">
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-800 border-neutral-700">
                      {["instagram", "tiktok", "facebook", "x", "youtube", "reddit"].map((p) => (
                        <SelectItem key={p} value={p} className="text-white capitalize">
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="submit"
                  disabled={generating}
                  className="w-full bg-violet-500 hover:bg-violet-600 text-white font-medium"
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  {generating ? "Generating..." : `Generate ${genForm.type === "image" ? "Image" : "Video"}`}
                </Button>
              </form>
            ) : (
              <div className="space-y-4 mt-2">
                <div className="aspect-square rounded-lg overflow-hidden bg-neutral-800">
                  <img
                    src={generatedUrl}
                    alt="Generated media"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => { setGeneratedUrl(null); setOpen(false); resetForm(); }}
                    className="flex-1 bg-violet-500 hover:bg-violet-600 text-white"
                  >
                    Done
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setGeneratedUrl(null)}
                    className="border-neutral-700 text-neutral-300 hover:bg-neutral-800"
                  >
                    Generate Another
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(["all", "image", "video"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize",
              filter === f
                ? "bg-violet-500/15 text-violet-400"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Media Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        </div>
      ) : filteredMedia?.length === 0 ? (
        <div className="text-center py-16">
          <Image className="h-12 w-12 text-neutral-700 mx-auto mb-3" />
          <p className="text-neutral-500 text-sm">No media yet. Generate your first asset.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredMedia?.map((item) => (
            <div
              key={item.id}
              className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden hover:border-neutral-700 transition-colors group"
            >
              <div className="aspect-square bg-neutral-800 relative">
                {item.type === "image" ? (
                  <img
                    src={item.url || "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"}
                    alt="Media asset"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full relative">
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt="Video thumbnail"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="h-12 w-12 text-neutral-600" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="p-3 rounded-full bg-black/50">
                        <Play className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {item.url && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-white hover:text-violet-400"
                      onClick={() => window.open(item.url, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white hover:text-red-400"
                    onClick={() => {
                      if (confirm("Delete this media?")) {
                        deleteMedia.mutate({ id: item.id });
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-neutral-400 uppercase">
                    {item.type}
                  </span>
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      item.status === "ready"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : item.status === "generating"
                        ? "bg-amber-500/10 text-amber-400"
                        : "bg-red-500/10 text-red-400"
                    )}
                  >
                    {item.status}
                  </span>
                </div>
                {item.prompt && (
                  <p className="text-xs text-neutral-500 mt-1 line-clamp-2">{item.prompt}</p>
                )}
                {item.platform && (
                  <span className="text-xs text-violet-400 mt-1 block capitalize">{item.platform}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
