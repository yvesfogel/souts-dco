import { useState } from 'react'
import { Plus, Trash2, GripVertical } from 'lucide-react'

const SIGNAL_FIELDS = [
  { value: 'geo_country', label: 'Country', type: 'text' },
  { value: 'geo_country_code', label: 'Country Code', type: 'text' },
  { value: 'geo_city', label: 'City', type: 'text' },
  { value: 'weather_condition', label: 'Weather Condition', type: 'select', options: ['clear', 'clouds', 'rain', 'drizzle', 'thunderstorm', 'snow'] },
  { value: 'weather_temp', label: 'Temperature (°C)', type: 'number' },
  { value: 'weather_is_hot', label: 'Is Hot (≥30°C)', type: 'boolean' },
  { value: 'weather_is_cold', label: 'Is Cold (<15°C)', type: 'boolean' },
  { value: 'weather_is_rainy', label: 'Is Rainy', type: 'boolean' },
  { value: 'daypart', label: 'Daypart', type: 'select', options: ['morning', 'afternoon', 'evening', 'night'] },
  { value: 'daypart_hour', label: 'Hour (0-23)', type: 'number' },
  { value: 'daypart_is_weekend', label: 'Is Weekend', type: 'boolean' },
  { value: 'daypart_is_morning', label: 'Is Morning', type: 'boolean' },
  { value: 'daypart_is_evening', label: 'Is Evening', type: 'boolean' },
]

const OPERATORS = {
  text: [
    { value: 'eq', label: 'equals' },
    { value: 'ne', label: 'not equals' },
    { value: 'contains', label: 'contains' },
    { value: 'in', label: 'in list' },
  ],
  number: [
    { value: 'eq', label: '=' },
    { value: 'ne', label: '≠' },
    { value: 'gt', label: '>' },
    { value: 'gte', label: '≥' },
    { value: 'lt', label: '<' },
    { value: 'lte', label: '≤' },
  ],
  boolean: [
    { value: 'eq', label: 'is' },
  ],
  select: [
    { value: 'eq', label: 'equals' },
    { value: 'ne', label: 'not equals' },
    { value: 'in', label: 'in list' },
  ],
}

