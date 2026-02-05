import { useState } from 'react'
import { Grid, List, Maximize2, X, ChevronLeft, ChevronRight } from 'lucide-react'

const PREVIEW_SIZES = [
  { name: 'Small', width: 150, height: 125 },
  { name: 'Medium', width: 300, height: 250 },
  { name: 'Large', width: 400, height: 333 },
]

export default function VariantGrid({ campaignId, variants = [] }) {
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'carousel'
  const [previewSize, setPreviewSize] = useState(PREVIEW_SIZES[0])
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [carouselIndex, setCarouselIndex] = useState(0)

  if (variants.length === 0) {
    return null
  }

  const nextCarousel = () => {
    setCarouselIndex((prev) => (prev + 1) % variants.length)
  }

  const prevCarousel = () => {
    setCarouselIndex((prev) => (prev - 1 + variants.length) % variants.length)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Grid size={18} />
          Variant Preview Grid
        </h3>
        
        <div className="flex items-center gap-4">
          {/* Size selector */}
          <select
            value={previewSize.name}
            onChange={(e) => setPreviewSize(PREVIEW_SIZES.find(s => s.name === e.target.value))}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            {PREVIEW_SIZES.map(size => (
              <option key={size.name} value={size.name}>
                {size.name} ({size.width}×{size.height})
              </option>
            ))}
          </select>
          
          {/* View toggle */}
          <div className="flex border border-gray-300 rounded overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 ${viewMode === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('carousel')}
              className={`p-1.5 ${viewMode === 'carousel' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {viewMode === 'grid' ? (
          /* Grid View */
          <div 
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(auto-fill, minmax(${previewSize.width}px, 1fr))`,
            }}
          >
            {variants.map((variant, index) => (
              <div
                key={variant.id}
                className="group relative cursor-pointer"
                onClick={() => setSelectedVariant(variant)}
              >
                {/* Preview iframe */}
                <div 
                  className="border border-gray-200 rounded-lg overflow-hidden hover:border-indigo-400 transition-colors"
                  style={{ height: previewSize.height }}
                >
                  <iframe
                    src={`/ad/${campaignId}/preview?variant_id=${variant.id}`}
                    width={previewSize.width}
                    height={previewSize.height}
                    frameBorder="0"
                    scrolling="no"
                    title={variant.name}
                    style={{ 
                      pointerEvents: 'none',
                      transform: previewSize.name === 'Small' ? 'scale(0.5)' : 'none',
                      transformOrigin: 'top left',
                      width: previewSize.name === 'Small' ? '300px' : previewSize.width,
                      height: previewSize.name === 'Small' ? '250px' : previewSize.height,
                    }}
                  />
                </div>
                
                {/* Label */}
                <div className="mt-2 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium truncate">{variant.name}</div>
                    <div className="text-xs text-gray-500 truncate">{variant.headline}</div>
                  </div>
                  {variant.is_default && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                      Default
                    </span>
                  )}
                </div>
                
                {/* Hover expand button */}
                <button
                  className="absolute top-2 right-2 p-1 bg-white/90 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedVariant(variant)
                  }}
                >
                  <Maximize2 size={14} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          /* Carousel View */
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={prevCarousel}
              className="p-2 hover:bg-gray-100 rounded-full"
              disabled={variants.length <= 1}
            >
              <ChevronLeft size={24} />
            </button>
            
            <div className="text-center">
              <div 
                className="border border-gray-200 rounded-lg overflow-hidden mx-auto"
                style={{ width: 300, height: 250 }}
              >
                <iframe
                  src={`/ad/${campaignId}/preview?variant_id=${variants[carouselIndex]?.id}`}
                  width={300}
                  height={250}
                  frameBorder="0"
                  scrolling="no"
                  title={variants[carouselIndex]?.name}
                />
              </div>
              
              <div className="mt-3">
                <div className="font-medium">{variants[carouselIndex]?.name}</div>
                <div className="text-sm text-gray-500">{variants[carouselIndex]?.headline}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {carouselIndex + 1} of {variants.length}
                </div>
              </div>
              
              {/* Dots */}
              <div className="flex justify-center gap-1 mt-3">
                {variants.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCarouselIndex(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i === carouselIndex ? 'bg-indigo-600' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
            
            <button
              onClick={nextCarousel}
              className="p-2 hover:bg-gray-100 rounded-full"
              disabled={variants.length <= 1}
            >
              <ChevronRight size={24} />
            </button>
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      {selectedVariant && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-8"
          onClick={() => setSelectedVariant(null)}
        >
          <div 
            className="bg-white rounded-xl overflow-hidden max-w-4xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h4 className="font-semibold">{selectedVariant.name}</h4>
                <p className="text-sm text-gray-500">{selectedVariant.headline}</p>
              </div>
              <button
                onClick={() => setSelectedVariant(null)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 bg-gray-100 flex items-center justify-center">
              <iframe
                src={`/ad/${campaignId}/preview?variant_id=${selectedVariant.id}`}
                width={728}
                height={400}
                frameBorder="0"
                title={selectedVariant.name}
                className="bg-white shadow-lg"
              />
            </div>
            
            <div className="p-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Body:</span>
                <p>{selectedVariant.body_text || '(none)'}</p>
              </div>
              <div>
                <span className="text-gray-500">CTA:</span>
                <p>{selectedVariant.cta_text} → {selectedVariant.cta_url}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
