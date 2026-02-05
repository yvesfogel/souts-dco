import { useState, useEffect } from 'react'
import { Calendar, Clock, Play, Pause } from 'lucide-react'

export default function Scheduling({ campaign, onUpdate }) {
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endTime, setEndTime] = useState('')
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    // Parse existing dates
    if (campaign?.start_date) {
      const start = new Date(campaign.start_date)
      setStartDate(start.toISOString().split('T')[0])
      setStartTime(start.toTimeString().slice(0, 5))
    } else {
      setStartDate('')
      setStartTime('')
    }
    
    if (campaign?.end_date) {
      const end = new Date(campaign.end_date)
      setEndDate(end.toISOString().split('T')[0])
      setEndTime(end.toTimeString().slice(0, 5))
    } else {
      setEndDate('')
      setEndTime('')
    }
  }, [campaign])

  const handleSave = async () => {
    const updates = {
      start_date: startDate ? new Date(`${startDate}T${startTime || '00:00'}`).toISOString() : null,
      end_date: endDate ? new Date(`${endDate}T${endTime || '23:59'}`).toISOString() : null,
    }
    await onUpdate(updates)
    setDirty(false)
  }

  const handleClear = async (field) => {
    if (field === 'start') {
      setStartDate('')
      setStartTime('')
      await onUpdate({ start_date: null })
    } else {
      setEndDate('')
      setEndTime('')
      await onUpdate({ end_date: null })
    }
  }

  // Determine campaign status
  const getStatus = () => {
    const now = new Date()
    const start = startDate ? new Date(`${startDate}T${startTime || '00:00'}`) : null
    const end = endDate ? new Date(`${endDate}T${endTime || '23:59'}`) : null

    if (!campaign?.active) {
      return { status: 'inactive', label: 'Inactive', color: 'gray' }
    }
    if (start && now < start) {
      return { status: 'scheduled', label: 'Scheduled', color: 'yellow' }
    }
    if (end && now > end) {
      return { status: 'ended', label: 'Ended', color: 'red' }
    }
    return { status: 'live', label: 'Live', color: 'green' }
  }

  const status = getStatus()
  const statusColors = {
    gray: 'bg-gray-100 text-gray-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    red: 'bg-red-100 text-red-700',
    green: 'bg-green-100 text-green-700',
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Calendar size={18} />
          Scheduling
        </h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status.color]}`}>
          {status.label}
        </span>
      </div>

      {/* Start Date */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
            <Play size={14} />
            Start Date
          </label>
          {startDate && (
            <button
              onClick={() => handleClear('start')}
              className="text-xs text-gray-500 hover:text-red-500"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value)
              setDirty(true)
            }}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <input
            type="time"
            value={startTime}
            onChange={(e) => {
              setStartTime(e.target.value)
              setDirty(true)
            }}
            className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder="00:00"
          />
        </div>
        {!startDate && (
          <p className="text-xs text-gray-500 mt-1">Leave empty to start immediately</p>
        )}
      </div>

      {/* End Date */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
            <Pause size={14} />
            End Date
          </label>
          {endDate && (
            <button
              onClick={() => handleClear('end')}
              className="text-xs text-gray-500 hover:text-red-500"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value)
              setDirty(true)
            }}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <input
            type="time"
            value={endTime}
            onChange={(e) => {
              setEndTime(e.target.value)
              setDirty(true)
            }}
            className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder="23:59"
          />
        </div>
        {!endDate && (
          <p className="text-xs text-gray-500 mt-1">Leave empty to run indefinitely</p>
        )}
      </div>

      {/* Save Button */}
      {dirty && (
        <button
          onClick={handleSave}
          className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
        >
          Save Schedule
        </button>
      )}

      {/* Schedule Summary */}
      {(startDate || endDate) && !dirty && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm">
          <p className="text-gray-600">
            {startDate ? (
              <>Starts <strong>{new Date(`${startDate}T${startTime || '00:00'}`).toLocaleString()}</strong></>
            ) : (
              <>Starts <strong>immediately</strong></>
            )}
          </p>
          <p className="text-gray-600">
            {endDate ? (
              <>Ends <strong>{new Date(`${endDate}T${endTime || '23:59'}`).toLocaleString()}</strong></>
            ) : (
              <>Runs <strong>indefinitely</strong></>
            )}
          </p>
        </div>
      )}
    </div>
  )
}