function ConditionRow({ condition, variants, onChange, onDelete }) {
  const field = SIGNAL_FIELDS.find(f => f.value === condition.field) || SIGNAL_FIELDS[0]
  const operators = OPERATORS[field.type] || OPERATORS.text

  const handleFieldChange = (newField) => {
    const newFieldDef = SIGNAL_FIELDS.find(f => f.value === newField)
    onChange({
      ...condition,
      field: newField,
      operator: 'eq',
      value: newFieldDef?.type === 'boolean' ? true : '',
    })
  }

  return (
    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
      <GripVertical size={16} className="text-gray-400 cursor-move" />
      
      {/* Field */}
      <select
        value={condition.field}
        onChange={(e) => handleFieldChange(e.target.value)}
        className="px-2 py-1.5 border border-gray-300 rounded text-sm flex-1"
      >
        {SIGNAL_FIELDS.map(f => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>

      {/* Operator */}
      <select
        value={condition.operator}
        onChange={(e) => onChange({ ...condition, operator: e.target.value })}
        className="px-2 py-1.5 border border-gray-300 rounded text-sm w-24"
      >
        {operators.map(op => (
          <option key={op.value} value={op.value}>{op.label}</option>
        ))}
      </select>

      {/* Value */}
      {field.type === 'boolean' ? (
        <select
          value={String(condition.value)}
          onChange={(e) => onChange({ ...condition, value: e.target.value === 'true' })}
          className="px-2 py-1.5 border border-gray-300 rounded text-sm w-24"
        >
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      ) : field.type === 'select' ? (
        <select
          value={condition.value}
          onChange={(e) => onChange({ ...condition, value: e.target.value })}
          className="px-2 py-1.5 border border-gray-300 rounded text-sm flex-1"
        >
          <option value="">Select...</option>
          {field.options?.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : field.type === 'number' ? (
        <input
          type="number"
          value={condition.value}
          onChange={(e) => onChange({ ...condition, value: parseFloat(e.target.value) || 0 })}
          className="px-2 py-1.5 border border-gray-300 rounded text-sm w-24"
        />
      ) : (
        <input
          type="text"
          value={condition.value}
          onChange={(e) => onChange({ ...condition, value: e.target.value })}
          placeholder="Value..."
          className="px-2 py-1.5 border border-gray-300 rounded text-sm flex-1"
        />
      )}

      <button
        onClick={onDelete}
        className="p-1 text-red-500 hover:bg-red-50 rounded"
      >
        <Trash2 size={16} />
      </button>
    </div>
  )
}

export default function RulesBuilder({ campaignId, variants, rules, onSave, onDelete }) {
  const [editingRule, setEditingRule] = useState(null)
  const [showCreate, setShowCreate] = useState(false)

  const emptyRule = {
    name: '',
    variant_id: variants[0]?.id || '',
    conditions: [{ field: 'weather_is_hot', operator: 'eq', value: true }],
    logic: 'and',
    priority: rules.length,
    active: true,
  }

  const handleCreateRule = () => {
    setEditingRule({ ...emptyRule })
    setShowCreate(true)
  }

  const handleAddCondition = () => {
    setEditingRule({
      ...editingRule,
      conditions: [
        ...editingRule.conditions,
        { field: 'daypart', operator: 'eq', value: 'morning' },
      ],
    })
  }

  const handleUpdateCondition = (index, updated) => {
    const conditions = [...editingRule.conditions]
    conditions[index] = updated
    setEditingRule({ ...editingRule, conditions })
  }

  const handleDeleteCondition = (index) => {
    const conditions = editingRule.conditions.filter((_, i) => i !== index)
    setEditingRule({ ...editingRule, conditions })
  }

  const handleSave = async () => {
    if (!editingRule.name || !editingRule.variant_id) {
      alert('Please fill in all required fields')
      return
    }
    await onSave(editingRule)
    setEditingRule(null)
    setShowCreate(false)
  }

  return (
    <div className="space-y-4">
      {/* Existing Rules */}
      {rules.map((rule, index) => (
        <div
          key={rule.id}
          className={`bg-white rounded-lg border p-4 ${rule.active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-xs bg-gray-100 px-2 py-1 rounded">#{index + 1}</span>
              <h4 className="font-medium">{rule.name}</h4>
              {!rule.active && <span className="text-xs text-gray-400">(inactive)</span>}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setEditingRule(rule)
                  setShowCreate(false)
                }}
                className="text-sm text-indigo-600 hover:underline"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(rule.id)}
                className="text-sm text-red-500 hover:underline"
              >
                Delete
              </button>
            </div>
          </div>
          
          <div className="text-sm text-gray-600">
            <span className="font-medium">If </span>
            {rule.conditions.map((c, i) => (
              <span key={i}>
                {i > 0 && <span className="text-indigo-600"> {rule.logic} </span>}
                <code className="bg-gray-100 px-1 rounded">{c.field}</code>
                {' '}{c.operator}{' '}
                <code className="bg-gray-100 px-1 rounded">{String(c.value)}</code>
              </span>
            ))}
            <span className="font-medium"> → </span>
            <span className="text-green-600">
              {variants.find(v => v.id === rule.variant_id)?.name || 'Unknown variant'}
            </span>
          </div>
        </div>
      ))}

      {/* Add Rule Button */}
      {!editingRule && (
        <button
          onClick={handleCreateRule}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-indigo-500 hover:text-indigo-500 flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          Add Rule
        </button>
      )}

      {/* Rule Editor */}
      {editingRule && (
        <div className="bg-indigo-50 rounded-lg border-2 border-indigo-200 p-5">
          <h4 className="font-semibold mb-4">
            {showCreate ? 'Create Rule' : 'Edit Rule'}
          </h4>

          <div className="space-y-4">
            {/* Name & Variant */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Rule Name *
                </label>
                <input
                  type="text"
                  value={editingRule.name}
                  onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                  placeholder="e.g., Hot Weather Promo"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Show Variant *
                </label>
                <select
                  value={editingRule.variant_id}
                  onChange={(e) => setEditingRule({ ...editingRule, variant_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  {variants.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Logic */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Match</span>
              <select
                value={editingRule.logic}
                onChange={(e) => setEditingRule({ ...editingRule, logic: e.target.value })}
                className="px-3 py-1.5 border border-gray-300 rounded text-sm"
              >
                <option value="and">ALL conditions (AND)</option>
                <option value="or">ANY condition (OR)</option>
              </select>
            </div>

            {/* Conditions */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-700">
                Conditions
              </label>
              {editingRule.conditions.map((condition, index) => (
                <ConditionRow
                  key={index}
                  condition={condition}
                  variants={variants}
                  onChange={(updated) => handleUpdateCondition(index, updated)}
                  onDelete={() => handleDeleteCondition(index)}
                />
              ))}
              <button
                onClick={handleAddCondition}
                className="text-sm text-indigo-600 hover:underline flex items-center gap-1"
              >
                <Plus size={14} />
                Add condition
              </button>
            </div>

            {/* Priority */}
            <div className="flex items-center gap-4">
              <label className="text-sm text-gray-600">Priority:</label>
              <input
                type="number"
                value={editingRule.priority}
                onChange={(e) => setEditingRule({ ...editingRule, priority: parseInt(e.target.value) || 0 })}
                className="w-20 px-3 py-1.5 border border-gray-300 rounded text-sm"
                min="0"
              />
              <span className="text-xs text-gray-400">(lower = checked first)</span>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-indigo-200">
              <button
                onClick={() => {
                  setEditingRule(null)
                  setShowCreate(false)
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                {showCreate ? 'Create Rule' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
