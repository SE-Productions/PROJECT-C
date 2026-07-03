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
  CalendarDays,
  Plus,
  Loader2,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Trash2,
  Instagram,
  Facebook,
  Twitter,
  Youtube,
} from "lucide-react";
import { toast } from "sonner";

const platformIcons: Record<string, React.ReactNode> = {
  instagram: <Instagram className="h-4 w-4" />,
  tiktok: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>,
  facebook: <Facebook className="h-4 w-4" />,
  x: <Twitter className="h-4 w-4" />,
  youtube: <Youtube className="h-4 w-4" />,
  reddit: <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>,
};

const platformColors: Record<string, string> = {
  instagram: "text-pink-500",
  tiktok: "text-cyan-400",
  facebook: "text-blue-500",
  x: "text-sky-400",
  youtube: "text-red-500",
  reddit: "text-orange-500",
};

export default function PostScheduler() {
  const utils = trpc.useUtils();
  const { data: posts, isLoading } = trpc.posts.list.useQuery();
  const { data: books } = trpc.books.list.useQuery();
  const createPost = trpc.posts.create.useMutation({
    onSuccess: () => {
      utils.posts.list.invalidate();
      toast.success("Post created");
      setOpen(false);
      resetForm();
    },
  });
  const schedulePost = trpc.social.schedule.useMutation({
    onSuccess: () => {
      utils.posts.list.invalidate();
      toast.success("Post scheduled");
    },
  });
  const publishNow = trpc.social.publish.useMutation({
    onSuccess: () => {
      utils.posts.list.invalidate();
      toast.success("Post published!");
    },
    onError: (err) => {
      toast.error(err.message ?? "Publish failed. Check Composio connection.");
    },
  });
  const deletePost = trpc.posts.delete.useMutation({
    onSuccess: () => {
      utils.posts.list.invalidate();
      toast.success("Post deleted");
    },
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    bookId: "",
    campaignId: "",
    platform: "instagram" as any,
    content: "",
    scheduledAt: "",
  });

  const resetForm = () => {
    setForm({ bookId: "", campaignId: "", platform: "instagram", content: "", scheduledAt: "" });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.bookId || !form.content) return;
    createPost.mutate({
      bookId: parseInt(form.bookId),
      platform: form.platform,
      content: form.content,
      scheduledAt: form.scheduledAt,
      status: form.scheduledAt ? "scheduled" : "draft",
    });
  };

  const statusCounts = {
    draft: posts?.filter((p) => p.status === "draft").length ?? 0,
    scheduled: posts?.filter((p) => p.status === "scheduled").length ?? 0,
    published: posts?.filter((p) => p.status === "published").length ?? 0,
    failed: posts?.filter((p) => p.status === "failed").length ?? 0,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Post Scheduler</h2>
          <p className="text-sm text-neutral-400 mt-1">
            Create, schedule, and publish social media posts
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-500 hover:bg-emerald-600 text-black font-medium">
              <Plus className="h-4 w-4 mr-2" />
              New Post
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-neutral-900 border-neutral-800 text-white max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-500" />
                Create Post
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
                <label className="text-sm text-neutral-400">Platform *</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {Object.entries(platformIcons).map(([key, icon]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setForm({ ...form, platform: key as any })}
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-colors ${
                        form.platform === key
                          ? `bg-emerald-500/15 border-emerald-500/30 ${platformColors[key]}`
                          : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600"
                      }`}
                    >
                      {icon}
                      <span className="capitalize">{key}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm text-neutral-400">Content *</label>
                <Textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Write your post content..."
                  className="bg-neutral-800 border-neutral-700 text-white mt-1 min-h-[100px]"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-neutral-400">Schedule Date (optional)</label>
                <Input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                  className="bg-neutral-800 border-neutral-700 text-white mt-1"
                />
              </div>
              <Button
                type="submit"
                disabled={createPost.isPending}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-medium"
              >
                {createPost.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Create Post
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Drafts", count: statusCounts.draft, icon: FileText, color: "text-neutral-400", bg: "bg-neutral-800" },
          { label: "Scheduled", count: statusCounts.scheduled, icon: Clock, color: "text-violet-400", bg: "bg-violet-500/10" },
          { label: "Published", count: statusCounts.published, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Failed", count: statusCounts.failed, icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/10" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-neutral-800`}>
            <div className="flex items-center gap-2">
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <span className="text-xs text-neutral-400">{s.label}</span>
            </div>
            <div className={`text-2xl font-bold mt-1 ${s.color}`}>{s.count}</div>
          </div>
        ))}
      </div>

      {/* Posts List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      ) : posts?.length === 0 ? (
        <div className="text-center py-16">
          <CalendarDays className="h-12 w-12 text-neutral-700 mx-auto mb-3" />
          <p className="text-neutral-500 text-sm">No posts yet. Create your first post.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {posts?.map((post) => {
            const book = books?.find((b) => b.id === post.bookId);
            return (
              <div
                key={post.id}
                className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 hover:border-neutral-700 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg shrink-0 ${platformColors[post.platform]} bg-neutral-800`}>
                    {platformIcons[post.platform]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-neutral-300 uppercase">
                        {post.platform}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          post.status === "published"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : post.status === "scheduled"
                            ? "bg-violet-500/10 text-violet-400"
                            : post.status === "failed"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-neutral-700 text-neutral-400"
                        }`}
                      >
                        {post.status}
                      </span>
                      {book && (
                        <span className="text-xs text-neutral-500">{book.title}</span>
                      )}
                    </div>
                    <p className="text-sm text-white mt-2">{post.content}</p>
                    {post.scheduledAt && (
                      <p className="text-xs text-neutral-500 mt-1">
                        Scheduled: {new Date(post.scheduledAt).toLocaleString()}
                      </p>
                    )}
                    {post.publishedAt && (
                      <p className="text-xs text-emerald-600 mt-1">
                        Published: {new Date(post.publishedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {post.status === "draft" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-neutral-400 hover:text-emerald-400"
                        onClick={() => {
                          const date = prompt("Enter schedule date (YYYY-MM-DD HH:mm):");
                          if (date) {
                            schedulePost.mutate({
                              postId: post.id,
                              scheduledAt: new Date(date).toISOString(),
                            });
                          }
                        }}
                      >
                        <Clock className="h-4 w-4" />
                      </Button>
                    )}
                    {post.status !== "published" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-neutral-400 hover:text-emerald-400"
                        onClick={() => {
                          if (confirm("Publish now via Composio?")) {
                            publishNow.mutate({ postId: post.id });
                          }
                        }}
                        disabled={publishNow.isPending}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-neutral-400 hover:text-red-400"
                      onClick={() => {
                        if (confirm("Delete this post?")) {
                          deletePost.mutate({ id: post.id });
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
