import { useState } from 'react'

const MODES = [
  { value: 'off', label: 'Off', desc: 'No A/B testing, use rules only' },
  { value: 'rules', label: 'Rules Only', desc: 'Select variant based on signal rules' },
  { value: 'weighted', label: 'Weighted', desc: 'Distribute traffic by weight' },
  { value: 'rules_then_weighted', label: 'Rules + Weighted', desc: 'Try rules first, fallback to weighted' },
]

export default function ABTestConfig({ campaign, onSave, variants }) {
  const [mode, setMode] = useState(campaign.ab_test_mode || 'off')

  const handleModeChange = (val) => {
    setMode(val)
    onSave({ ab_test_mode: val })
  }

  const totalWeight = variants.reduce((s, v) => s + (v.weight ?? 1), 0)

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">A/B Testing</h2>
      <div className="bg-white rounded-lg shadow p-4 space-y-3">
        {MODES.map((m) => (
          <label key={m.value} className={`flex items-start gap-3 p-3 rounded-md cursor-pointer border ${mode === m.value ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'}`}>
            <input type="radio" name="ab_mode" value={m.value} checked={mode === m.value} onChange={() => handleModeChange(m.value)} className="mt-0.5" />
            <div>
              <p className="font-medium text-sm">{m.label}</p>
              <p className="text-xs text-gray-500">{m.desc}</p>
            </div>
          </label>
        ))}
      </div>

      {(mode === 'weighted' || mode === 'rules_then_weighted') && variants.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Weight Distribution</h3>
          <div className="space-y-3">
            {variants.map((v) => {
              const pct = totalWeight > 0 ? Math.round(((v.weight ?? 1) / totalWeight) * 100) : 0
              return (
                <div key={v.id} className="flex items-center gap-3">
                  <span className="text-sm w-32 truncate">{v.headline || 'Untitled'}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                    <div className="bg-indigo-600 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm text-gray-600 w-12 text-right">{pct}%</span>
                  <span className="text-xs text-gray-400 w-8">w:{v.weight ?? 1}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
