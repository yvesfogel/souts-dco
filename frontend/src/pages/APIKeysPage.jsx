import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Plus, Copy, Trash2 } from 'lucide-react'
import { api } from '../lib/api'

export default function APIKeysPage() {
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [newKey, setNewKey] = useState(null)
  const [form, setForm] = useState({ name: '', scopes: ['read'], expires_in_days: '' })

  const load = async () => {
    try {
      const data = await api.getApiKeys()
      setKeys(Array.isArray(data) ? data : data.keys || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const SCOPES = ['read', 'write', 'admin', 'serve']

  const toggleScope = (scope) => {
    setForm((f) => ({
      ...f,
      scopes: f.scopes.includes(scope) ? f.scopes.filter((s) => s !== scope) : [...f.scopes, scope],
    }))
  }

  const handleCreate = async () => {
    try {
      const payload = { name: form.name, scopes: form.scopes }
      if (form.expires_in_days) payload.expires_in_days = parseInt(form.expires_in_days)
      const data = await api.createApiKey(payload)
      setNewKey(data)
      setShowModal(false)
      setForm({ name: '', scopes: ['read'], expires_in_days: '' })
      load()
    } catch (e) {
      alert(e.message)
    }
  }

  const handleRevoke = async (id) => {
    if (!confirm('Revoke this API key?')) return
    try {
      await api.revokeApiKey(id)
      load()
    } catch (e) {
      alert(e.message)
    }
  }

  const copyKey = (text) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-gray-500 hover:text-gray-700"><ArrowLeft size={20} /></Link>
            <h1 className="text-xl font-bold">API Keys</h1>
          </div>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-1 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
            <Plus size={16} /> Create Key
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {newKey && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-sm font-medium text-green-800 mb-2">API Key created! Copy it now - it won't be shown again.</p>
            <div className="flex items-center gap-2">
              <code className="bg-white border rounded px-3 py-1 text-sm flex-1 break-all">{newKey.key || newKey.api_key}</code>
              <button onClick={() => copyKey(newKey.key || newKey.api_key)} className="text-indigo-600 hover:text-indigo-800"><Copy size={16} /></button>
            </div>
            <button onClick={() => setNewKey(null)} className="text-sm text-green-700 mt-2 hover:underline">Dismiss</button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : keys.length === 0 ? (
          <div className="text-center py-20 text-gray-500">No API keys yet.</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Prefix</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Scopes</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Last Used</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {keys.map((k) => (
                  <tr key={k.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{k.name}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{k.prefix || k.key_prefix || '****'}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {(k.scopes || []).map((s) => (
                          <span key={s} className="bg-indigo-50 text-indigo-700 text-xs px-2 py-0.5 rounded">{s}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{k.created_at ? new Date(k.created_at).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-3 text-gray-500">{k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'Never'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${k.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {k.is_active !== false ? 'Active' : 'Revoked'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {k.is_active !== false && (
                        <button onClick={() => handleRevoke(k.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Create API Key</h2>
            <div className="space-y-4">
              <input
                placeholder="Key name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="border rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Scopes</label>
                <div className="flex gap-2 flex-wrap">
                  {SCOPES.map((s) => (
                    <label key={s} className="flex items-center gap-1 text-sm">
                      <input type="checkbox" checked={form.scopes.includes(s)} onChange={() => toggleScope(s)} className="rounded" />
                      {s}
                    </label>
                  ))}
                </div>
              </div>
              <input
                type="number"
                placeholder="Expires in days (optional)"
                value={form.expires_in_days}
                onChange={(e) => setForm({ ...form, expires_in_days: e.target.value })}
                className="border rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={handleCreate} disabled={!form.name} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
