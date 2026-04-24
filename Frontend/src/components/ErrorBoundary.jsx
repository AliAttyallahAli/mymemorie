import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Erreur capturée:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="card text-center max-w-md">
            <div className="text-red-400 text-6xl mb-4">⚠️</div>
            <h2 className="text-white text-xl font-bold mb-2">Une erreur est survenue</h2>
            <p className="text-white/60 mb-4">
              {this.state.error?.message || 'Veuillez rafraîchir la page'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Rafraîchir
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary