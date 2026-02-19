import { useState, useEffect } from 'react'
import { RefreshCw, Eye } from 'lucide-react'
import { api } from '../lib/api'

const POOL_TYPES = ['headline', 'body', 'cta_text', 'cta_url', 'image']

export default function ComponentPools({ campaignId, onReload }) {
  const [pools, setPools] = useState({})
  const [inputs, setInputs] = useState({})
  const [totalCombinations, setTotalCombinations] = useState(0)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  const load = async () => {
    try {
      const data = await api.getPools(campaignId)
      const p = data.pools || data || {}
      setPools(p)
      const inp = {}
      POOL_TYPES.forEach((t) => { inp[t] = (p[t]?.values || p[t] || []).join('\n') })
      setInputs(inp)
      setTotalCombinations(data.total_combinations || 0)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [campaignId])

  const savePool = async (type) => {
    const values = inputs[type].split('\n').map((v) => v.trim()).filter(Boolean)
    if (!values.length) return
    try {
      await api.upsertPool(campaignId, type, { values })
      load()
    } catch (e) { alert(e.message) }
  }

  const generate = async () => {
    if (!confirm('This will generate all variant combinations. Continue?')) return
    setGenerating(true)
    try {
      await api.generateVariants(campaignId)
      onReload()
    } catch (e) { alert(e.message) }
    finally { setGenerating(false) }
  }

  const showPreview = async () => {
    try {
      const data = await api.previewPools(campaignId)
      setPreview(data)
    } catch (e) { alert(e.message) }
  }

  const counts = POOL_TYPES.map((t) => inputs[t]?.split('\n').filter((v) => v.trim()).length || 0)
  const estimatedCombinations = counts.reduce((a, b) => a * (b || 1), 1)

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Component Pools</h2>
        <div className="flex gap-2">
          <button onClick={showPreview} className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-sm border border-indigo-200 px-3 py-1.5 rounded-md">
            <Eye size={14} /> Preview
          </button>
          <button onClick={generate} disabled={generating} className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 text-sm disabled:opacity-50">
            <RefreshCw size={14} className={generating ? 'animate-spin' : ''} /> Generate Variants
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-4">Estimated combinations: <span className="font-semibold text-indigo-600">{estimatedCombinations}</span></p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {POOL_TYPES.map((type) => (
          <div key={type} className="bg-white rounded-lg shadow p-4">
            <label className="text-sm font-medium text-gray-700 capitalize mb-1 block">{type.replace('_', ' ')}</label>
            <textarea
              rows={4}
              placeholder={`One ${type} per line...`}
              value={inputs[type] || ''}
              onChange={(e) => setInputs({ ...inputs, [type]: e.target.value })}
              className="border rounded-md px-3 py-2 w-full text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <button onClick={() => savePool(type)} className="mt-2 text-sm text-indigo-600 hover:text-indigo-800">Save Pool</button>
          </div>
        ))}
      </div>

      {preview && (
        <div className="mt-6 bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Preview Combinations ({Array.isArray(preview) ? preview.length : preview.combinations?.length || 0})</h3>
          <div className="max-h-60 overflow-auto">
            <pre className="text-xs bg-gray-50 rounded p-3">{JSON.stringify(preview, null, 2)}</pre>
          </div>
          <button onClick={() => setPreview(null)} className="text-sm text-gray-500 mt-2 hover:underline">Close</button>
        </div>
      )}
    </div>
  )
}
