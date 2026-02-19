import { useState } from 'react'
import { Plus, Trash2, Edit2, Star } from 'lucide-react'
import { api } from '../lib/api'

export default function VariantGrid({ campaignId, variants, onReload }) {
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [adding, setAdding] = useState(false)

  const blank = { headline: '', body: '', image_url: '', cta_text: '', cta_url: '', weight: 1, is_default: false }

  const startEdit = (v) => {
    setEditing(v.id)
    setForm({ headline: v.headline || '', body: v.body || '', image_url: v.image_url || '', cta_text: v.cta_text || '', cta_url: v.cta_url || '', weight: v.weight ?? 1, is_default: v.is_default || false })
  }

  const saveEdit = async () => {
    try {
      await api.updateVariant(campaignId, editing, form)
      setEditing(null)
      onReload()
    } catch (e) { alert(e.message) }
  }

  const handleAdd = async () => {
    try {
      await api.createVariant(campaignId, { ...form })
      setAdding(false)
      setForm({})
      onReload()
    } catch (e) { alert(e.message) }
  }

  const handleDelete = async (vid) => {
    if (!confirm('Delete this variant?')) return
    try {
      await api.deleteVariant(campaignId, vid)
      onReload()
    } catch (e) { alert(e.message) }
  }

  const renderForm = (onSave, onCancel) => (
    <div className="bg-white rounded-lg shadow p-4 space-y-3">
      <input placeholder="Headline" value={form.headline || ''} onChange={(e) => setForm({ ...form, headline: e.target.value })} className="border rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
      <textarea placeholder="Body" value={form.body || ''} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={2} className="border rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
      <input placeholder="Image URL" value={form.image_url || ''} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="border rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
      <div className="grid grid-cols-2 gap-3">
        <input placeholder="CTA Text" value={form.cta_text || ''} onChange={(e) => setForm({ ...form, cta_text: e.target.value })} className="border rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
        <input placeholder="CTA URL" value={form.cta_url || ''} onChange={(e) => setForm({ ...form, cta_url: e.target.value })} className="border rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
      </div>
      <div className="flex items-center gap-4">
        <label className="text-sm">Weight: <input type="number" min="0" max="100" value={form.weight ?? 1} onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })} className="border rounded px-2 py-1 w-20 ml-1" /></label>
        <label className="text-sm flex items-center gap-1"><input type="checkbox" checked={form.is_default || false} onChange={(e) => setForm({ ...form, is_default: e.target.checked })} /> Default</label>
      </div>
      <div className="flex gap-2">
        <button onClick={onSave} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm">Save</button>
        <button onClick={onCancel} className="text-gray-600 hover:text-gray-800 text-sm">Cancel</button>
      </div>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Variants ({variants.length})</h2>
        <button onClick={() => { setAdding(true); setForm(blank) }} className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 text-sm">
          <Plus size={14} /> Add Variant
        </button>
      </div>

      {adding && renderForm(handleAdd, () => setAdding(false))}

      {variants.length === 0 && !adding && (
        <div className="text-center py-12 text-gray-500">No variants yet. Add your first variant above.</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 mt-4">
        {variants.map((v) =>
          editing === v.id ? (
            <div key={v.id}>{renderForm(saveEdit, () => setEditing(null))}</div>
          ) : (
            <div key={v.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-1">
                  {v.is_default && <Star size={14} className="text-yellow-500 fill-yellow-500" />}
                  <h3 className="font-medium">{v.headline || 'Untitled'}</h3>
                </div>
                <span className="text-xs text-gray-400">w: {v.weight ?? 1}</span>
              </div>
              {v.image_url && <img src={v.image_url} alt="" className="w-full h-24 object-cover rounded mb-2" />}
              <p className="text-sm text-gray-600 line-clamp-2 mb-2">{v.body}</p>
              {v.cta_text && <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">{v.cta_text}</span>}
              <div className="flex gap-2 mt-3">
                <button onClick={() => startEdit(v)} className="text-gray-400 hover:text-indigo-600"><Edit2 size={14} /></button>
                <button onClick={() => handleDelete(v.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}
