"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/store/useStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils";
import { Plus, Trash2, Edit3, Save, X } from "lucide-react";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } } as const;
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } } as const;

export default function NotesPage() {
  const { notes, addNote, updateNote, deleteNote } = useStore();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", content: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateNote(editingId, form);
      setEditingId(null);
    } else {
      addNote(form);
    }
    setForm({ title: "", content: "" });
    setShowForm(false);
  };

  const startEdit = (note: { id: string; title: string; content: string }) => {
    setEditingId(note.id);
    setForm({ title: note.title, content: note.content });
    setShowForm(true);
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notes</h1>
          <p className="text-sm text-muted-foreground">Personal notes &amp; reminders</p>
        </div>
        <Button variant="primary" onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ title: "", content: "" }); }}>
          <Plus className="w-4 h-4 mr-1" /> {showForm ? "Cancel" : "New Note"}
        </Button>
      </motion.div>

      {showForm && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
          <Card glass>
            <CardHeader>
              <CardTitle className="text-sm font-medium">{editingId ? "Edit Note" : "New Note"}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Title" placeholder="Note title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground/80">Content</label>
                  <textarea className="flex min-h-[120px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y" placeholder="Write your note..." value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required />
                </div>
                <div className="flex gap-3">
                  <Button type="submit" variant="primary">
                    <Save className="w-4 h-4 mr-1" /> {editingId ? "Update" : "Save"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>
                    <X className="w-4 h-4 mr-1" /> Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {notes.length > 0 ? notes.map((note) => (
          <motion.div key={note.id} variants={item} layout>
            <Card hover className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm">{note.title}</CardTitle>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(note)} className="p-1.5 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteNote(note.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6">{note.content}</p>
                <p className="text-[10px] text-muted-foreground mt-3">Updated: {formatDateTime(note.updatedAt)}</p>
              </CardContent>
            </Card>
          </motion.div>
        )) : (
          <motion.div variants={item} className="md:col-span-2 lg:col-span-3">
            <Card>
              <CardContent className="p-12 text-center text-sm text-muted-foreground">
                No notes yet. Click &quot;New Note&quot; to get started!
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
