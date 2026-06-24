import axios from 'axios'

const QAIP_BASE = process.env.QAIP_API_URL ?? 'https://testmind-production.up.railway.app'

export async function fetchQaipReport(projectKey: string) {
  try {
    const res = await axios.get(`${QAIP_BASE}/api/reports/${projectKey}/latest`, { timeout: 5000 })
    return res.data
  } catch {
    return null
  }
}

export async function triggerQaipRun(projectKey: string) {
  try {
    const res = await axios.post(
      `${QAIP_BASE}/api/runs/trigger`,
      { project: projectKey, webhook: `${process.env.API_URL ?? 'http://localhost:3001'}/api/qaip/webhook` },
      { headers: { 'x-qaip-secret': process.env.QAIP_WEBHOOK_SECRET ?? 'auranex-qaip-2026' }, timeout: 5000 }
    )
    return res.data
  } catch {
    return null
  }
}
