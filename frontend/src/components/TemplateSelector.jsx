import { useState, useEffect } from 'react'
import { Layout, Check } from 'lucide-react'

const TEMPLATES = [
  {
    id: 'default',
    name: 'Default',
    description: 'Versatile template with image, headline, body, and CTA',
    preview: 'bg-gradient-to-br from-indigo-500 to-purple-600',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean design with just headline and CTA',
    preview: 'bg-gradient-to-br from-gray-900 to-blue-900',
  },
  {
    id: 'hero',
    name: 'Hero Image',
    description: 'Large image with overlay text',
    preview: 'bg-gradient-to-br from-gray-700 to-gray-900',
  },
  {
    id: 'split',
    name: 'Split',
    description: 'Image on one side, text on the other',
    preview: 'bg-gradient-to-r from-gray-300 to-indigo-500',
  },
  {
    id: 'banner',
    name: 'Banner',
    description: 'Horizontal layout for leaderboard sizes',
    preview: 'bg-gradient-to-r from-indigo-500 to-purple-600',
  },
]

export default function TemplateSelector({ campaign, onUpdate }) {
  const [selected, setSelected] = useState(campaign?.template || 'default')
  const [previewTemplate, setPreviewTemplate] = useState(null)

  const handleSelect = async (templateId) => {
    setSelected(templateId)
    await onUpdate({ template: templateId })
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Layout size={18} />
        Template
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {TEMPLATES.map((template) => (
          <button
            key={template.id}
            onClick={() => handleSelect(template.id)}
            onMouseEnter={() => setPreviewTemplate(template.id)}
            onMouseLeave={() => setPreviewTemplate(null)}
            className={`relative p-3 rounded-lg border-2 text-left transition-all ${
              selected === template.id
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {/* Mini preview */}
            <div className={`h-12 rounded mb-2 ${template.preview}`} />
            
            <div className="font-medium text-sm">{template.name}</div>
            <div className="text-xs text-gray-500 line-clamp-2">
              {template.description}
            </div>

            {selected === template.id && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                <Check size={12} className="text-white" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Template tip */}
      <p className="text-xs text-gray-500 mt-4">
        Templates adapt to different ad sizes automatically. Use the Embed Code generator to see how your ad looks at different dimensions.
      </p>
    </div>
  )
}
