// src/utils/toast.js - Version sans JSX
// Système de toast simple sans JSX

let toastContainer = null
let toastCounter = 0

const getToastContainer = () => {
  if (!toastContainer || !document.body.contains(toastContainer)) {
    toastContainer = document.createElement('div')
    toastContainer.className = 'fixed top-4 right-4 left-4 md:left-auto z-50 space-y-2'
    toastContainer.style.pointerEvents = 'none'
    document.body.appendChild(toastContainer)
  }
  return toastContainer
}

const createToastElement = (message, type, duration) => {
  const id = toastCounter++
  const toast = document.createElement('div')
  
  let bgClass = 'bg-gradient-to-r from-blue-900/95 to-blue-800/95 border-blue-500'
  let icon = 'ℹ️'
  
  switch(type) {
    case 'success':
      bgClass = 'bg-gradient-to-r from-green-900/95 to-green-800/95 border-green-500'
      icon = '✅'
      break
    case 'error':
      bgClass = 'bg-gradient-to-r from-red-900/95 to-red-800/95 border-red-500'
      icon = '❌'
      break
    case 'warning':
      bgClass = 'bg-gradient-to-r from-yellow-900/95 to-yellow-800/95 border-yellow-500'
      icon = '⚠️'
      break
    default:
      bgClass = 'bg-gradient-to-r from-blue-900/95 to-blue-800/95 border-blue-500'
      icon = 'ℹ️'
  }
  
  toast.className = `max-w-md w-full md:w-96 rounded-xl shadow-2xl overflow-hidden animate-slide-down border-l-4 pointer-events-auto ${bgClass}`
  toast.id = `toast-${id}`
  toast.setAttribute('id', `toast-${id}`)
  
  toast.innerHTML = `
    <div class="p-4">
      <div class="flex items-start gap-3">
        <div class="text-xl flex-shrink-0">${icon}</div>
        <div class="flex-1 min-w-0">
          <p class="text-white text-sm break-words">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
        </div>
        <button class="text-white/40 hover:text-white transition-colors flex-shrink-0" onclick="this.closest('div[id^=toast-]')?.remove()">✕</button>
      </div>
    </div>
    <div class="h-1 bg-gradient-to-r from-white/50 to-white/10" style="width: 100%; animation: shrink ${duration}ms linear forwards"></div>
  `
  
  // Auto-suppression
  setTimeout(() => {
    if (toast.parentNode) {
      toast.remove()
    }
  }, duration)
  
  return toast
}

export const toast = {
  success: (message, options = {}) => {
    const container = getToastContainer()
    const toast = createToastElement(message, 'success', options.duration || 4000)
    container.appendChild(toast)
    return toast
  },
  error: (message, options = {}) => {
    const container = getToastContainer()
    const toast = createToastElement(message, 'error', options.duration || 4000)
    container.appendChild(toast)
    return toast
  },
  info: (message, options = {}) => {
    const container = getToastContainer()
    const toast = createToastElement(message, 'info', options.duration || 4000)
    container.appendChild(toast)
    return toast
  },
  warning: (message, options = {}) => {
    const container = getToastContainer()
    const toast = createToastElement(message, 'warning', options.duration || 4000)
    container.appendChild(toast)
    return toast
  },
  loading: (message, options = {}) => {
    const id = toastCounter++
    const container = getToastContainer()
    const toast = document.createElement('div')
    toast.className = `max-w-md w-full md:w-96 rounded-xl shadow-2xl overflow-hidden bg-gradient-to-r from-blue-900/95 to-blue-800/95 border-l-4 border-blue-500 pointer-events-auto`
    toast.id = `toast-loading-${id}`
    toast.innerHTML = `
      <div class="p-4">
        <div class="flex items-start gap-3">
          <div class="text-xl">⏳</div>
          <div class="flex-1 min-w-0">
            <p class="text-white text-sm">${message}</p>
          </div>
        </div>
      </div>
    `
    container.appendChild(toast)
    
    return {
      update: (newMessage) => {
        const p = toast.querySelector('p')
        if (p) p.textContent = newMessage
      },
      dismiss: () => toast.remove()
    }
  }
}

export default toast