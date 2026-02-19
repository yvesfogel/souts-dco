const TEMPLATES = [
  { value: 'default', label: 'Default', desc: 'Standard ad layout with all fields' },
  { value: 'minimal', label: 'Minimal', desc: 'Clean, text-focused design' },
  { value: 'hero', label: 'Hero', desc: 'Large image with overlay text' },
  { value: 'split', label: 'Split', desc: 'Image and text side by side' },
  { value: 'banner', label: 'Banner', desc: 'Compact horizontal banner' },
]

export default function TemplateSelector({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="border rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
      title="Template"
    >
      {TEMPLATES.map((t) => (
        <option key={t.value} value={t.value}>{t.label} - {t.desc}</option>
      ))}
    </select>
  )
}
