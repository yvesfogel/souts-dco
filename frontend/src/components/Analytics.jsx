import { useState, useEffect } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { api } from '../lib/api'

export default function Analytics({ campaignId }) {
  const [days, setDays] = useState(7)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.getCampaignStats(campaignId, days)
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [campaignId, days])

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
  if (!stats) return <div className="text-center py-12 text-gray-500">No analytics data available.</div>

  const totalImpressions = stats.total_impressions ?? stats.impressions ?? 0
  const totalClicks = stats.total_clicks ?? stats.clicks ?? 0
  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00'
  const dailyData = stats.daily || stats.time_series || []
  const variantData = stats.by_variant || stats.variants || []

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Analytics</h2>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Impressions', value: totalImpressions.toLocaleString() },
          { label: 'Clicks', value: totalClicks.toLocaleString() },
          { label: 'CTR', value: `${ctr}%` },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-2xl font-bold text-indigo-600">{kpi.value}</p>
            <p className="text-sm text-gray-500">{kpi.label}</p>
          </div>
        ))}
      </div>

      {dailyData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Impressions Over Time</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="impressions" stroke="#4f46e5" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="clicks" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {variantData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Clicks by Variant</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={variantData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="variant_name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="clicks" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
