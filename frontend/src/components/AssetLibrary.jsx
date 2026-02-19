import { useState, useEffect, useRef } from 'react'
import { Upload, Trash2, Copy, Search } from 'lucide-react'
import { api } from '../lib/api'

export default function AssetLibrary({ campaignId }) {
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [filter, setFilter] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef()

  const load = async () => {
    try {
      const data = await api.getAssets(campaignId)
      setAssets(Array.isArray(data) ? data : data.assets || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [campaignId])

  const upload = async (files) => {
    setUploading(true)
    try {
      for (const file of files) {
        await api.uploadAsset(campaignId, file.name, file)
      }
      load()
    } catch (e) { alert(e.message) }
    finally { setUploading(false) }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length) upload(e.dataTransfer.files)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this asset?')) return
    try { await api.deleteAsset(id); load() } catch (e) { alert(e.message) }
  }

  const copyUrl = (url) => navigator.clipboard.writeText(url)

  const filtered = assets.filter((a) => (a.name || '').toLowerCase().includes(filter.toLowerCase()))

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Assets</h2>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer mb-4 transition-colors ${dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'}`}
      >
        <Upload size={24} className="mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-500">{uploading ? 'Uploading...' : 'Drop files here or click to upload'}</p>
        <p className="text-xs text-gray-400 mt-1">JPG, PNG, GIF, WEBP</p>
        <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => upload(e.target.files)} />
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
        <input placeholder="Filter assets..." value={filter} onChange={(e) => setFilter(e.target.value)} className="border rounded-md pl-9 pr-3 py-2 w-full focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No assets uploaded yet.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((a) => (
            <div key={a.id} className="bg-white rounded-lg shadow overflow-hidden group">
              <img src={a.url} alt={a.name} className="w-full h-32 object-cover" />
              <div className="p-2">
                <p className="text-xs text-gray-700 truncate">{a.name}</p>
                <div className="flex gap-1 mt-1">
                  <button onClick={() => copyUrl(a.url)} className="text-gray-400 hover:text-indigo-600" title="Copy URL"><Copy size={14} /></button>
                  <button onClick={() => handleDelete(a.id)} className="text-gray-400 hover:text-red-600" title="Delete"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
