import { useState } from 'react'
import { Calendar } from 'lucide-react'

export default function Scheduling({ campaign, onSave }) {
  const [start, setStart] = useState(campaign.start_date ? campaign.start_date.slice(0, 16) : '')
  const [end, setEnd] = useState(campaign.end_date ? campaign.end_date.slice(0, 16) : '')

  const handleSave = () => {
    onSave({
      start_date: start ? new Date(start).toISOString() : null,
      end_date: end ? new Date(end).toISOString() : null,
    })
  }

  const now = new Date()
  const startDate = start ? new Date(start) : null
  const endDate = end ? new Date(end) : null
  let statusText = 'Not scheduled'
  let statusColor = 'text-gray-500'
  if (startDate && endDate) {
    if (now < startDate) { statusText = 'Scheduled'; statusColor = 'text-blue-600' }
    else if (now > endDate) { statusText = 'Ended'; statusColor = 'text-red-600' }
    else { statusText = 'Live'; statusColor = 'text-green-600' }
  } else if (startDate && now >= startDate) {
    statusText = 'Live'; statusColor = 'text-green-600'
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Scheduling</h2>
      <div className="bg-white rounded-lg shadow p-6 max-w-md space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Calendar size={16} className={statusColor} />
          <span className={`text-sm font-medium ${statusColor}`}>{statusText}</span>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Start Date</label>
          <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className="border rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">End Date</label>
          <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className="border rounded-md px-3 py-2 w-full focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
        </div>
        <button onClick={handleSave} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm">Save Schedule</button>
      </div>
    </div>
  )
}
