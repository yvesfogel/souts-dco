import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { api } from '../lib/api'
import VariantGrid from '../components/VariantGrid'
import RulesBuilder from '../components/RulesBuilder'
import SignalSimulator from '../components/SignalSimulator'
import AssetLibrary from '../components/AssetLibrary'
import ComponentPools from '../components/ComponentPools'
import ABTestConfig from '../components/ABTestConfig'
import Scheduling from '../components/Scheduling'
import EmbedCode from '../components/EmbedCode'
import Analytics from '../components/Analytics'
import TemplateSelector from '../components/TemplateSelector'

const TABS = ['Variants', 'Rules', 'Assets', 'Pools', 'A/B Test', 'Schedule', 'Analytics', 'Embed', 'Preview']

export default function CampaignDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [campaign, setCampaign] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('Variants')
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await api.getCampaign(id)
      setCampaign(data)
      setName(data.name)
    } catch (e) {
      alert(e.message)
      navigate('/')
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => { load() }, [load])

  const save = async (updates) => {
    setSaving(true)
    try {
      const data = await api.updateCampaign(id, updates)
      setCampaign(data)
      if (updates.name) setName(data.name)
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleNameBlur = () => {
    if (name !== campaign?.name) save({ name })
  }

  const toggleStatus = () => {
    const next = campaign.status === 'active' ? 'paused' : 'active'
    save({ status: next })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  const statusColor = { draft: 'bg-gray-200 text-gray-700', active: 'bg-green-200 text-green-800', paused: 'bg-yellow-200 text-yellow-800' }
  const apiUrl = import.meta.env.VITE_API_URL || ''

  const renderTab = () => {
    const props = { campaignId: id, campaign, onReload: load }
    switch (tab) {
      case 'Variants': return <VariantGrid {...props} variants={campaign.variants || []} />
      case 'Rules': return <RulesBuilder {...props} rules={campaign.rules || []} variants={campaign.variants || []} />
      case 'Assets': return <AssetLibrary campaignId={id} />
      case 'Pools': return <ComponentPools campaignId={id} onReload={load} />
      case 'A/B Test': return <ABTestConfig campaign={campaign} onSave={save} variants={campaign.variants || []} />
      case 'Schedule': return <Scheduling campaign={campaign} onSave={save} />
      case 'Analytics': return <Analytics campaignId={id} />
      case 'Embed': return <EmbedCode campaignId={id} apiUrl={apiUrl} />
      case 'Preview': return <SignalSimulator campaignId={id} apiUrl={apiUrl} />
      default: return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-3">
            <button onClick={() => navigate('/')} className="text-gray-500 hover:text-gray-700">
              <ArrowLeft size={20} />
            </button>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleNameBlur}
              className="text-xl font-bold border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none px-1 py-0.5"
            />
            <button
              onClick={toggleStatus}
              className={`text-xs px-3 py-1 rounded-full font-medium ${statusColor[campaign.status] || statusColor.draft}`}
            >
              {campaign.status || 'draft'}
            </button>
            <TemplateSelector
              value={campaign.template || 'default'}
              onChange={(template) => save({ template })}
            />
            {saving && <span className="text-xs text-gray-400">Saving...</span>}
          </div>
          <nav className="flex gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-2 text-sm rounded-t-md whitespace-nowrap ${
                  tab === t ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {t}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {renderTab()}

        {tab === 'Preview' ? null : (
          <div className="mt-8">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Live Preview</h3>
            <div className="bg-white rounded-lg shadow p-4">
              <iframe
                src={`${apiUrl}/ad/${id}?format=html`}
                className="w-full border rounded"
                style={{ height: 300 }}
                title="Ad Preview"
              />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
