import { supabase } from './supabase'

const BASE = import.meta.env.VITE_API_URL || ''

async function request(method, path, body, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const headers = {}
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Request failed (${res.status})`)
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  // Campaigns
  getCampaigns: () => request('GET', '/api/campaigns'),
  getCampaign: (id) => request('GET', `/api/campaigns/${id}`),
  createCampaign: (data) => request('POST', '/api/campaigns', data),
  updateCampaign: (id, data) => request('PATCH', `/api/campaigns/${id}`, data),
  deleteCampaign: (id) => request('DELETE', `/api/campaigns/${id}`),
  duplicateCampaign: (id) => request('POST', `/api/campaigns/${id}/duplicate`),

  // Variants
  createVariant: (cid, data) => request('POST', `/api/campaigns/${cid}/variants`, data),
  updateVariant: (cid, vid, data) => request('PATCH', `/api/campaigns/${cid}/variants/${vid}`, data),
  deleteVariant: (cid, vid) => request('DELETE', `/api/campaigns/${cid}/variants/${vid}`),

  // Rules
  createRule: (cid, data) => request('POST', `/api/campaigns/${cid}/rules`, data),
  updateRule: (cid, rid, data) => request('PATCH', `/api/campaigns/${cid}/rules/${rid}`, data),
  deleteRule: (cid, rid) => request('DELETE', `/api/campaigns/${cid}/rules/${rid}`),

  // Assets
  getAssets: (cid) => request('GET', `/api/assets/${cid}`),
  deleteAsset: (id) => request('DELETE', `/api/assets/${id}`),
  uploadAsset: (campaignId, name, file) => {
    const fd = new FormData()
    fd.append('campaign_id', campaignId)
    fd.append('name', name)
    fd.append('file', file)
    return request('POST', '/api/assets/upload', fd)
  },

  // Pools
  getPools: (cid) => request('GET', `/api/pools/${cid}`),
  upsertPool: (cid, poolType, data) => request('PUT', `/api/pools/${cid}/${poolType}`, data),
  deletePool: (cid, poolType) => request('DELETE', `/api/pools/${cid}/${poolType}`),
  generateVariants: (cid) => request('POST', `/api/pools/${cid}/generate`),
  previewPools: (cid) => request('GET', `/api/pools/${cid}/preview`),

  // Analytics
  getCampaignStats: (cid, days = 7) => request('GET', `/api/analytics/campaigns/${cid}/stats?days=${days}`),
  getDashboardStats: () => request('GET', '/api/analytics/dashboard'),

  // Ad
  getTemplates: () => request('GET', '/ad/templates'),

  // API Keys
  getApiKeys: () => request('GET', '/api/api-keys'),
  createApiKey: (data) => request('POST', '/api/api-keys', data),
  revokeApiKey: (id) => request('DELETE', `/api/api-keys/${id}`),
}
