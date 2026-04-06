import * as React from "react"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { Trash2, Edit2, Plus } from "lucide-react"

export function ContentManager() {
  const [blocks, setBlocks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ key: "", title: "", content: "" })

  useEffect(() => {
    fetchBlocks()
    
    const subscription = supabase
      .channel('content_blocks_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'content_blocks' }, fetchBlocks)
      .subscribe()

    return () => { supabase.removeChannel(subscription) }
  }, [])

  const fetchBlocks = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("content_blocks")
      .select("*")
      .order("key", { ascending: true })

    if (error) {
      toast.error("Failed to load content blocks")
    } else {
      setBlocks(data || [])
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (editingId) {
      const { error } = await supabase
        .from("content_blocks")
        .update(formData)
        .eq("id", editingId)

      if (error) toast.error("Failed to update content block")
      else toast.success("Content block updated")
    } else {
      const { error } = await supabase
        .from("content_blocks")
        .insert([formData])

      if (error) toast.error("Failed to add content block")
      else toast.success("Content block added")
    }
    
    setFormData({ key: "", title: "", content: "" })
    setEditingId(null)
    fetchBlocks()
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("content_blocks")
      .delete()
      .eq("id", id)

    if (error) toast.error("Failed to delete content block")
    else {
      toast.success("Content block deleted")
      fetchBlocks()
    }
  }

  const handleEdit = (block: any) => {
    setEditingId(block.id)
    setFormData({ key: block.key, title: block.title, content: block.content })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Content Manager</h1>
        <p className="text-zinc-400">Manage static text blocks across the site (e.g., About Us, Terms).</p>
      </div>

      <div className="bg-zinc-900 border border-white/10 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">{editingId ? "Edit Block" : "Add New Block"}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="key" className="text-zinc-300">Unique Key (e.g., about_us)</Label>
              <Input 
                id="key" 
                value={formData.key} 
                onChange={e => setFormData({...formData, key: e.target.value})} 
                className="bg-zinc-950 border-white/10 text-white font-mono" 
                required 
                disabled={!!editingId}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title" className="text-zinc-300">Display Title</Label>
              <Input 
                id="title" 
                value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})} 
                className="bg-zinc-950 border-white/10 text-white" 
                required 
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="content" className="text-zinc-300">Content (Markdown/HTML supported)</Label>
            <Textarea 
              id="content" 
              value={formData.content} 
              onChange={e => setFormData({...formData, content: e.target.value})} 
              className="bg-zinc-950 border-white/10 text-white min-h-[150px] font-mono" 
              required 
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" className="bg-green-600 hover:bg-green-500 text-white">
              {editingId ? "Update Block" : "Add Block"}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" onClick={() => { setEditingId(null); setFormData({ key: "", title: "", content: "" }) }} className="border-white/10 text-zinc-300 hover:bg-white/10">
                Cancel
              </Button>
            )}
          </div>
        </form>
      </div>

      <div className="bg-zinc-900 border border-white/10 rounded-xl overflow-hidden">
        <Table>
          <TableHeader className="bg-zinc-950/50">
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-zinc-400 w-48">Key</TableHead>
              <TableHead className="text-zinc-400">Title</TableHead>
              <TableHead className="text-right text-zinc-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-white/10"><TableCell colSpan={3} className="text-center text-zinc-500 py-8">Loading...</TableCell></TableRow>
            ) : blocks.length === 0 ? (
              <TableRow className="border-white/10"><TableCell colSpan={3} className="text-center text-zinc-500 py-8">No content blocks found.</TableCell></TableRow>
            ) : (
              blocks.map((block) => (
                <TableRow key={block.id} className="border-white/10 hover:bg-white/5">
                  <TableCell className="font-mono text-zinc-400 text-sm">{block.key}</TableCell>
                  <TableCell className="text-zinc-300 font-medium">{block.title}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(block)} className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(block.id)} className="text-red-400 hover:text-red-300 hover:bg-red-400/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
