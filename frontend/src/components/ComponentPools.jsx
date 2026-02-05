import { useState, useEffect } from 'react'
import { 
  Layers, Plus, X, Wand2, Eye, Trash2, 
  Type, FileText, MousePointer, Link, Image 
} from 'lucide-react'
import { supabase } from '../lib/supabase'

const POOL_CONFIG = {
  headline: { icon: Type, label: 'Headlines', placeholder: 'Enter headline...' },
  body: { icon: FileText, label: 'Body Text', placeholder: 'Enter body text...' },
  cta_text: { icon: MousePointer, label: 'CTA Text', placeholder: 'Enter CTA text...' },
  cta_url: { icon: Link, label: 'CTA URLs', placeholder: 'https://...' },
  image: { icon: Image, label: 'Images', placeholder: 'Image URL...' },
}

export default function ComponentPools({ campaignId, onGenerate }) {
  const [pools, setPools] = useState({
    headline: [],
    body: [],
    cta_text: [],
    cta_url: [],
    image: [],
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [preview, setPreview] = useState(null)
  const [newItems, setNewItems] = useState({})
  const [totalCombinations, setTotalCombinations] = useState(0)

  useEffect(() => {
    loadPools()
  }, [campaignId])

  useEffect(() => {
    // Calculate combinations
    const counts = Object.values(pools).map(arr => arr.length || 1)
    const total = counts.reduce((a, b) => a * b, 1)
    setTotalCombinations(pools.headline.length > 0 ? total : 0)
  }, [pools])

  const loadPools = async () => {
    setLoading(true)
    try {
      const { data: session } = await supabase.auth.getSession()
      const response = await fetch(`/api/pools/${campaignId}`, {
        headers: {
          'Authorization': `Bearer ${session.session?.access_token}`,
        },
      })
      const data = await response.json()
      setPools(data.pools || {
        headline: [],
        body: [],
        cta_text: [],
        cta_url: [],
        image: [],
      })
    } catch (err) {
      console.error('Failed to load pools:', err)
    } finally {
      setLoading(false)
    }
  }

  const savePool = async (type, items) => {
    setSaving(true)
    try {
      const { data: session } = await supabase.auth.getSession()
      await fetch(`/api/pools/${campaignId}/${type}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type, items }),
      })
    } catch (err) {
      console.error('Failed to save pool:', err)
    } finally {
      setSaving(false)
    }
  }

  const addItem = async (type) => {
    const value = newItems[type]?.trim()
    if (!value) return
    
    const updated = [...pools[type], value]
    setPools({ ...pools, [type]: updated })
    setNewItems({ ...newItems, [type]: '' })
    await savePool(type, updated)
  }

  const removeItem = async (type, index) => {
    const updated = pools[type].filter((_, i) => i !== index)
    setPools({ ...pools, [type]: updated })
    await savePool(type, updated)
  }

  const handleGenerate = async () => {
    if (totalCombinations === 0) {
      alert('Add at least one headline to generate variants')
      return
    }
    
    if (totalCombinations > 100) {
      if (!confirm(`This will generate ${totalCombinations} variants. Continue?`)) {
        return
      }
    }
    
    setGenerating(true)
    try {
      const { data: session } = await supabase.auth.getSession()
      const response = await fetch(`/api/pools/${campaignId}/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          max_variants: 100,
          name_template: 'Auto #{n}',
        }),
      })
      const data = await response.json()
      alert(`Generated ${data.generated} variants!`)
      if (onGenerate) onGenerate()
    } catch (err) {
      console.error('Failed to generate:', err)
      alert('Failed to generate variants')
    } finally {
      setGenerating(false)
    }
  }

  const loadPreview = async () => {
    try {
      const { data: session } = await supabase.auth.getSession()
      const response = await fetch(`/api/pools/${campaignId}/preview`, {
        headers: {
          'Authorization': `Bearer ${session.session?.access_token}`,
        },
      })
      const data = await response.json()
      setPreview(data)
    } catch (err) {
      console.error('Failed to load preview:', err)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Layers size={18} />
            Component Pools
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {totalCombinations > 0 ? (
                <span className="font-medium text-indigo-600">{totalCombinations}</span>
              ) : (
                <span>0</span>
              )} possible variants
            </span>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Define pools of creative components. The system will auto-generate all combinations.
        </p>
      </div>

      {/* Pools */}
      <div className="p-4 space-y-4">
        {Object.entries(POOL_CONFIG).map(([type, config]) => {
          const Icon = config.icon
          const items = pools[type] || []
          
          return (
            <div key={type} className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Icon size={16} className="text-gray-500" />
                <span className="font-medium text-sm">{config.label}</span>
                <span className="text-xs text-gray-400">({items.length})</span>
              </div>
              
              {/* Items */}
              <div className="flex flex-wrap gap-2 mb-2">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-sm group"
                  >
                    <span className="max-w-[200px] truncate" title={item}>
                      {type === 'image' ? (
                        <img src={item} alt="" className="w-6 h-6 object-cover rounded inline mr-1" />
                      ) : null}
                      {type === 'image' ? 'Image' : item}
                    </span>
                    <button
                      onClick={() => removeItem(type, index)}
                      className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              
              {/* Add new */}
              <div className="flex gap-2">
                <input
                  type={type === 'cta_url' || type === 'image' ? 'url' : 'text'}
                  value={newItems[type] || ''}
                  onChange={(e) => setNewItems({ ...newItems, [type]: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && addItem(type)}
                  placeholder={config.placeholder}
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm"
                />
                <button
                  onClick={() => addItem(type)}
                  disabled={!newItems[type]?.trim()}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm disabled:opacity-50"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-gray-200 flex items-center justify-between">
        <button
          onClick={loadPreview}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <Eye size={16} />
          Preview
        </button>
        
        <button
          onClick={handleGenerate}
          disabled={generating || totalCombinations === 0}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          <Wand2 size={16} />
          {generating ? 'Generating...' : `Generate ${totalCombinations} Variants`}
        </button>
      </div>

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold">Preview Combinations</h4>
              <button onClick={() => setPreview(null)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(preview.counts).map(([key, count]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-gray-500 capitalize">{key}:</span>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between font-medium">
                <span>Total combinations:</span>
                <span className="text-indigo-600">{preview.total_combinations}</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm text-gray-500">Sample variants:</p>
              {preview.sample.map((combo, i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-lg text-sm">
                  <div className="font-medium">{combo.headline || '(no headline)'}</div>
                  {combo.body && <div className="text-gray-600 text-xs mt-1">{combo.body}</div>}
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded">
                      {combo.cta_text}
                    </span>
                    {combo.image && <span>+ image</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
