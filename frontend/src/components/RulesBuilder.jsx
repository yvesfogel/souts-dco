import { useState } from 'react'
import { Plus, Trash2, Edit2 } from 'lucide-react'
import { api } from '../lib/api'

const SIGNALS = [
  'geo_country', 'geo_city', 'geo_region', 'weather_condition', 'weather_temp',
  'weather_is_hot', 'weather_is_cold', 'daypart', 'daypart_is_morning',
  'daypart_is_afternoon', 'daypart_is_evening', 'daypart_is_night', 'daypart_is_weekend',
  'user_agent', 'referer',
]
const OPERATORS = ['equals', 'not_equals', 'contains', 'not_contains', 'gt', 'lt', 'gte', 'lte', 'in', 'regex']

export default function RulesBuilder({ campaignId, rules, variants, onReload }) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ signal: 'geo_country', operator: 'equals', value: '', variant_id: '', priority: 0 })

  const blank = { signal: 'geo_country', operator: 'equals', value: '', variant_id: variants[0]?.id || '', priority: rules.length }

  const handleSave = async () => {
    try {
      if (editing) {
        await api.updateRule(campaignId, editing, form)
      } else {
        await api.createRule(campaignId, form)
      }
      setAdding(false)
      setEditing(null)
      onReload()
    } catch (e) { alert(e.message) }
  }

  const handleDelete = async (rid) => {
    if (!confirm('Delete this rule?')) return
    try { await api.deleteRule(campaignId, rid); onReload() } catch (e) { alert(e.message) }
  }

  const startEdit = (r) => {
    setEditing(r.id)
    setForm({ signal: r.signal, operator: r.operator, value: r.value, variant_id: r.variant_id, priority: r.priority ?? 0 })
    setAdding(true)
  }

  const variantName = (vid) => variants.find((v) => v.id === vid)?.headline || vid?.slice(0, 8)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Rules ({rules.length})</h2>
        <button onClick={() => { setAdding(true); setEditing(null); setForm(blank) }} className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 text-sm">
          <Plus size={14} /> Add Rule
        </button>
      </div>

      {adding && (
        <div className="bg-white rounded-lg shadow p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <select value={form.signal} onChange={(e) => setForm({ ...form, signal: e.target.value })} className="border rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm">
              {SIGNALS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={form.operator} onChange={(e) => setForm({ ...form, operator: e.target.value })} className="border rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm">
              {OPERATORS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <input placeholder="Value" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="border rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm" />
            <input type="number" placeholder="Priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} className="border rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm" />
          </div>
          <select value={form.variant_id} onChange={(e) => setForm({ ...form, variant_id: e.target.value })} className="border rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm">
            <option value="">Select variant...</option>
            {variants.map((v) => <option key={v.id} value={v.id}>{v.headline || v.id}</option>)}
          </select>
          <div className="flex gap-2">
            <button onClick={handleSave} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm">{editing ? 'Update' : 'Create'}</button>
            <button onClick={() => { setAdding(false); setEditing(null) }} className="text-gray-600 hover:text-gray-800 text-sm">Cancel</button>
          </div>
        </div>
      )}

      {rules.length === 0 && !adding && (
        <div className="text-center py-12 text-gray-500">No rules yet. Rules determine which variant to show based on signals.</div>
      )}

      <div className="space-y-2">
        {rules.map((r) => (
          <div key={r.id} className="bg-white rounded-lg shadow px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono">{r.signal}</span>
              <span className="text-gray-500">{r.operator}</span>
              <span className="font-medium">{r.value}</span>
              <span className="text-gray-400">-&gt;</span>
              <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">{variantName(r.variant_id)}</span>
              <span className="text-xs text-gray-400">P{r.priority ?? 0}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => startEdit(r)} className="text-gray-400 hover:text-indigo-600"><Edit2 size={14} /></button>
              <button onClick={() => handleDelete(r.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
