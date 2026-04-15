export const extractError = async (res) => {
  try {
    const d = await res.json()
    if (typeof d?.message === 'string') return d.message
    const first = Object.values(d?.errors ?? {})[0]
    if (Array.isArray(first)) return first[0]
  } catch { /* fall through */ }
  return 'Something went wrong.'
}
