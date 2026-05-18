// src/components/ErrorBoundary.jsx
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Erreur capturée:', error, errorInfo);
  }

  // Méthode pour recharger la page
  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-900 to-blue-800">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center max-w-md">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-xl font-bold text-white mb-2">Une erreur est survenue</h1>
            <p className="text-white/70 text-sm mb-4">
              {this.state.error?.message || "Erreur inattendue"}
            </p>
            <button
              onClick={this.handleReload}
              className="btn-primary"
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;