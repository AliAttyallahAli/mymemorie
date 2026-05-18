// src/utils/toast.js
let toastContainer = null

const createContainer = () => {
  const existing = document.getElementById('global-toast-container')

  if (existing) {
    toastContainer = existing
    return existing
  }

  const container = document.createElement('div')
  container.id = 'global-toast-container'
  container.className =
    'fixed top-4 right-4 left-4 md:left-auto z-[99999] space-y-2'
  container.style.pointerEvents = 'none'

  document.body.appendChild(container)

  toastContainer = container
  return container
}

const getContainer = () => {
  if (!toastContainer || !document.body.contains(toastContainer)) {
    return createContainer()
  }

  return toastContainer
}

const removeToast = (toast) => {
  if (!toast) return

  try {
    if (toast.parentNode) {
      toast.style.opacity = '0'
      toast.style.transform = 'translateY(-10px)'

      setTimeout(() => {
        try {
          toast.parentNode?.removeChild(toast)
        } catch (e) {
          console.warn('Toast déjà supprimé')
        }
      }, 200)
    }
  } catch (e) {
    console.warn('Erreur suppression toast:', e)
  }
}

const escapeHtml = (text = '') => {
  const div = document.createElement('div')
  div.textContent = String(text)
  return div.innerHTML
}

// Fonction pour formater le message avec la clé
const formatMessageWithKey = (message, details) => {
  let formattedMessage = escapeHtml(message)
  
  if (details) {
    // Si les détails contiennent une clé (6 chiffres), la mettre en évidence
    const keyMatch = details.match(/\d{6}/)
    if (keyMatch) {
      const highlightedKey = `<span style="background: rgba(0,0,0,0.3); padding: 2px 8px; border-radius: 6px; font-family: monospace; font-size: 16px; font-weight: bold; letter-spacing: 1px;">${keyMatch[0]}</span>`
      formattedMessage += `<div style="margin-top: 8px; font-size: 12px;">${escapeHtml(details.replace(/\d{6}/, ''))} ${highlightedKey}</div>`
    } else {
      formattedMessage += `<div style="margin-top: 8px; font-size: 12px; opacity: 0.9;">${escapeHtml(details)}</div>`
    }
  }
  
  return formattedMessage
}

const showToast = (message, type = 'info', duration = 4000, details = null) => {
  const container = getContainer()

  const colors = {
    success: 'bg-gradient-to-r from-green-900/95 to-green-800/95 border-green-500',
    error: 'bg-gradient-to-r from-red-900/95 to-red-800/95 border-red-500',
    warning: 'bg-gradient-to-r from-yellow-900/95 to-yellow-800/95 border-yellow-500',
    info: 'bg-gradient-to-r from-blue-900/95 to-blue-800/95 border-blue-500',
    security: 'bg-gradient-to-r from-orange-900/95 to-orange-800/95 border-orange-500'
  }

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    security: '🔑'
  }

  const formattedMessage = details ? formatMessageWithKey(message, details) : escapeHtml(message)

  const toast = document.createElement('div')

  toast.className = `
    max-w-md w-full md:w-96
    ${colors[type] || colors.info}
    backdrop-blur-lg
    rounded-xl
    shadow-2xl
    overflow-hidden
    border-l-4
    pointer-events-auto
    transition-all
    duration-200
    opacity-100
    translate-y-0
  `

  toast.innerHTML = `
    <div class="p-4">
      <div class="flex items-start gap-3">
        <div class="text-xl flex-shrink-0">
          ${icons[type] || icons.info}
        </div>

        <div class="flex-1 min-w-0">
          <div class="text-white text-sm break-words">
            ${formattedMessage}
          </div>
        </div>

        <button class="text-white/40 hover:text-white transition-colors flex-shrink-0 toast-close">
          ✕
        </button>
      </div>
    </div>

    <div
      class="h-1 bg-white/30"
      style="animation: toastShrink ${duration}ms linear forwards"
    ></div>
  `

  container.appendChild(toast)

  const closeBtn = toast.querySelector('.toast-close')

  if (closeBtn) {
    closeBtn.onclick = () => removeToast(toast)
  }

  const timeout = setTimeout(() => {
    removeToast(toast)
  }, duration)

  return {
    dismiss: () => {
      clearTimeout(timeout)
      removeToast(toast)
    }
  }
}

if (!document.getElementById('toast-global-styles')) {
  const style = document.createElement('style')

  style.id = 'toast-global-styles'

  style.textContent = `
    @keyframes toastShrink {
      from {
        width: 100%;
      }
      to {
        width: 0%;
      }
    }
  `

  document.head.appendChild(style)
}

export const toast = {
  success: (msg, opts = {}) =>
    showToast(msg, 'success', opts.duration, opts.details),

  error: (msg, opts = {}) =>
    showToast(msg, 'error', opts.duration, opts.details),

  warning: (msg, opts = {}) =>
    showToast(msg, 'warning', opts.duration, opts.details),

  info: (msg, opts = {}) =>
    showToast(msg, 'info', opts.duration, opts.details),

  security: (msg, opts = {}) =>
    showToast(msg, 'security', opts.duration || 10000, opts.details),

  loading: (msg) => {
    return showToast(msg, 'info', 999999)
  },

  custom: (msg, type = 'info', duration = 4000, details = null) => {
    return showToast(msg, type, duration, details)
  }
}

export default toast