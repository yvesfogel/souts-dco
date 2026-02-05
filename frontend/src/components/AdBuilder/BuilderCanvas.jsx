import { useRef, useState, useCallback } from 'react'

export default function BuilderCanvas({
  elements,
  selectedId,
  onSelect,
  onUpdate,
  onUpdateStyle,
  width,
  height,
  preview,
}) {
  const canvasRef = useRef(null)
  const [dragging, setDragging] = useState(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  const handleMouseDown = useCallback((e, element) => {
    if (preview || element.locked) return
    
    e.stopPropagation()
    onSelect(element.id)

    const rect = e.currentTarget.getBoundingClientRect()
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
    setDragging(element.id)
  }, [preview, onSelect])

  const handleMouseMove = useCallback((e) => {
    if (!dragging || !canvasRef.current) return

    const canvasRect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - canvasRect.left - dragOffset.x
    const y = e.clientY - canvasRect.top - dragOffset.y

    // Convert to percentage
    const leftPercent = (x / width) * 100
    const topPercent = (y / height) * 100

    onUpdateStyle(dragging, {
      left: `${Math.max(0, Math.min(100, leftPercent))}%`,
      top: `${Math.max(0, Math.min(100, topPercent))}%`,
      transform: 'none', // Remove centering transform when manually positioned
    })
  }, [dragging, dragOffset, width, height, onUpdateStyle])

  const handleMouseUp = useCallback(() => {
    setDragging(null)
  }, [])

  const handleCanvasClick = useCallback((e) => {
    if (e.target === canvasRef.current) {
      onSelect(null)
    }
  }, [onSelect])

  const renderElement = (element) => {
    const isSelected = selectedId === element.id && !preview
    const baseStyle = {
      position: element.type === 'background' ? 'absolute' : 'absolute',
      ...element.style,
      cursor: element.locked ? 'default' : 'move',
      outline: isSelected ? '2px solid #4f46e5' : 'none',
      outlineOffset: '2px',
      userSelect: 'none',
    }

    switch (element.type) {
      case 'background':
        return (
          <div
            key={element.id}
            style={{
              ...baseStyle,
              inset: 0,
              zIndex: 0,
            }}
            onClick={() => !preview && onSelect(element.id)}
          />
        )

      case 'text':
        return (
          <div
            key={element.id}
            style={baseStyle}
            onMouseDown={(e) => handleMouseDown(e, element)}
            onDoubleClick={() => {
              if (preview) return
              const newContent = prompt('Enter text:', element.content)
              if (newContent !== null) {
                onUpdate(element.id, { content: newContent })
              }
            }}
          >
            {element.content}
          </div>
        )

      case 'image':
        return (
          <div
            key={element.id}
            style={baseStyle}
            onMouseDown={(e) => handleMouseDown(e, element)}
          >
            {element.src ? (
              <img
                src={element.src}
                alt=""
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: element.style.objectFit || 'contain',
                }}
                draggable={false}
              />
            ) : (
              <div
                style={{
                  width: element.style.width || '100px',
                  height: element.style.height || '100px',
                  backgroundColor: 'rgba(255,255,255,0.3)',
                  border: '2px dashed rgba(255,255,255,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                + Image
              </div>
            )}
          </div>
        )

      case 'button':
        return (
          <button
            key={element.id}
            style={{
              ...baseStyle,
              border: 'none',
            }}
            onMouseDown={(e) => handleMouseDown(e, element)}
            onDoubleClick={() => {
              if (preview) return
              const newContent = prompt('Button text:', element.content)
              if (newContent !== null) {
                onUpdate(element.id, { content: newContent })
              }
            }}
            onClick={(e) => {
              if (preview && element.url) {
                window.open(element.url, '_blank')
              }
            }}
          >
            {element.content}
          </button>
        )

      case 'shape':
        return (
          <div
            key={element.id}
            style={baseStyle}
            onMouseDown={(e) => handleMouseDown(e, element)}
          />
        )

      default:
        return null
    }
  }

  return (
    <div
      ref={canvasRef}
      className="relative shadow-lg"
      style={{
        width: `${width}px`,
        height: `${height}px`,
        overflow: 'hidden',
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleCanvasClick}
    >
      {elements.map(renderElement)}
      
      {/* Size indicator */}
      <div className="absolute bottom-1 right-1 text-xs bg-black/50 text-white px-2 py-0.5 rounded">
        {width}×{height}
      </div>
    </div>
  )
}
