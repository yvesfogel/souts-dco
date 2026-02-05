import { 
  Trash2, Copy, ChevronUp, ChevronDown,
  AlignLeft, AlignCenter, AlignRight, Bold, Italic
} from 'lucide-react'

export default function PropertiesPanel({
  element,
  onUpdate,
  onUpdateStyle,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
}) {
  if (!element) {
    return (
      <div className="w-64 bg-white border-l border-gray-200 p-4">
        <div className="text-gray-400 text-sm text-center mt-8">
          Select an element to edit its properties
        </div>
      </div>
    )
  }

  const { style = {} } = element

  const renderColorInput = (label, prop, defaultValue = '#ffffff') => (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <div className="flex gap-2">
        <input
          type="color"
          value={style[prop]?.startsWith('#') ? style[prop] : defaultValue}
          onChange={(e) => onUpdateStyle({ [prop]: e.target.value })}
          className="w-8 h-8 rounded cursor-pointer"
        />
        <input
          type="text"
          value={style[prop] || ''}
          onChange={(e) => onUpdateStyle({ [prop]: e.target.value })}
          placeholder={defaultValue}
          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
        />
      </div>
    </div>
  )

  const renderSizeInput = (label, prop, unit = 'px') => (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <div className="flex gap-1">
        <input
          type="number"
          value={parseInt(style[prop]) || ''}
          onChange={(e) => onUpdateStyle({ [prop]: `${e.target.value}${unit}` })}
          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
        />
        <span className="text-xs text-gray-400 self-center">{unit}</span>
      </div>
    </div>
  )

  return (
    <div className="w-64 bg-white border-l border-gray-200 overflow-y-auto">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 flex items-center justify-between">
        <div>
          <div className="font-medium text-sm capitalize">{element.type}</div>
          <div className="text-xs text-gray-400">{element.id}</div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={onMoveUp}
            className="p-1 hover:bg-gray-100 rounded"
            title="Bring Forward"
          >
            <ChevronUp size={16} />
          </button>
          <button
            onClick={onMoveDown}
            className="p-1 hover:bg-gray-100 rounded"
            title="Send Backward"
          >
            <ChevronDown size={16} />
          </button>
          <button
            onClick={onDuplicate}
            className="p-1 hover:bg-gray-100 rounded"
            title="Duplicate"
          >
            <Copy size={16} />
          </button>
          {element.id !== 'bg' && (
            <button
              onClick={onDelete}
              className="p-1 hover:bg-red-100 text-red-500 rounded"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="p-3 space-y-4">
        {/* Content */}
        {(element.type === 'text' || element.type === 'button') && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Content</label>
            <textarea
              value={element.content || ''}
              onChange={(e) => onUpdate({ content: e.target.value })}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
              rows={2}
            />
          </div>
        )}

        {/* URL for buttons */}
        {element.type === 'button' && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Link URL</label>
            <input
              type="url"
              value={element.url || ''}
              onChange={(e) => onUpdate({ url: e.target.value })}
              placeholder="https://..."
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
        )}

        {/* Image source */}
        {element.type === 'image' && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Image URL</label>
            <input
              type="url"
              value={element.src || ''}
              onChange={(e) => onUpdate({ src: e.target.value })}
              placeholder="https://..."
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
        )}

        {/* Typography (for text and buttons) */}
        {(element.type === 'text' || element.type === 'button') && (
          <>
            <div className="border-t border-gray-100 pt-3">
              <div className="text-xs font-medium text-gray-700 mb-2">Typography</div>
              
              {renderSizeInput('Font Size', 'fontSize')}
              
              <div className="mt-2">
                <label className="block text-xs text-gray-500 mb-1">Font Weight</label>
                <select
                  value={style.fontWeight || 'normal'}
                  onChange={(e) => onUpdateStyle({ fontWeight: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="normal">Normal</option>
                  <option value="500">Medium</option>
                  <option value="600">Semibold</option>
                  <option value="bold">Bold</option>
                </select>
              </div>

              <div className="mt-2">
                <label className="block text-xs text-gray-500 mb-1">Align</label>
                <div className="flex gap-1">
                  {['left', 'center', 'right'].map((align) => (
                    <button
                      key={align}
                      onClick={() => onUpdateStyle({ textAlign: align })}
                      className={`flex-1 p-2 rounded border ${
                        style.textAlign === align 
                          ? 'bg-indigo-50 border-indigo-300' 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {align === 'left' && <AlignLeft size={14} className="mx-auto" />}
                      {align === 'center' && <AlignCenter size={14} className="mx-auto" />}
                      {align === 'right' && <AlignRight size={14} className="mx-auto" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Colors */}
        <div className="border-t border-gray-100 pt-3">
          <div className="text-xs font-medium text-gray-700 mb-2">Colors</div>
          
          {element.type === 'background' && renderColorInput('Background', 'background', '#667eea')}
          {element.type !== 'background' && element.type !== 'image' && (
            <>
              {renderColorInput('Text Color', 'color', '#ffffff')}
              {(element.type === 'button' || element.type === 'shape') && 
                renderColorInput('Background', 'backgroundColor', '#ffffff')}
            </>
          )}
        </div>

        {/* Size (for shapes and images) */}
        {(element.type === 'shape' || element.type === 'image') && (
          <div className="border-t border-gray-100 pt-3">
            <div className="text-xs font-medium text-gray-700 mb-2">Size</div>
            <div className="grid grid-cols-2 gap-2">
              {renderSizeInput('Width', 'width')}
              {renderSizeInput('Height', 'height')}
            </div>
          </div>
        )}

        {/* Border Radius */}
        {element.type !== 'text' && element.type !== 'background' && (
          <div className="border-t border-gray-100 pt-3">
            <div className="text-xs font-medium text-gray-700 mb-2">Border</div>
            {renderSizeInput('Radius', 'borderRadius')}
          </div>
        )}

        {/* Padding (for buttons) */}
        {element.type === 'button' && (
          <div className="border-t border-gray-100 pt-3">
            <div className="text-xs font-medium text-gray-700 mb-2">Padding</div>
            <input
              type="text"
              value={style.padding || '12px 24px'}
              onChange={(e) => onUpdateStyle({ padding: e.target.value })}
              placeholder="12px 24px"
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
        )}

        {/* Opacity */}
        {element.type !== 'background' && (
          <div className="border-t border-gray-100 pt-3">
            <div className="text-xs font-medium text-gray-700 mb-2">Opacity</div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={style.opacity || 1}
              onChange={(e) => onUpdateStyle({ opacity: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
        )}
      </div>
    </div>
  )
}
