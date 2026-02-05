import { Type, Image, MousePointer, Square } from 'lucide-react'

const ELEMENT_TYPES = [
  { type: 'text', icon: Type, label: 'Text' },
  { type: 'image', icon: Image, label: 'Image' },
  { type: 'button', icon: MousePointer, label: 'Button' },
  { type: 'shape', icon: Square, label: 'Shape' },
]

export default function ElementPanel({ onAddElement }) {
  return (
    <div className="w-20 bg-white border-r border-gray-200 p-2 flex flex-col gap-1">
      <div className="text-xs font-medium text-gray-500 text-center mb-2">
        Elements
      </div>
      
      {ELEMENT_TYPES.map(({ type, icon: Icon, label }) => (
        <button
          key={type}
          onClick={() => onAddElement(type)}
          className="flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-gray-100 transition-colors"
          title={`Add ${label}`}
        >
          <Icon size={20} className="text-gray-600" />
          <span className="text-xs text-gray-500">{label}</span>
        </button>
      ))}

      <div className="flex-1" />
      
      <div className="text-xs text-gray-400 text-center p-2">
        Drag to canvas or click to add
      </div>
    </div>
  )
}
