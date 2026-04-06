import * as React from "react"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { Trash2, Edit2, Plus } from "lucide-react"

export function CategoriesManager() {
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: "", order: 0 })

  useEffect(() => {
    fetchCategories()
    
    const subscription = supabase
      .channel('categories_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, fetchCategories)
      .subscribe()

    return () => { supabase.removeChannel(subscription) }
  }, [])

  const fetchCategories = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("order", { ascending: true })

    if (error) {
      toast.error("Failed to load categories")
    } else {
      setCategories(data || [])
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (editingId) {
      const { error } = await supabase
        .from("categories")
        .update(formData)
        .eq("id", editingId)

      if (error) toast.error("Failed to update category")
      else toast.success("Category updated")
    } else {
      const { error } = await supabase
        .from("categories")
        .insert([formData])

      if (error) toast.error("Failed to add category")
      else toast.success("Category added")
    }
    
    setFormData({ name: "", order: 0 })
    setEditingId(null)
    fetchCategories()
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id)

    if (error) toast.error("Failed to delete category")
    else {
      toast.success("Category deleted")
      fetchCategories()
    }
  }

  const handleEdit = (category: any) => {
    setEditingId(category.id)
    setFormData({ name: category.name, order: category.order })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Categories Manager</h1>
        <p className="text-zinc-400">Manage job categories available on the platform.</p>
      </div>

      <div className="bg-zinc-900 border border-white/10 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">{editingId ? "Edit Category" : "Add New Category"}</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-zinc-300">Category Name</Label>
            <Input 
              id="name" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              className="bg-zinc-950 border-white/10 text-white" 
              placeholder="e.g., Agriculture"
              required 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="order" className="text-zinc-300">Display Order</Label>
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
              {editingId ? "Update" : "Add Category"}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" onClick={() => { setEditingId(null); setFormData({ name: "", order: 0 }) }} className="border-white/10 text-zinc-300 hover:bg-white/10">
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
              <TableHead className="text-zinc-400 w-24">Order</TableHead>
              <TableHead className="text-zinc-400">Name</TableHead>
              <TableHead className="text-right text-zinc-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-white/10"><TableCell colSpan={3} className="text-center text-zinc-500 py-8">Loading...</TableCell></TableRow>
            ) : categories.length === 0 ? (
              <TableRow className="border-white/10"><TableCell colSpan={3} className="text-center text-zinc-500 py-8">No categories found.</TableCell></TableRow>
            ) : (
              categories.map((category) => (
                <TableRow key={category.id} className="border-white/10 hover:bg-white/5">
                  <TableCell className="font-medium text-white">{category.order}</TableCell>
                  <TableCell className="text-zinc-300">{category.name}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(category)} className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(category.id)} className="text-red-400 hover:text-red-300 hover:bg-red-400/10">
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
