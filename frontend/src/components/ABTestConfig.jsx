import { useState, useEffect } from 'react'
import { Shuffle, Scale, Target } from 'lucide-react'

const MODES = [
  {
    value: 'rules',
    label: 'Rules + Weights',
    icon: Target,
    description: 'Try rules first, then use weights for unmatched traffic',
  },
  {
    value: 'weights',
    label: 'Pure A/B Test',
    icon: Shuffle,
    description: 'Ignore rules, split traffic by variant weights only',
  },
  {
    value: 'off',
    label: 'Off (Default Only)',
    icon: Scale,
    description: 'Always show the default variant',
  },
]

export default function ABTestConfig({ campaign, variants, onUpdateCampaign, onUpdateVariant }) {
  const [mode, setMode] = useState(campaign?.ab_test_mode || 'rules')
  const [weights, setWeights] = useState({})
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    // Initialize weights from variants
    const w = {}
    variants?.forEach(v => {
      w[v.id] = v.weight ?? 100
    })
    setWeights(w)
  }, [variants])

  const handleModeChange = async (newMode) => {
    setMode(newMode)
    await onUpdateCampaign({ ab_test_mode: newMode })
  }

  const handleWeightChange = (variantId, value) => {
    const newWeight = Math.max(0, Math.min(100, parseInt(value) || 0))
    setWeights({ ...weights, [variantId]: newWeight })
    setDirty(true)
  }

  const handleSaveWeights = async () => {
    for (const [variantId, weight] of Object.entries(weights)) {
      const original = variants.find(v => v.id === variantId)
      if (original && original.weight !== weight) {
        await onUpdateVariant(variantId, { weight })
      }
    }
    setDirty(false)
  }

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Shuffle size={18} />
        A/B Testing
      </h3>

      {/* Mode Selection */}
      <div className="grid gap-2 mb-6">
        {MODES.map((m) => {
          const Icon = m.icon
          return (
            <button
              key={m.value}
              onClick={() => handleModeChange(m.value)}
              className={`flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-colors ${
                mode === m.value
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Icon
                size={20}
                className={mode === m.value ? 'text-indigo-600' : 'text-gray-400'}
              />
              <div>
                <div className={`font-medium ${mode === m.value ? 'text-indigo-900' : ''}`}>
                  {m.label}
                </div>
                <div className="text-sm text-gray-500">{m.description}</div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Weight Configuration */}
      {mode !== 'off' && variants?.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-700">Traffic Weights</h4>
            {dirty && (
              <button
                onClick={handleSaveWeights}
                className="text-sm text-indigo-600 hover:underline"
              >
                Save Changes
              </button>
            )}
          </div>

          <div className="space-y-3">
            {variants.map((variant) => {
              const weight = weights[variant.id] ?? 100
              const percentage = totalWeight > 0 ? Math.round((weight / totalWeight) * 100) : 0

              return (
                <div key={variant.id} className="flex items-center gap-3">
                  <div className="w-32 text-sm truncate" title={variant.name}>
                    {variant.name}
                    {variant.is_default && (
                      <span className="ml-1 text-xs text-gray-400">(default)</span>
                    )}
                  </div>
                  
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={weight}
                    onChange={(e) => handleWeightChange(variant.id, e.target.value)}
                    className="flex-1"
                  />
                  
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={weight}
                    onChange={(e) => handleWeightChange(variant.id, e.target.value)}
                    className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                  />
                  
                  <div className="w-12 text-sm text-gray-500 text-right">
                    {percentage}%
                  </div>
                </div>
              )
            })}
          </div>

          {/* Visual Distribution */}
          <div className="mt-4 h-4 rounded-full overflow-hidden flex bg-gray-100">
            {variants.map((variant, index) => {
              const weight = weights[variant.id] ?? 100
              const percentage = totalWeight > 0 ? (weight / totalWeight) * 100 : 0
              const colors = [
                'bg-indigo-500',
                'bg-purple-500',
                'bg-pink-500',
                'bg-blue-500',
                'bg-green-500',
                'bg-yellow-500',
                'bg-orange-500',
              ]
              return (
                <div
                  key={variant.id}
                  className={`${colors[index % colors.length]} transition-all`}
                  style={{ width: `${percentage}%` }}
                  title={`${variant.name}: ${Math.round(percentage)}%`}
                />
              )
            })}
          </div>

          <div className="flex flex-wrap gap-2 mt-2">
            {variants.map((variant, index) => {
              const colors = [
                'bg-indigo-500',
                'bg-purple-500',
                'bg-pink-500',
                'bg-blue-500',
                'bg-green-500',
                'bg-yellow-500',
                'bg-orange-500',
              ]
              return (
                <div key={variant.id} className="flex items-center gap-1 text-xs">
                  <div className={`w-3 h-3 rounded ${colors[index % colors.length]}`} />
                  <span className="text-gray-600">{variant.name}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {mode !== 'off' && (!variants || variants.length < 2) && (
        <p className="text-sm text-gray-500">
          Add at least 2 variants to configure A/B testing.
        </p>
      )}
    </div>
  )
}
