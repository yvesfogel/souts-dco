import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import CampaignDetail from './pages/CampaignDetail'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={session ? <Navigate to="/" /> : <Login />} 
      />
      <Route 
        path="/" 
        element={session ? <Dashboard session={session} /> : <Navigate to="/login" />} 
      />
      <Route 
        path="/campaigns/:id" 
        element={session ? <CampaignDetail session={session} /> : <Navigate to="/login" />} 
      />
    </Routes>
  )
}

export default App
