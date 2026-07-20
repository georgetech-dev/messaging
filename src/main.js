import './style.css'

const supabaseUrl = 'https://lgchqleltppfdgtpgsbj.supabase.co'
const supabaseKey = 'sb_publishable_ZHBBlxQVW0MBUUwQ5Kv1Aw_uufRzvu1'
const functionsUrl = `${supabaseUrl}/functions/v1`

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

const token = new URLSearchParams(window.location.search).get('t') || ''

elements.message.addEventListener('input', () => {
  elements.charCount.textContent = `${elements.message.value.length} / 1900`
})

elements.form.addEventListener('submit', async (event) => {
  event.preventDefault()
  const message = elements.message.value.trim()
  if (!message) return

  setBusy(true)

  try {
    await callFunction('sms-reply-link-send', { token, message })
    elements.form.hidden = true
    elements.state.textContent = 'Reply sent. This link is now closed.'
    window.history.replaceState({}, '', window.location.pathname)
  } catch (error) {
    elements.state.textContent = error.message
    setBusy(false)
  }
})

async function boot() {
  if (!token) {
    elements.state.textContent = 'This reply link is missing or invalid.'
    return
  }

  try {
    const data = await callFunction('sms-reply-link-get', { token })
    elements.sender.textContent = data.reply.inbound_sender || 'Unknown sender'
    elements.body.textContent = data.reply.inbound_body || ''
    elements.context.hidden = false
    elements.form.hidden = false
    elements.state.textContent = `Reply link expires ${formatDate(data.reply.expires_at)}.`
  } catch (error) {
    elements.state.textContent = error.message
  }
}

async function callFunction(name, body) {
  const response = await fetch(`${functionsUrl}/${name}`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const text = await response.text()
  const payload = text ? JSON.parse(text) : {}
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

boot()
