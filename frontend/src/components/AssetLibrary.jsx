import { useState, useEffect, useCallback } from 'react'
import { 
  Image, Upload, Trash2, Copy, Check, 
  Grid, List, Search, X, FolderOpen 
} from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function AssetLibrary({ campaignId, onSelect, selectable = false }) {
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [viewMode, setViewMode] = useState('grid')
  const [search, setSearch] = useState('')
  const [selectedAsset, setSelectedAsset] = useState(null)
  const [copied, setCopied] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    loadAssets()
  }, [campaignId])

  const loadAssets = async () => {
    setLoading(true)
    try {
      const { data: session } = await supabase.auth.getSession()
      const response = await fetch(`/api/assets/${campaignId}`, {
        headers: {
          'Authorization': `Bearer ${session.session?.access_token}`,
        },
      })
      const data = await response.json()
      setAssets(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Failed to load assets:', err)
      setAssets([])
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (files) => {
    if (!files || files.length === 0) return
    
    setUploading(true)
    setUploadProgress(0)
    
    const { data: session } = await supabase.auth.getSession()
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} is not an image`)
        continue
      }
      
      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert(`${file.name} is too large (max 10MB)`)
        continue
      }
      
      const formData = new FormData()
      formData.append('campaign_id', campaignId)
      formData.append('name', file.name.replace(/\.[^/.]+$/, ''))
      formData.append('file', file)
      
      try {
        await fetch('/api/assets/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.session?.access_token}`,
          },
          body: formData,
        })
        
        setUploadProgress(((i + 1) / files.length) * 100)
      } catch (err) {
        console.error(`Failed to upload ${file.name}:`, err)
      }
    }
    
    setUploading(false)
    setUploadProgress(0)
    loadAssets()
  }

  const handleDelete = async (assetId) => {
    if (!confirm('Delete this asset?')) return
    
    try {
      const { data: session } = await supabase.auth.getSession()
      await fetch(`/api/assets/${assetId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.session?.access_token}`,
        },
      })
      loadAssets()
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  const handleCopy = async (url) => {
    await navigator.clipboard.writeText(url)
    setCopied(url)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const files = e.dataTransfer?.files
    if (files) handleUpload(Array.from(files))
  }, [])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const filteredAssets = assets.filter(asset => 
    asset.name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Image size={18} />
            Asset Library
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assets..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Upload Zone */}
      <div
        className={`m-4 p-6 border-2 border-dashed rounded-lg text-center transition-colors ${
          dragOver 
            ? 'border-indigo-500 bg-indigo-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {uploading ? (
          <div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div 
                className="bg-indigo-600 h-2 rounded-full transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-sm text-gray-500">Uploading... {Math.round(uploadProgress)}%</p>
          </div>
        ) : (
          <>
            <Upload className="mx-auto mb-2 text-gray-400" size={24} />
            <p className="text-sm text-gray-600 mb-2">
              Drag & drop images here, or
            </p>
            <label className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg cursor-pointer hover:bg-indigo-700 text-sm">
              Browse Files
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleUpload(Array.from(e.target.files || []))}
              />
            </label>
            <p className="text-xs text-gray-400 mt-2">
              JPEG, PNG, GIF, WebP • Max 10MB
            </p>
          </>
        )}
      </div>

      {/* Assets */}
      <div className="p-4 pt-0">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FolderOpen size={32} className="mx-auto mb-2 opacity-50" />
            <p>{search ? 'No assets match your search' : 'No assets yet'}</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-3 gap-3">
            {filteredAssets.map((asset) => (
              <div
                key={asset.id}
                className={`group relative rounded-lg overflow-hidden border-2 transition-colors cursor-pointer ${
                  selectedAsset?.id === asset.id 
                    ? 'border-indigo-500' 
                    : 'border-transparent hover:border-gray-300'
                }`}
                onClick={() => {
                  setSelectedAsset(asset)
                  if (selectable && onSelect) {
                    onSelect(asset)
                  }
                }}
              >
                <img
                  src={asset.url}
                  alt={asset.name}
                  className="w-full h-24 object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCopy(asset.url)
                    }}
                    className="p-2 bg-white rounded-full shadow"
                    title="Copy URL"
                  >
                    {copied === asset.url ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(asset.id)
                    }}
                    className="p-2 bg-white rounded-full shadow text-red-500"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-xs text-white truncate">{asset.name}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredAssets.map((asset) => (
              <div
                key={asset.id}
                className={`flex items-center gap-3 p-2 rounded-lg border transition-colors cursor-pointer ${
                  selectedAsset?.id === asset.id 
                    ? 'border-indigo-500 bg-indigo-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => {
                  setSelectedAsset(asset)
                  if (selectable && onSelect) {
                    onSelect(asset)
                  }
                }}
              >
                <img
                  src={asset.url}
                  alt={asset.name}
                  className="w-12 h-12 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{asset.name}</p>
                  <p className="text-xs text-gray-500">
                    {asset.content_type} • {Math.round(asset.size_bytes / 1024)}KB
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCopy(asset.url)
                    }}
                    className="p-2 hover:bg-gray-100 rounded"
                    title="Copy URL"
                  >
                    {copied === asset.url ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(asset.id)
                    }}
                    className="p-2 hover:bg-red-50 text-red-500 rounded"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Asset Details */}
      {selectedAsset && !selectable && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-start gap-3">
            <img
              src={selectedAsset.url}
              alt={selectedAsset.name}
              className="w-20 h-20 object-cover rounded"
            />
            <div className="flex-1">
              <p className="font-medium">{selectedAsset.name}</p>
              <p className="text-xs text-gray-500 mt-1">
                {selectedAsset.content_type} • {Math.round(selectedAsset.size_bytes / 1024)}KB
              </p>
              <input
                type="text"
                value={selectedAsset.url}
                readOnly
                className="w-full mt-2 px-2 py-1 text-xs bg-white border border-gray-300 rounded"
                onClick={(e) => e.target.select()}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
