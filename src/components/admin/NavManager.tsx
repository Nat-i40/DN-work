import * as React from "react"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { Trash2, Edit2, Plus } from "lucide-react"

export function NavManager() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ label: "", link: "", order: 0 })

  useEffect(() => {
    fetchNavItems()
    
    const subscription = supabase
      .channel('site_settings_nav')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings', filter: "key=eq.navbar" }, fetchNavItems)
      .subscribe()

    return () => { supabase.removeChannel(subscription) }
  }, [])

  const fetchNavItems = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "navbar")
      .single()

    if (error && error.code !== "PGRST116") {
      toast.error("Failed to load nav items")
    } else {
      setItems(data?.value || [])
    }
    setLoading(false)
  }

  const saveItems = async (newItems: any[]) => {
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: "navbar", value: newItems })

    if (error) toast.error("Failed to save changes")
    else toast.success("Saved successfully")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    let newItems = [...items]
    
    if (editingId) {
      newItems = newItems.map(item => item.id === editingId ? { ...formData, id: editingId } : item)
    } else {
      newItems.push({ ...formData, id: crypto.randomUUID() })
    }
    
    newItems.sort((a, b) => a.order - b.order)
    await saveItems(newItems)
    setFormData({ label: "", link: "", order: 0 })
    setEditingId(null)
  }

  const handleDelete = async (id: string) => {
    const newItems = items.filter(item => item.id !== id)
    await saveItems(newItems)
  }

  const handleEdit = (item: any) => {
    setEditingId(item.id)
    setFormData({ label: item.label, link: item.link, order: item.order })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Navigation Bar Manager</h1>
        <p className="text-zinc-400">Manage the links that appear in the top navigation bar.</p>
      </div>

      <div className="bg-zinc-900 border border-white/10 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">{editingId ? "Edit Link" : "Add New Link"}</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="label" className="text-zinc-300">Label</Label>
            <Input 
              id="label" 
              value={formData.label} 
              onChange={e => setFormData({...formData, label: e.target.value})} 
              className="bg-zinc-950 border-white/10 text-white" 
              required 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="link" className="text-zinc-300">URL Path</Label>
            <Input 
              id="link" 
              value={formData.link} 
              onChange={e => setFormData({...formData, link: e.target.value})} 
              className="bg-zinc-950 border-white/10 text-white" 
              required 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="order" className="text-zinc-300">Order</Label>
            <Input 
              id="order" 
              type="number" 
              value={formData.order} 
              onChange={e => setFormData({...formData, order: parseInt(e.target.value)})} 
              className="bg-zinc-950 border-white/10 text-white" 
              required 
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="bg-green-600 hover:bg-green-500 text-white w-full">
              {editingId ? "Update" : "Add"}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" onClick={() => { setEditingId(null); setFormData({ label: "", link: "", order: 0 }) }} className="border-white/10 text-zinc-300 hover:bg-white/10">
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
              <TableHead className="text-zinc-400">Order</TableHead>
              <TableHead className="text-zinc-400">Label</TableHead>
              <TableHead className="text-zinc-400">Link</TableHead>
              <TableHead className="text-right text-zinc-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-white/10"><TableCell colSpan={4} className="text-center text-zinc-500 py-8">Loading...</TableCell></TableRow>
            ) : items.length === 0 ? (
              <TableRow className="border-white/10"><TableCell colSpan={4} className="text-center text-zinc-500 py-8">No navigation items found.</TableCell></TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id} className="border-white/10 hover:bg-white/5">
                  <TableCell className="font-medium text-white">{item.order}</TableCell>
                  <TableCell className="text-zinc-300">{item.label}</TableCell>
                  <TableCell className="text-zinc-400">{item.link}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(item)} className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-300 hover:bg-red-400/10">
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
