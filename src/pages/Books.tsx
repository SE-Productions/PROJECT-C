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
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Search,
  Sparkles,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import PageHero from "@/components/PageHero";

const genres = [
  "Fiction", "Non-Fiction", "Mystery", "Romance", "Sci-Fi",
  "Fantasy", "Thriller", "Biography", "Self-Help", "Business",
  "History", "Poetry", "Children", "Young Adult", "Horror",
];

export default function Books() {
  const utils = trpc.useUtils();
  const { data: books, isLoading } = trpc.books.list.useQuery();
  const createBook = trpc.books.create.useMutation({
    onSuccess: () => {
      utils.books.list.invalidate();
      toast.success("Book created successfully");
      setOpen(false);
      resetForm();
    },
  });
  const updateBook = trpc.books.update.useMutation({
    onSuccess: () => {
      utils.books.list.invalidate();
      toast.success("Book updated");
      setEditOpen(false);
    },
  });
  const deleteBook = trpc.books.delete.useMutation({
    onSuccess: () => {
      utils.books.list.invalidate();
      toast.success("Book deleted");
    },
  });

  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [form, setForm] = useState({
    title: "",
    author: "",
    description: "",
    genre: "",
    targetAudience: "",
    publishDate: "",
  });

  const resetForm = () => {
    setForm({ title: "", author: "", description: "", genre: "", targetAudience: "", publishDate: "" });
  };

  const filteredBooks = books?.filter((b) =>
    b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.author) return;
    createBook.mutate(form);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBook) return;
    updateBook.mutate({
      id: editingBook.id,
      title: editingBook.title,
      author: editingBook.author,
      description: editingBook.description,
      genre: editingBook.genre,
      targetAudience: editingBook.targetAudience,
      publishDate: editingBook.publishDate,
      status: editingBook.status,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <PageHero
        image="/images/hero-books.jpg"
        title="Books"
        subtitle="Manage your publishing catalog"
        height="sm"
      />
      <div className="flex items-center justify-between">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-amber-500 hover:bg-amber-600 text-black font-medium">
              <Plus className="h-4 w-4 mr-2" />
              Add Book
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-neutral-900 border-neutral-800 text-white max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-amber-500" />
                Add New Book
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div>
                <label className="text-sm text-neutral-400">Title *</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Book title"
                  className="bg-neutral-800 border-neutral-700 text-white mt-1"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-neutral-400">Author *</label>
                <Input
                  value={form.author}
                  onChange={(e) => setForm({ ...form, author: e.target.value })}
                  placeholder="Author name"
                  className="bg-neutral-800 border-neutral-700 text-white mt-1"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-neutral-400">Description</label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Book description"
                  className="bg-neutral-800 border-neutral-700 text-white mt-1 min-h-[80px]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-neutral-400">Genre</label>
                  <Select onValueChange={(v) => setForm({ ...form, genre: v })}>
                    <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white mt-1">
                      <SelectValue placeholder="Select genre" />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-800 border-neutral-700">
                      {genres.map((g) => (
                        <SelectItem key={g} value={g} className="text-white">
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-neutral-400">Target Audience</label>
                  <Input
                    value={form.targetAudience}
                    onChange={(e) => setForm({ ...form, targetAudience: e.target.value })}
                    placeholder="e.g. Young adults"
                    className="bg-neutral-800 border-neutral-700 text-white mt-1"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-neutral-400">Publish Date</label>
                <Input
                  type="date"
                  value={form.publishDate}
                  onChange={(e) => setForm({ ...form, publishDate: e.target.value })}
                  className="bg-neutral-800 border-neutral-700 text-white mt-1"
                />
              </div>
              <Button
                type="submit"
                disabled={createBook.isPending}
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-medium"
              >
                {createBook.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Create Book
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search books by title or author..."
          className="bg-neutral-900 border-neutral-800 text-white pl-10"
        />
      </div>

      {/* Books Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : filteredBooks?.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="h-12 w-12 text-neutral-700 mx-auto mb-3" />
          <p className="text-neutral-500 text-sm">
            {searchQuery ? "No books match your search" : "No books yet. Add your first book to get started."}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredBooks?.map((book) => (
            <div
              key={book.id}
              className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 hover:border-neutral-700 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <BookOpen className="h-7 w-7 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate">{book.title}</h3>
                  <p className="text-sm text-neutral-400">{book.author}</p>
                  {book.genre && (
                    <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300">
                      {book.genre}
                    </span>
                  )}
                </div>
              </div>

              {book.description && (
                <p className="text-sm text-neutral-400 mt-3 line-clamp-2">{book.description}</p>
              )}

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-neutral-800">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    book.status === "active"
                      ? "bg-emerald-500/10 text-emerald-400"
                      : book.status === "draft"
                      ? "bg-amber-500/10 text-amber-400"
                      : "bg-neutral-700 text-neutral-400"
                  }`}
                >
                  {book.status}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-neutral-400 hover:text-white"
                    onClick={() => {
                      setEditingBook(book);
                      setEditOpen(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-neutral-400 hover:text-red-400"
                    onClick={() => {
                      if (confirm("Delete this book?")) {
                        deleteBook.mutate({ id: book.id });
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-neutral-900 border-neutral-800 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Book</DialogTitle>
          </DialogHeader>
          {editingBook && (
            <form onSubmit={handleUpdate} className="space-y-4 mt-2">
              <div>
                <label className="text-sm text-neutral-400">Title</label>
                <Input
                  value={editingBook.title}
                  onChange={(e) => setEditingBook({ ...editingBook, title: e.target.value })}
                  className="bg-neutral-800 border-neutral-700 text-white mt-1"
                />
              </div>
              <div>
                <label className="text-sm text-neutral-400">Author</label>
                <Input
                  value={editingBook.author}
                  onChange={(e) => setEditingBook({ ...editingBook, author: e.target.value })}
                  className="bg-neutral-800 border-neutral-700 text-white mt-1"
                />
              </div>
              <div>
                <label className="text-sm text-neutral-400">Description</label>
                <Textarea
                  value={editingBook.description ?? ""}
                  onChange={(e) => setEditingBook({ ...editingBook, description: e.target.value })}
                  className="bg-neutral-800 border-neutral-700 text-white mt-1 min-h-[80px]"
                />
              </div>
              <div>
                <label className="text-sm text-neutral-400">Status</label>
                <Select
                  value={editingBook.status}
                  onValueChange={(v) => setEditingBook({ ...editingBook, status: v })}
                >
                  <SelectTrigger className="bg-neutral-800 border-neutral-700 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-800 border-neutral-700">
                    <SelectItem value="draft" className="text-white">Draft</SelectItem>
                    <SelectItem value="active" className="text-white">Active</SelectItem>
                    <SelectItem value="archived" className="text-white">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-black font-medium">
                {updateBook.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Update Book
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
