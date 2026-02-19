import { useState } from 'react'
import { Play } from 'lucide-react'

export default function SignalSimulator({ campaignId, apiUrl }) {
  const base = apiUrl || ''
  const [signals, setSignals] = useState({
    geo_country: '', geo_city: '', weather_temp: '', weather_condition: '', daypart: '',
  })
  const [result, setResult] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')

  const handlePreview = () => {
    const params = new URLSearchParams()
    Object.entries(signals).forEach(([k, v]) => {
      if (v) params.set(`signal_${k}`, v)
    })
    const url = `${base}/ad/${campaignId}/simulate?${params.toString()}`
    setPreviewUrl(url)

    fetch(url)
      .then((r) => r.json())
      .then(setResult)
      .catch(() => setResult(null))
  }

  const set = (k, v) => setSignals({ ...signals, [k]: v })

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Signal Simulator</h2>
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600">Country</label>
            <input value={signals.geo_country} onChange={(e) => set('geo_country', e.target.value)} placeholder="US" className="border rounded-md px-3 py-2 w-full text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">City</label>
            <input value={signals.geo_city} onChange={(e) => set('geo_city', e.target.value)} placeholder="New York" className="border rounded-md px-3 py-2 w-full text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Temperature</label>
            <input type="number" value={signals.weather_temp} onChange={(e) => set('weather_temp', e.target.value)} placeholder="25" className="border rounded-md px-3 py-2 w-full text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Weather</label>
            <select value={signals.weather_condition} onChange={(e) => set('weather_condition', e.target.value)} className="border rounded-md px-3 py-2 w-full text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
              <option value="">Any</option>
              <option value="clear">Clear</option>
              <option value="clouds">Clouds</option>
              <option value="rain">Rain</option>
              <option value="snow">Snow</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Daypart</label>
            <select value={signals.daypart} onChange={(e) => set('daypart', e.target.value)} className="border rounded-md px-3 py-2 w-full text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
              <option value="">Auto</option>
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="evening">Evening</option>
              <option value="night">Night</option>
            </select>
          </div>
        </div>
        <button onClick={handlePreview} className="flex items-center gap-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm">
          <Play size={14} /> Preview
        </button>
      </div>

      {previewUrl && (
        <div className="mt-6 space-y-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Ad Preview</h3>
            <iframe src={`${previewUrl}&format=html`} className="w-full border rounded" style={{ height: 300 }} title="Simulated Ad" />
          </div>
          {result && (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Debug Info</h3>
              <pre className="text-xs bg-gray-50 rounded p-3 overflow-auto max-h-60">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
