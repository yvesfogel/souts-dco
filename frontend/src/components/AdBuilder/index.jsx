import { useState, useCallback } from 'react'
import { 
  Type, Image, MousePointer, Square, Palette, 
  Move, Trash2, Copy, Layers, Eye, Save,
  AlignLeft, AlignCenter, AlignRight
} from 'lucide-react'
import BuilderCanvas from './BuilderCanvas'
import ElementPanel from './ElementPanel'
import PropertiesPanel from './PropertiesPanel'

const DEFAULT_ELEMENTS = [
  {
    id: 'bg',
    type: 'background',
    locked: true,
    style: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    },
  },
  {
    id: 'headline',
    type: 'text',
    content: 'Your Headline Here',
    style: {
      top: '20%',
      left: '50%',
      transform: 'translateX(-50%)',
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#ffffff',
      textAlign: 'center',
      width: '80%',
    },
  },
  {
    id: 'body',
    type: 'text',
    content: 'Add your message here',
    style: {
      top: '40%',
      left: '50%',
      transform: 'translateX(-50%)',
      fontSize: '16px',
      color: '#ffffff',
      opacity: 0.9,
      textAlign: 'center',
      width: '80%',
    },
  },
  {
    id: 'cta',
    type: 'button',
    content: 'Learn More',
    url: 'https://example.com',
    style: {
      bottom: '15%',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '12px 32px',
      backgroundColor: '#ffffff',
      color: '#667eea',
      borderRadius: '25px',
      fontWeight: 'bold',
      fontSize: '14px',
      cursor: 'pointer',
    },
  },
]

export default function AdBuilder({ 
  initialElements = null, 
  width = 300, 
  height = 250,
  onSave,
  campaignId 
}) {
  const [elements, setElements] = useState(initialElements || DEFAULT_ELEMENTS)
  const [selectedId, setSelectedId] = useState(null)
  const [canvasSize, setCanvasSize] = useState({ width, height })
  const [showPreview, setShowPreview] = useState(false)
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  const selectedElement = elements.find(el => el.id === selectedId)

  // Save to history for undo
  const saveHistory = useCallback(() => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(JSON.stringify(elements))
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }, [elements, history, historyIndex])

  const updateElement = useCallback((id, updates) => {
    setElements(prev => prev.map(el => 
      el.id === id ? { ...el, ...updates } : el
    ))
  }, [])

  const updateElementStyle = useCallback((id, styleUpdates) => {
    setElements(prev => prev.map(el => 
      el.id === id ? { ...el, style: { ...el.style, ...styleUpdates } } : el
    ))
  }, [])

  const addElement = useCallback((type) => {
    const id = `${type}-${Date.now()}`
    let newElement = {
      id,
      type,
      style: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      },
    }

    switch (type) {
      case 'text':
        newElement.content = 'New Text'
        newElement.style = {
          ...newElement.style,
          fontSize: '18px',
          color: '#ffffff',
        }
        break
      case 'image':
        newElement.src = ''
        newElement.style = {
          ...newElement.style,
          width: '100px',
          height: '100px',
          objectFit: 'contain',
        }
        break
      case 'button':
        newElement.content = 'Click Me'
        newElement.url = '#'
        newElement.style = {
          ...newElement.style,
          padding: '10px 24px',
          backgroundColor: '#ffffff',
          color: '#667eea',
          borderRadius: '20px',
          fontWeight: 'bold',
        }
        break
      case 'shape':
        newElement.style = {
          ...newElement.style,
          width: '80px',
          height: '80px',
          backgroundColor: 'rgba(255,255,255,0.2)',
          borderRadius: '8px',
        }
        break
    }

    saveHistory()
    setElements(prev => [...prev, newElement])
    setSelectedId(id)
  }, [saveHistory])

  const deleteElement = useCallback((id) => {
    if (id === 'bg') return // Can't delete background
    saveHistory()
    setElements(prev => prev.filter(el => el.id !== id))
    setSelectedId(null)
  }, [saveHistory])

  const duplicateElement = useCallback((id) => {
    const el = elements.find(e => e.id === id)
    if (!el || el.id === 'bg') return
    
    const newId = `${el.type}-${Date.now()}`
    const newElement = {
      ...JSON.parse(JSON.stringify(el)),
      id: newId,
      style: {
        ...el.style,
        top: `calc(${el.style.top} + 20px)`,
        left: `calc(${el.style.left} + 20px)`,
      },
    }
    
    saveHistory()
    setElements(prev => [...prev, newElement])
    setSelectedId(newId)
  }, [elements, saveHistory])

  const moveElement = useCallback((id, direction) => {
    const index = elements.findIndex(el => el.id === id)
    if (index === -1) return

    const newElements = [...elements]
    if (direction === 'up' && index < newElements.length - 1) {
      [newElements[index], newElements[index + 1]] = [newElements[index + 1], newElements[index]]
    } else if (direction === 'down' && index > 1) { // Don't go below background
      [newElements[index], newElements[index - 1]] = [newElements[index - 1], newElements[index]]
    }
    
    setElements(newElements)
  }, [elements])

  const handleSave = async () => {
    const template = {
      elements,
      canvasSize,
      version: 1,
    }
    
    if (onSave) {
      await onSave(template)
    }
  }

  const exportAsJSON = () => {
    const data = JSON.stringify({ elements, canvasSize }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ad-template-${Date.now()}.json`
    a.click()
  }

  return (
    <div className="flex h-[700px] bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
      {/* Left Panel - Elements */}
      <ElementPanel onAddElement={addElement} />

      {/* Center - Canvas */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <select
              value={`${canvasSize.width}x${canvasSize.height}`}
              onChange={(e) => {
                const [w, h] = e.target.value.split('x').map(Number)
                setCanvasSize({ width: w, height: h })
              }}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="300x250">300×250 (Medium Rectangle)</option>
              <option value="728x90">728×90 (Leaderboard)</option>
              <option value="160x600">160×600 (Wide Skyscraper)</option>
              <option value="300x600">300×600 (Half Page)</option>
              <option value="320x50">320×50 (Mobile Banner)</option>
              <option value="970x250">970×250 (Billboard)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`p-2 rounded ${showPreview ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100'}`}
              title="Preview"
            >
              <Eye size={18} />
            </button>
            <button
              onClick={exportAsJSON}
              className="p-2 rounded hover:bg-gray-100"
              title="Export JSON"
            >
              <Copy size={18} />
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              <Save size={16} />
              Save Template
            </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 overflow-auto p-8 flex items-center justify-center bg-gray-200">
          <BuilderCanvas
            elements={elements}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onUpdate={updateElement}
            onUpdateStyle={updateElementStyle}
            width={canvasSize.width}
            height={canvasSize.height}
            preview={showPreview}
          />
        </div>
      </div>

      {/* Right Panel - Properties */}
      <PropertiesPanel
        element={selectedElement}
        onUpdate={(updates) => updateElement(selectedId, updates)}
        onUpdateStyle={(updates) => updateElementStyle(selectedId, updates)}
        onDelete={() => deleteElement(selectedId)}
        onDuplicate={() => duplicateElement(selectedId)}
        onMoveUp={() => moveElement(selectedId, 'up')}
        onMoveDown={() => moveElement(selectedId, 'down')}
      />
    </div>
  )
}
