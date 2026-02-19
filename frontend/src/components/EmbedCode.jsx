import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

const SIZES = [
  { label: '300x250 (Medium Rectangle)', w: 300, h: 250 },
  { label: '728x90 (Leaderboard)', w: 728, h: 90 },
  { label: '160x600 (Wide Skyscraper)', w: 160, h: 600 },
  { label: '320x50 (Mobile Banner)', w: 320, h: 50 },
  { label: 'Custom', w: 0, h: 0 },
]

export default function EmbedCode({ campaignId, apiUrl }) {
  const base = apiUrl || ''
  const [sizeIdx, setSizeIdx] = useState(0)
  const [customW, setCustomW] = useState(300)
  const [customH, setCustomH] = useState(250)
  const [format, setFormat] = useState('iframe')
  const [copied, setCopied] = useState(false)

  const size = SIZES[sizeIdx]
  const w = size.w || customW
  const h = size.h || customH
  const adUrl = `${base}/ad/${campaignId}?width=${w}&height=${h}&format=html`

  const code = format === 'iframe'
    ? `<iframe src="${adUrl}" width="${w}" height="${h}" frameborder="0" scrolling="no" style="border:none;overflow:hidden"></iframe>`
    : `<div id="souts-dco-${campaignId}" style="width:${w}px;height:${h}px"></div>\n<script>\n(function(){\n  var d=document,f=d.createElement('iframe');\n  f.src="${adUrl}";\n  f.width=${w};f.height=${h};\n  f.style.border='none';f.scrolling='no';\n  d.getElementById('souts-dco-${campaignId}').appendChild(f);\n})();\n</script>`

  const copy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Embed Code</h2>
      <div className="bg-white rounded-lg shadow p-4 space-y-4 max-w-2xl">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Size</label>
            <select value={sizeIdx} onChange={(e) => setSizeIdx(Number(e.target.value))} className="border rounded-md px-3 py-2 w-full text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
              {SIZES.map((s, i) => <option key={i} value={i}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Format</label>
            <select value={format} onChange={(e) => setFormat(e.target.value)} className="border rounded-md px-3 py-2 w-full text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none">
              <option value="iframe">iframe</option>
              <option value="js">JavaScript Tag</option>
            </select>
          </div>
        </div>

        {size.w === 0 && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-600">Width</label>
              <input type="number" value={customW} onChange={(e) => setCustomW(Number(e.target.value))} className="border rounded-md px-3 py-2 w-full text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-gray-600">Height</label>
              <input type="number" value={customH} onChange={(e) => setCustomH(Number(e.target.value))} className="border rounded-md px-3 py-2 w-full text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            </div>
          </div>
        )}

        <div className="relative">
          <textarea readOnly value={code} rows={6} className="border rounded-md px-3 py-2 w-full text-xs font-mono bg-gray-50 focus:outline-none" />
          <button onClick={copy} className="absolute top-2 right-2 text-gray-400 hover:text-indigo-600">
            {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
          </button>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Preview ({w}x{h})</h3>
          <div className="border rounded bg-gray-100 p-2 inline-block">
            <iframe src={adUrl} width={w} height={h} style={{ border: 'none' }} title="Embed Preview" />
          </div>
        </div>
      </div>
    </div>
  )
}
