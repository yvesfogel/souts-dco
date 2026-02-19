import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Copy, Trash2, Key, LogOut, Search } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'

export default function Dashboard() {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const load = async () => {
    try {
      const data = await api.getCampaigns()
      setCampaigns(Array.isArray(data) ? data : data.campaigns || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    setCreating(true)
    try {
      const c = await api.createCampaign({ name: 'Untitled Campaign' })
      navigate(`/campaigns/${c.id}`)
    } catch (e) {
      alert(e.message)
    } finally {
      setCreating(false)
    }
  }

  const handleDuplicate = async (e, id) => {
    e.stopPropagation()
    try {
      await api.duplicateCampaign(id)
      load()
    } catch (e) {
      alert(e.message)
    }
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    if (!confirm('Delete this campaign?')) return
    try {
      await api.deleteCampaign(id)
      setCampaigns((prev) => prev.filter((c) => c.id !== id))
    } catch (e) {
      alert(e.message)
    }
  }

  const filtered = campaigns.filter((c) =>
    c.name?.toLowerCase().includes(search.toLowerCase())
  )

  const statusColor = { draft: 'bg-gray-100 text-gray-700', active: 'bg-green-100 text-green-700', paused: 'bg-yellow-100 text-yellow-700' }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-indigo-600">SOUTS DCO</h1>
          <div className="flex items-center gap-3 text-sm">
            <Link to="/api-keys" className="flex items-center gap-1 text-gray-600 hover:text-indigo-600">
              <Key size={16} /> API Keys
            </Link>
            <span className="text-gray-500">{user?.email}</span>
            <button onClick={signOut} className="flex items-center gap-1 text-gray-600 hover:text-red-600">
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              placeholder="Search campaigns..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border rounded-md pl-9 pr-3 py-2 w-64 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <button onClick={handleCreate} disabled={creating} className="flex items-center gap-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50">
            <Plus size={16} /> New Campaign
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            {search ? 'No campaigns match your search.' : 'No campaigns yet. Create your first one!'}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <div
                key={c.id}
                onClick={() => navigate(`/campaigns/${c.id}`)}
                className="bg-white rounded-lg shadow p-5 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 truncate">{c.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[c.status] || statusColor.draft}`}>
                    {c.status || 'draft'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-4">
                  Created {new Date(c.created_at).toLocaleDateString()}
                </p>
                <div className="flex gap-2">
                  <button onClick={(e) => handleDuplicate(e, c.id)} className="text-gray-400 hover:text-indigo-600" title="Duplicate">
                    <Copy size={16} />
                  </button>
                  <button onClick={(e) => handleDelete(e, c.id)} className="text-gray-400 hover:text-red-600" title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
