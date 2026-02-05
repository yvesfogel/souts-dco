import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import AdBuilder from '../components/AdBuilder'
import { api } from '../lib/api'

export default function AdBuilderPage() {
  const { id: campaignId, variantId } = useParams()
  const navigate = useNavigate()
  const [campaign, setCampaign] = useState(null)
  const [variant, setVariant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [campaignId, variantId])

  const loadData = async () => {
    try {
      const campaignData = await api.getCampaign(campaignId)
      setCampaign(campaignData)
      
      if (variantId) {
        const variantData = campaignData.variants?.find(v => v.id === variantId)
        setVariant(variantData)
      }
    } catch (err) {
      console.error('Failed to load data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (template) => {
    setSaving(true)
    try {
      // Save template to campaign settings or variant
      if (variantId && variant) {
        await api.updateVariant(campaignId, variantId, {
          settings: {
            ...variant.settings,
            customTemplate: template,
          },
        })
      } else {
        await api.updateCampaign(campaignId, {
          settings: {
            ...campaign.settings,
            customTemplate: template,
          },
        })
      }
      
      alert('Template saved!')
      navigate(`/campaigns/${campaignId}`)
    } catch (err) {
      alert('Failed to save: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  // Get initial elements from variant or campaign settings
  const getInitialElements = () => {
    const settings = variant?.settings || campaign?.settings
    if (settings?.customTemplate?.elements) {
      return settings.customTemplate.elements
    }
    
    // Convert variant data to builder elements
    if (variant) {
      return [
        {
          id: 'bg',
          type: 'background',
          locked: true,
          style: {
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          },
        },
        variant.image_url && {
          id: 'image',
          type: 'image',
          src: variant.image_url,
          style: {
            top: '10%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '120px',
            height: '80px',
            objectFit: 'contain',
          },
        },
        {
          id: 'headline',
          type: 'text',
          content: variant.headline || 'Headline',
          style: {
            top: '35%',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#ffffff',
            textAlign: 'center',
            width: '80%',
          },
        },
        variant.body_text && {
          id: 'body',
          type: 'text',
          content: variant.body_text,
          style: {
            top: '55%',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '14px',
            color: '#ffffff',
            opacity: 0.9,
            textAlign: 'center',
            width: '80%',
          },
        },
        {
          id: 'cta',
          type: 'button',
          content: variant.cta_text || 'Learn More',
          url: variant.cta_url || '#',
          style: {
            bottom: '15%',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '10px 28px',
            backgroundColor: '#ffffff',
            color: '#667eea',
            borderRadius: '25px',
            fontWeight: 'bold',
            fontSize: '14px',
          },
        },
      ].filter(Boolean)
    }
    
    return null // Use defaults
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to={`/campaigns/${campaignId}`} className="text-gray-500 hover:text-gray-700">
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1 className="text-xl font-bold">
              Ad Builder
            </h1>
            <p className="text-sm text-gray-500">
              {campaign?.name}
              {variant && ` → ${variant.name}`}
            </p>
          </div>
        </div>
      </header>

      {/* Builder */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <AdBuilder
          campaignId={campaignId}
          initialElements={getInitialElements()}
          onSave={handleSave}
        />
      </main>
    </div>
  )
}
