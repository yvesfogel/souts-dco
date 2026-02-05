import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Save, ChevronDown, ChevronUp } from 'lucide-react'
import { api } from '../lib/api'
import SignalSimulator from '../components/SignalSimulator'
import RulesBuilder from '../components/RulesBuilder'

export default function CampaignDetail() {
  const { id } = useParams()
  const [campaign, setCampaign] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [expandedVariant, setExpandedVariant] = useState(null)
  const [showSimulator, setShowSimulator] = useState(true)

  useEffect(() => {
    loadCampaign()
  }, [id])

  const loadCampaign = async () => {
    try {
      const data = await api.getCampaign(id)
      setCampaign(data)
    } catch (err) {
      console.error('Failed to load campaign:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.updateCampaign(id, {
        name: campaign.name,
        description: campaign.description,
        active: campaign.active,
      })
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleAddVariant = async () => {
    const name = prompt('Variant name:')
    if (!name) return
    
    try {
      await api.createVariant(id, {
        name,
        headline: 'New Headline',
        cta_text: 'Learn More',
        cta_url: 'https://example.com',
        is_default: (campaign.variants?.length || 0) === 0,
      })
      loadCampaign()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleDeleteVariant = async (variantId) => {
    if (!confirm('Delete this variant?')) return
    try {
      await api.deleteVariant(id, variantId)
      loadCampaign()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleUpdateVariant = async (variantId, data) => {
    try {
      await api.updateVariant(id, variantId, data)
      // Don't reload, just update locally for responsiveness
    } catch (err) {
      alert(err.message)
    }
  }

  const handleSaveRule = async (rule) => {
    try {
      if (rule.id) {
        await api.updateRule(id, rule.id, rule)
      } else {
        await api.createRule(id, rule)
      }
      loadCampaign()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleDeleteRule = async (ruleId) => {
    if (!confirm('Delete this rule?')) return
    try {
      await api.deleteRule(id, ruleId)
      loadCampaign()
    } catch (err) {
      alert(err.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Campaign not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/" className="text-gray-500 hover:text-gray-700">
            <ArrowLeft size={24} />
          </Link>
          <input
            type="text"
            value={campaign.name}
            onChange={(e) => setCampaign({ ...campaign, name: e.target.value })}
            className="text-2xl font-bold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded px-2 -mx-2"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Signal Simulator */}
        <div className="mb-8">
          <button
            onClick={() => setShowSimulator(!showSimulator)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3"
          >
            {showSimulator ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            Signal Simulator
          </button>
          {showSimulator && (
            <SignalSimulator campaignId={id} />
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Settings */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-5 sticky top-24">
              <h3 className="font-semibold mb-4">Settings</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={campaign.description || ''}
                    onChange={(e) => setCampaign({ ...campaign, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    rows={3}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={campaign.active}
                    onChange={(e) => setCampaign({ ...campaign, active: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="active" className="text-sm">
                    Campaign Active
                  </label>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500 mb-2">Ad URL:</p>
                  <code className="text-xs bg-gray-100 p-2 rounded block break-all">
                    {window.location.origin}/ad/{campaign.id}
                  </code>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500 mb-2">Stats:</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="text-2xl font-bold text-indigo-600">
                        {campaign.variants?.length || 0}
                      </div>
                      <div className="text-xs text-gray-500">Variants</div>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <div className="text-2xl font-bold text-indigo-600">
                        {campaign.rules?.length || 0}
                      </div>
                      <div className="text-xs text-gray-500">Rules</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Variants */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Variants ({campaign.variants?.length || 0})</h3>
                <button
                  onClick={handleAddVariant}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  <Plus size={16} />
                  Add Variant
                </button>
              </div>

              <div className="space-y-3">
                {campaign.variants?.map((variant) => (
                  <div
                    key={variant.id}
                    className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                  >
                    {/* Variant Header */}
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                      onClick={() => setExpandedVariant(expandedVariant === variant.id ? null : variant.id)}
                    >
                      <div className="flex items-center gap-3">
                        {expandedVariant === variant.id ? (
                          <ChevronUp size={18} className="text-gray-400" />
                        ) : (
                          <ChevronDown size={18} className="text-gray-400" />
                        )}
                        <h4 className="font-medium">{variant.name}</h4>
                        {variant.is_default && (
                          <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                            Default
                          </span>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteVariant(variant.id)
                        }}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Variant Details */}
                    {expandedVariant === variant.id && (
                      <div className="p-4 pt-0 border-t border-gray-100">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              Headline
                            </label>
                            <input
                              type="text"
                              defaultValue={variant.headline}
                              onBlur={(e) => handleUpdateVariant(variant.id, { headline: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              CTA Text
                            </label>
                            <input
                              type="text"
                              defaultValue={variant.cta_text}
                              onBlur={(e) => handleUpdateVariant(variant.id, { cta_text: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              Body Text
                            </label>
                            <textarea
                              defaultValue={variant.body_text || ''}
                              onBlur={(e) => handleUpdateVariant(variant.id, { body_text: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              rows={2}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              CTA URL
                            </label>
                            <input
                              type="url"
                              defaultValue={variant.cta_url}
                              onBlur={(e) => handleUpdateVariant(variant.id, { cta_url: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                              Image URL
                            </label>
                            <input
                              type="url"
                              defaultValue={variant.image_url || ''}
                              onBlur={(e) => handleUpdateVariant(variant.id, { image_url: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              placeholder="https://..."
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={variant.is_default}
                              onChange={(e) => handleUpdateVariant(variant.id, { is_default: e.target.checked })}
                              className="rounded"
                            />
                            Default variant
                          </label>
                          <a
                            href={`/ad/${campaign.id}/preview?variant_id=${variant.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-indigo-600 hover:underline"
                          >
                            Preview →
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {(!campaign.variants || campaign.variants.length === 0) && (
                  <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
                    <p className="text-gray-500">No variants yet. Add your first one!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Rules */}
            <div>
              <h3 className="font-semibold mb-4">
                Rules ({campaign.rules?.length || 0})
              </h3>
              
              {campaign.variants?.length > 0 ? (
                <RulesBuilder
                  campaignId={id}
                  variants={campaign.variants}
                  rules={campaign.rules || []}
                  onSave={handleSaveRule}
                  onDelete={handleDeleteRule}
                />
              ) : (
                <div className="text-center py-8 bg-white rounded-lg border border-gray-200">
                  <p className="text-gray-500">Create at least one variant before adding rules.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
