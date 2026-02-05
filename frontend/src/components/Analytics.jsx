import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Globe, Sun, Cloud, MousePointer } from 'lucide-react'

export default function Analytics({ campaignId }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(7)

  useEffect(() => {
    loadStats()
  }, [campaignId, days])

  const loadStats = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/analytics/campaigns/${campaignId}/stats?days=${days}`, {
        headers: {
          'Authorization': `Bearer ${(await import('../lib/supabase')).supabase.auth.getSession().then(s => s.data.session?.access_token)}`,
        },
      })
      const data = await response.json()
      setStats(data)
    } catch (err) {
      console.error('Failed to load stats:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!stats) return null

  const maxImpressions = Math.max(...(stats.variants?.map(v => v.impressions) || [1]))

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <BarChart3 size={18} />
          Analytics
        </h3>
        <select
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value))}
          className="text-sm border border-gray-300 rounded px-2 py-1"
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-indigo-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-indigo-600">
            {stats.total_impressions.toLocaleString()}
          </div>
          <div className="text-xs text-gray-600">Impressions</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">
            {(stats.total_clicks || 0).toLocaleString()}
          </div>
          <div className="text-xs text-gray-600">Clicks</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">
            {stats.ctr || 0}%
          </div>
          <div className="text-xs text-gray-600">CTR</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">
            {stats.variants?.length || 0}
          </div>
          <div className="text-xs text-gray-600">Variants</div>
        </div>
      </div>

      {/* Variant Breakdown */}
      {stats.variants?.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">By Variant</h4>
          <div className="space-y-2">
            {stats.variants.map((variant) => (
              <div key={variant.variant_id} className="flex items-center gap-3">
                <div className="w-24 text-sm truncate" title={variant.variant_name}>
                  {variant.variant_name}
                </div>
                <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all"
                    style={{ width: `${(variant.impressions / maxImpressions) * 100}%` }}
                  />
                </div>
                <div className="w-16 text-sm text-right text-gray-600">
                  {variant.impressions.toLocaleString()}
                </div>
                <div className="w-12 text-sm text-right text-blue-600" title="Clicks">
                  {(variant.clicks || 0).toLocaleString()}
                </div>
                <div className="w-14 text-sm text-right text-green-600" title="CTR">
                  {variant.ctr || 0}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily Chart */}
      {stats.daily?.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Daily Trend</h4>
          <div className="flex items-end gap-1 h-24">
            {stats.daily.map((day) => {
              const maxDaily = Math.max(...stats.daily.map(d => d.total))
              const height = maxDaily > 0 ? (day.total / maxDaily) * 100 : 0
              return (
                <div
                  key={day.date}
                  className="flex-1 bg-indigo-200 hover:bg-indigo-400 rounded-t transition-colors cursor-pointer group relative"
                  style={{ height: `${Math.max(height, 4)}%` }}
                  title={`${day.date}: ${day.total} impressions`}
                >
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    {day.date}: {day.total}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{stats.daily[0]?.date}</span>
            <span>{stats.daily[stats.daily.length - 1]?.date}</span>
          </div>
        </div>
      )}

      {/* Signal Insights */}
      {stats.total_impressions > 0 && (
        <div className="grid grid-cols-3 gap-4 text-sm">
          {/* Top Countries */}
          <div>
            <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-1">
              <Globe size={14} />
              Countries
            </h4>
            <div className="space-y-1">
              {stats.signals?.top_countries?.slice(0, 3).map(([country, count]) => (
                <div key={country} className="flex justify-between text-gray-600">
                  <span className="truncate">{country}</span>
                  <span>{count}</span>
                </div>
              ))}
              {(!stats.signals?.top_countries || stats.signals.top_countries.length === 0) && (
                <div className="text-gray-400">No data</div>
              )}
            </div>
          </div>

          {/* Dayparts */}
          <div>
            <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-1">
              <Sun size={14} />
              Daypart
            </h4>
            <div className="space-y-1">
              {Object.entries(stats.signals?.dayparts || {}).slice(0, 3).map(([daypart, count]) => (
                <div key={daypart} className="flex justify-between text-gray-600">
                  <span className="capitalize">{daypart}</span>
                  <span>{count}</span>
                </div>
              ))}
              {Object.keys(stats.signals?.dayparts || {}).length === 0 && (
                <div className="text-gray-400">No data</div>
              )}
            </div>
          </div>

          {/* Weather */}
          <div>
            <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-1">
              <Cloud size={14} />
              Weather
            </h4>
            <div className="space-y-1">
              {Object.entries(stats.signals?.weather || {}).slice(0, 3).map(([weather, count]) => (
                <div key={weather} className="flex justify-between text-gray-600">
                  <span className="capitalize">{weather}</span>
                  <span>{count}</span>
                </div>
              ))}
              {Object.keys(stats.signals?.weather || {}).length === 0 && (
                <div className="text-gray-400">No data</div>
              )}
            </div>
          </div>
        </div>
      )}

      {stats.total_impressions === 0 && (
        <div className="text-center py-8 text-gray-500">
          <TrendingUp size={32} className="mx-auto mb-2 opacity-50" />
          <p>No impressions yet</p>
          <p className="text-sm">Share your ad URL to start collecting data</p>
        </div>
      )}
    </div>
  )
}
