import axios from 'axios'

const AI_ENGINE_URL = process.env.AI_ENGINE_URL ?? 'http://localhost:8001'

export async function queryAiEngine(question: string, userRole: string): Promise<string> {
  try {
    const res = await axios.post(
      `${AI_ENGINE_URL}/ai/query`,
      { question, user_role: userRole },
      { timeout: 10000 }
    )
    return res.data.answer ?? 'No answer available.'
  } catch {
    return 'AI engine unavailable. Please try again shortly.'
  }
}

export async function runAnalysis(): Promise<void> {
  try {
    await axios.post(`${AI_ENGINE_URL}/ai/run-analysis`, {}, { timeout: 60000 })
  } catch (err) {
    console.error('AI analysis failed:', err)
  }
}
