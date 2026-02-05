import { useState } from 'react'
import { Play, RefreshCw } from 'lucide-react'

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'AR', name: 'Argentina' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'ES', name: 'Spain' },
  { code: 'DE', name: 'Germany' },
  { code: 'GB', name: 'United Kingdom' },
]

const WEATHER_CONDITIONS = [
  { value: 'clear', label: '☀️ Clear' },
  { value: 'clouds', label: '☁️ Cloudy' },
  { value: 'rain', label: '🌧️ Rain' },
  { value: 'drizzle', label: '🌦️ Drizzle' },
  { value: 'thunderstorm', label: '⛈️ Thunderstorm' },
  { value: 'snow', label: '❄️ Snow' },
]

const DAYPARTS = [
  { value: 'morning', label: '🌅 Morning (5-12h)' },
  { value: 'afternoon', label: '☀️ Afternoon (12-17h)' },
  { value: 'evening', label: '🌆 Evening (17-21h)' },
  { value: 'night', label: '🌙 Night (21-5h)' },
]

export default function SignalSimulator({ campaignId, onSimulate }) {
  const [signals, setSignals] = useState({
    geo_country: 'Uruguay',
    geo_country_code: 'UY',
    geo_city: 'Montevideo',
    weather_condition: 'clear',
    weather_temp: 22,
    weather_is_hot: false,
    weather_is_cold: false,
    weather_is_rainy: false,
    daypart: 'afternoon',
    daypart_is_weekend: false,
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const updateSignal = (key, value) => {
    const updated = { ...signals, [key]: value }
    
    // Auto-compute derived signals
    if (key === 'weather_temp') {
      updated.weather_is_hot = value >= 30
      updated.weather_is_cold = value < 15
    }
    if (key === 'weather_condition') {
      updated.weather_is_rainy = ['rain', 'drizzle', 'thunderstorm'].includes(value)
    }
    if (key === 'geo_country_code') {
      const country = COUNTRIES.find(c => c.code === value)
      updated.geo_country = country?.name || value
    }
    
    setSignals(updated)
  }

  const handleSimulate = async () => {
    setLoading(true)
    try {
      // Build query string with signals
      const params = new URLSearchParams()
      params.set('format', 'json')
      Object.entries(signals).forEach(([k, v]) => {
        params.set(`signal_${k}`, String(v))
      })
      
      const response = await fetch(`/ad/${campaignId}/simulate?${params}`)
      const data = await response.json()
      setResult(data)
      onSimulate?.(data)
    } catch (err) {
      console.error('Simulation failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        🎮 Signal Simulator
      </h3>
      
      <div className="grid gap-4 md:grid-cols-3">
        {/* Geo */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Country
          </label>
          <select
            value={signals.geo_country_code}
            onChange={(e) => updateSignal('geo_country_code', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            {COUNTRIES.map(c => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            City
          </label>
          <input
            type="text"
            value={signals.geo_city}
            onChange={(e) => updateSignal('geo_city', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        {/* Weather */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Weather
          </label>
          <select
            value={signals.weather_condition}
            onChange={(e) => updateSignal('weather_condition', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            {WEATHER_CONDITIONS.map(w => (
              <option key={w.value} value={w.value}>{w.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Temperature: {signals.weather_temp}°C
            {signals.weather_is_hot && ' 🔥'}
            {signals.weather_is_cold && ' 🥶'}
          </label>
          <input
            type="range"
            min="-10"
            max="45"
            value={signals.weather_temp}
            onChange={(e) => updateSignal('weather_temp', parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Daypart */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            Time of Day
          </label>
          <select
            value={signals.daypart}
            onChange={(e) => updateSignal('daypart', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            {DAYPARTS.map(d => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={signals.daypart_is_weekend}
              onChange={(e) => updateSignal('daypart_is_weekend', e.target.checked)}
              className="rounded"
            />
            Weekend
          </label>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
        <button
          onClick={handleSimulate}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? <RefreshCw size={18} className="animate-spin" /> : <Play size={18} />}
          Simulate
        </button>
        
        {result?.variant && (
          <span className="text-sm text-gray-600">
            → <strong>{result.variant.name}</strong>
          </span>
        )}
      </div>

      {/* Preview iframe */}
      {result?.variant && (
        <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-100 px-3 py-2 text-xs text-gray-500 flex items-center justify-between">
            <span>Preview: {result.variant.name}</span>
            <span className="text-gray-400">
              {result.matched_rule || 'Default variant'}
            </span>
          </div>
          <iframe
            srcDoc={result.html}
            className="w-full h-64 bg-white"
            title="Ad Preview"
          />
        </div>
      )}
    </div>
  )
}
