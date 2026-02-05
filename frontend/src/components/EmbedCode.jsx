import { useState } from 'react'
import { Code, Copy, Check, ExternalLink } from 'lucide-react'

const SIZES = [
  { name: 'Medium Rectangle', width: 300, height: 250 },
  { name: 'Leaderboard', width: 728, height: 90 },
  { name: 'Wide Skyscraper', width: 160, height: 600 },
  { name: 'Half Page', width: 300, height: 600 },
  { name: 'Billboard', width: 970, height: 250 },
  { name: 'Mobile Banner', width: 320, height: 50 },
  { name: 'Large Mobile', width: 320, height: 100 },
  { name: 'Custom', width: 0, height: 0 },
]

export default function EmbedCode({ campaignId, baseUrl }) {
  const [selectedSize, setSelectedSize] = useState(SIZES[0])
  const [customWidth, setCustomWidth] = useState(300)
  const [customHeight, setCustomHeight] = useState(250)
  const [copied, setCopied] = useState(null)

  const width = selectedSize.width || customWidth
  const height = selectedSize.height || customHeight
  const adUrl = `${baseUrl}/ad/${campaignId}`

  const iframeCode = `<iframe 
  src="${adUrl}"
  width="${width}"
  height="${height}"
  frameborder="0"
  scrolling="no"
  style="border:none;overflow:hidden;">
</iframe>`

  const scriptCode = `<div id="souts-ad-${campaignId.slice(0, 8)}"></div>
<script>
(function() {
  var container = document.getElementById('souts-ad-${campaignId.slice(0, 8)}');
  var iframe = document.createElement('iframe');
  iframe.src = '${adUrl}';
  iframe.width = '${width}';
  iframe.height = '${height}';
  iframe.frameBorder = '0';
  iframe.scrolling = 'no';
  iframe.style.cssText = 'border:none;overflow:hidden;';
  container.appendChild(iframe);
})();
</script>`

  const responsiveCode = `<div style="position:relative;width:100%;max-width:${width}px;">
  <div style="padding-top:${((height / width) * 100).toFixed(2)}%"></div>
  <iframe 
    src="${adUrl}"
    style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;"
    frameborder="0"
    scrolling="no">
  </iframe>
</div>`

  const handleCopy = async (code, type) => {
    await navigator.clipboard.writeText(code)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Code size={18} />
        Embed Code
      </h3>

      {/* Size Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Ad Size
        </label>
        <div className="grid grid-cols-2 gap-2">
          {SIZES.map((size) => (
            <button
              key={size.name}
              onClick={() => setSelectedSize(size)}
              className={`p-2 text-sm rounded-lg border text-left ${
                selectedSize.name === size.name
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium">{size.name}</div>
              {size.width > 0 && (
                <div className="text-xs text-gray-500">{size.width} × {size.height}</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Size */}
      {selectedSize.name === 'Custom' && (
        <div className="flex gap-2 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Width</label>
            <input
              type="number"
              value={customWidth}
              onChange={(e) => setCustomWidth(parseInt(e.target.value) || 0)}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Height</label>
            <input
              type="number"
              value={customHeight}
              onChange={(e) => setCustomHeight(parseInt(e.target.value) || 0)}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>
      )}

      {/* Code Snippets */}
      <div className="space-y-4">
        {/* Simple iframe */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              Simple iframe
            </label>
            <button
              onClick={() => handleCopy(iframeCode, 'iframe')}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
            >
              {copied === 'iframe' ? <Check size={14} /> : <Copy size={14} />}
              {copied === 'iframe' ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg text-xs overflow-x-auto">
            {iframeCode}
          </pre>
        </div>

        {/* JavaScript embed */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              JavaScript (async load)
            </label>
            <button
              onClick={() => handleCopy(scriptCode, 'script')}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
            >
              {copied === 'script' ? <Check size={14} /> : <Copy size={14} />}
              {copied === 'script' ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg text-xs overflow-x-auto">
            {scriptCode}
          </pre>
        </div>

        {/* Responsive */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              Responsive (maintains aspect ratio)
            </label>
            <button
              onClick={() => handleCopy(responsiveCode, 'responsive')}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
            >
              {copied === 'responsive' ? <Check size={14} /> : <Copy size={14} />}
              {copied === 'responsive' ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg text-xs overflow-x-auto">
            {responsiveCode}
          </pre>
        </div>
      </div>

      {/* Preview */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Preview</span>
          <a
            href={adUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
          >
            Open in new tab <ExternalLink size={12} />
          </a>
        </div>
        <div 
          className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center p-4"
          style={{ minHeight: Math.min(height + 20, 300) }}
        >
          <iframe
            src={adUrl}
            width={Math.min(width, 400)}
            height={Math.min(height, 280)}
            frameBorder="0"
            scrolling="no"
            style={{ border: 'none', overflow: 'hidden' }}
            title="Ad Preview"
          />
        </div>
      </div>
    </div>
  )
}
