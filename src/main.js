import './style.css'

const supabaseUrl = 'https://lgchqleltppfdgtpgsbj.supabase.co'
const supabaseKey = 'sb_publishable_ZHBBlxQVW0MBUUwQ5Kv1Aw_uufRzvu1'
const functionsUrl = `${supabaseUrl}/functions/v1`
const logPrefix = '[SMS Reply]'

const elements = {
  state: document.getElementById('state'),
  context: document.getElementById('message-context'),
  sender: document.getElementById('sender'),
  body: document.getElementById('body'),
  form: document.getElementById('reply-form'),
  message: document.getElementById('reply-message'),
  charCount: document.getElementById('char-count'),
  button: document.getElementById('send-button'),
}

const token = getReplyToken()

if (!elements.state || !elements.form || !elements.message || !elements.button) {
  throw new Error('SMS reply page did not load correctly. Required page elements are missing.')
}

window.addEventListener('error', (event) => {
  console.error(logPrefix, 'Unhandled page error', event.error || event.message)
  elements.state.textContent = 'The reply page failed to load. Check the browser console for details.'
})

window.addEventListener('unhandledrejection', (event) => {
  console.error(logPrefix, 'Unhandled async error', event.reason)
  elements.state.textContent = errorMessage(event.reason)
})

elements.message.addEventListener('input', () => {
  elements.charCount.textContent = `${elements.message.value.length} / 1900`
})

elements.form.addEventListener('submit', async (event) => {
  event.preventDefault()
  const message = elements.message.value.trim()
  if (!message) return

  setBusy(true)

  try {
    console.info(logPrefix, 'Sending reply')
    await callFunction('sms-reply-link-send', { token, message })
    elements.form.hidden = true
    elements.state.textContent = 'Reply sent. This link is now closed.'
    window.history.replaceState({}, '', window.location.pathname)
  } catch (error) {
    console.error(logPrefix, 'Reply send failed', error)
    elements.state.textContent = errorMessage(error)
    setBusy(false)
  }
})

async function boot() {
  console.info(logPrefix, 'Booting reply page', { path: window.location.pathname, hasToken: Boolean(token) })

  if (!token) {
    elements.state.textContent = 'This reply link is missing or invalid.'
    return
  }

  try {
    console.info(logPrefix, 'Checking reply token')
    const data = await callFunction('sms-reply-link-get', { token })
    elements.sender.textContent = data.reply.inbound_sender || 'Unknown sender'
    elements.body.textContent = data.reply.inbound_body || ''
    elements.context.hidden = false
    elements.form.hidden = false
    elements.state.textContent = `Reply link expires ${formatDate(data.reply.expires_at)}.`
  } catch (error) {
    console.error(logPrefix, 'Reply token check failed', error)
    elements.state.textContent = errorMessage(error)
  }
}

async function callFunction(name, body) {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 15000)

  let response
  try {
    response = await fetch(`${functionsUrl}/${name}`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`Timed out calling ${name}.`)
    }
    throw new Error(`Could not reach ${name}: ${errorMessage(error)}`)
  } finally {
    window.clearTimeout(timeout)
  }

  const text = await response.text()
  let payload = {}
  try {
    payload = text ? JSON.parse(text) : {}
  } catch (error) {
    console.error(logPrefix, 'Function returned non-JSON response', { name, status: response.status, text })
    throw new Error(`Function ${name} returned an invalid response.`)
  }

  console.info(logPrefix, 'Function response', { name, status: response.status, ok: response.ok })
  if (!response.ok) throw new Error(payload.error || `Request failed with HTTP ${response.status}`)
  return payload
}

function setBusy(isBusy) {
  elements.button.disabled = isBusy
  elements.button.textContent = isBusy ? 'Sending...' : 'Send Reply'
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : ''
}

function getReplyToken() {
  const search = window.location.search || ''
  const params = new URLSearchParams(search)
  const namedToken = params.get('t') || params.get('token')
  if (namedToken) return namedToken.trim()

  const rawQuery = search.startsWith('?') ? search.slice(1) : search
  if (!rawQuery || rawQuery.includes('=')) return ''
  return decodeURIComponent(rawQuery).trim()
}

function errorMessage(error) {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'Something went wrong loading this reply link.'
}

boot()
