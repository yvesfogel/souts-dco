import { supabase } from './supabase'

const API_URL = '/api'

async function fetchWithAuth(url, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  
  if (session) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }
  
  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers,
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(error.detail || 'Request failed')
  }
  
  return response.json()
}

export const api = {
  // Campaigns
  getCampaigns: () => fetchWithAuth('/campaigns'),
  getCampaign: (id) => fetchWithAuth(`/campaigns/${id}`),
  createCampaign: (data) => fetchWithAuth('/campaigns', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateCampaign: (id, data) => fetchWithAuth(`/campaigns/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  deleteCampaign: (id) => fetchWithAuth(`/campaigns/${id}`, {
    method: 'DELETE',
  }),
  
  // Variants
  createVariant: (campaignId, data) => fetchWithAuth(`/campaigns/${campaignId}/variants`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateVariant: (campaignId, variantId, data) => fetchWithAuth(`/campaigns/${campaignId}/variants/${variantId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  deleteVariant: (campaignId, variantId) => fetchWithAuth(`/campaigns/${campaignId}/variants/${variantId}`, {
    method: 'DELETE',
  }),
  
  // Rules
  createRule: (campaignId, data) => fetchWithAuth(`/campaigns/${campaignId}/rules`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateRule: (campaignId, ruleId, data) => fetchWithAuth(`/campaigns/${campaignId}/rules/${ruleId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  deleteRule: (campaignId, ruleId) => fetchWithAuth(`/campaigns/${campaignId}/rules/${ruleId}`, {
    method: 'DELETE',
  }),
  
  // Assets
  getAssets: (campaignId) => fetchWithAuth(`/assets/${campaignId}`),
  deleteAsset: (assetId) => fetchWithAuth(`/assets/${assetId}`, {
    method: 'DELETE',
  }),
  uploadAsset: async (campaignId, name, file) => {
    const { data: { session } } = await supabase.auth.getSession()
    
    const formData = new FormData()
    formData.append('campaign_id', campaignId)
    formData.append('name', name)
    formData.append('file', file)
    
    const response = await fetch(`${API_URL}/assets/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: formData,
    })
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }))
      throw new Error(error.detail || 'Upload failed')
    }
    
    return response.json()
  },
}
