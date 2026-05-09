// src/utils/toast.js
// Système de toast simple et fiable

let toastContainer = null

const getContainer = () => {
  if (!toastContainer || !document.body.contains(toastContainer)) {
    if (toastContainer) {
      try { toastContainer.remove() } catch(e) {}
    }
    toastContainer = document.createElement('div')
    toastContainer.className = 'fixed top-4 right-4 left-4 md:left-auto z-50 space-y-2'
    toastContainer.style.pointerEvents = 'none'
    document.body.appendChild(toastContainer)
  }
  return toastContainer
}

const showToast = (message, type = 'info', duration = 4000) => {
  const container = getContainer()
  const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5)
  
  const colors = {
    success: 'bg-gradient-to-r from-green-900/95 to-green-800/95 border-green-500',
    error: 'bg-gradient-to-r from-red-900/95 to-red-800/95 border-red-500',
    warning: 'bg-gradient-to-r from-yellow-900/95 to-yellow-800/95 border-yellow-500',
    info: 'bg-gradient-to-r from-blue-900/95 to-blue-800/95 border-blue-500'
  }
  
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  }
  
  const toast = document.createElement('div')
  toast.id = id
  toast.className = `max-w-md w-full md:w-96 ${colors[type]} backdrop-blur-lg rounded-xl shadow-2xl overflow-hidden border-l-4 pointer-events-auto mb-2`
  toast.style.animation = 'toastSlideDown 0.3s ease-out'
  
  toast.innerHTML = `
    <div class="p-4">
      <div class="flex items-start gap-3">
        <div class="text-xl flex-shrink-0">${icons[type]}</div>
        <div class="flex-1 min-w-0">
          <p class="text-white text-sm break-words">${escapeHtml(message)}</p>
        </div>
        <button class="text-white/40 hover:text-white transition-colors flex-shrink-0 toast-close">✕</button>
      </div>
    </div>
    <div class="h-1 bg-gradient-to-r from-white/50 to-white/10" style="width: 100%; animation: toastShrink ${duration}ms linear forwards"></div>
  `
  
  container.appendChild(toast)
  
  const closeBtn = toast.querySelector('.toast-close')
  if (closeBtn) {
    closeBtn.onclick = () => {
      if (toast.parentNode) toast.remove()
    }
  }
  
  setTimeout(() => {
    if (toast.parentNode) toast.remove()
  }, duration)
  
  return toast
}

const escapeHtml = (text) => {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// Ajouter les styles une seule fois
if (!document.querySelector('#toast-global-styles')) {
  const style = document.createElement('style')
  style.id = 'toast-global-styles'
  style.textContent = `
    @keyframes toastSlideDown {
      from {
        transform: translateY(-100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
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
  success: (msg, opts) => showToast(msg, 'success', opts?.duration || 4000),
  error: (msg, opts) => showToast(msg, 'error', opts?.duration || 4000),
  info: (msg, opts) => showToast(msg, 'info', opts?.duration || 4000),
  warning: (msg, opts) => showToast(msg, 'warning', opts?.duration || 4000),
  loading: (msg) => {
    const container = getContainer()
    const id = 'toast-loading-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5)
    const toast = document.createElement('div')
    toast.id = id
    toast.className = 'max-w-md w-full md:w-96 bg-gradient-to-r from-blue-900/95 to-blue-800/95 backdrop-blur-lg rounded-xl shadow-2xl overflow-hidden border-l-4 border-blue-500 pointer-events-auto mb-2'
    toast.innerHTML = `
      <div class="p-4">
        <div class="flex items-start gap-3">
          <div class="text-xl">⏳</div>
          <div class="flex-1 min-w-0">
            <p class="text-white text-sm">${escapeHtml(msg)}</p>
          </div>
        </div>
      </div>
    `
    container.appendChild(toast)
    
    return {
      update: (newMsg) => {
        const p = toast.querySelector('p')
        if (p) p.textContent = newMsg
      },
      dismiss: () => {
        if (toast.parentNode) toast.remove()
      }
    }
  }
}

export default toast