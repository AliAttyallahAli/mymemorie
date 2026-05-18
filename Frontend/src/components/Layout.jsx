// src/components/Layout.jsx - Version avec ajout du menu Taxes
import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { 
  FaHome, FaExchangeAlt, FaHistory, FaUser, FaSignOutAlt, 
  FaBullhorn, FaCog, FaBell, FaWallet, FaQrcode, FaTimes,
  FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaUserCircle,
  FaMoneyBillWave, FaPhone, FaEnvelope, FaMapMarkerAlt, FaFacebook,
  FaWhatsapp, FaTelegram, FaGlobe, FaArrowDown, FaArrowUp,
  FaStore, FaReceipt, FaIdCard, FaClock, FaShare,
  FaDownload, FaCopy, FaLandmark
} from 'react-icons/fa'
import { IoMdClose } from 'react-icons/io'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useTheme } from '../context/ThemeContext'
import ThemeToggle from './ThemeToggle'
import NotificationManager from './NotificationManager'

function Layout({ user, children, socket }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { isDark } = useTheme()
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [balance, setBalance] = useState(null)
  const [loadingBalance, setLoadingBalance] = useState(false)
  const [qrAmount, setQrAmount] = useState('')
  const [qrDescription, setQrDescription] = useState('')
  const [qrGenerated, setQrGenerated] = useState(false)
  const [qrImageUrl, setQrImageUrl] = useState('')
  const [paymentLink, setPaymentLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [generating, setGenerating] = useState(false)

  // ✅ Navigation items avec Taxes ajouté
  const navItems = [
    { path: '/dashboard', icon: FaHome, label: 'Accueil' },
    { path: '/transfer', icon: FaExchangeAlt, label: 'Transfert' },
    { path: '/deposit', icon: FaStore, label: 'Dépôt' },
    { path: '/withdraw', icon: FaMoneyBillWave, label: 'Retrait' },
    { path: '/tax-payment', icon: FaLandmark, label: 'Impôts & Taxes' }, // ✅ Nouveau menu Taxes
    { path: '/history', icon: FaHistory, label: 'Historique' },
    { path: '/profile', icon: FaUser, label: 'Profil' },
    { path: '/settings', icon: FaCog, label: 'Paramètres' },
    { path: '/announcements', icon: FaBullhorn, label: 'Annonces' },
    { path: '/blog', icon: FaBullhorn, label: 'Blog' },
  ]

  if (user?.role === 'admin') {
    navItems.push({ path: '/admin', icon: FaUserCircle, label: 'Admin' })
  }

  const footerLinks = [
    { path: '/terms', label: 'Conditions' },
    { path: '/privacy', label: 'Confidentialité' },
    { path: '/contact', label: 'Contact' },
    { path: '/faq', label: 'FAQ' },
    { path: '/agents', label: 'Agents' },
  ]

  const socialLinks = [
    { icon: FaFacebook, href: 'https://facebook.com/cashpays', color: 'hover:bg-[#1877f2]' },
    { icon: FaWhatsapp, href: 'https://wa.me/23562787307', color: 'hover:bg-[#25d366]' },
    { icon: FaTelegram, href: 'https://t.me/cashpays', color: 'hover:bg-[#0088cc]' },
    { icon: FaGlobe, href: 'https://cashpays.td', color: 'hover:bg-blue-500' },
  ]

  useEffect(() => {
    if (user) {
      fetchBalance()
    }
  }, [user])

  useEffect(() => {
    if (socket) {
      socket.on('notification', (notification) => {
        console.log('📢 Nouvelle notification reçue:', notification)
        toast.success(notification.message, {
          duration: 5000,
          position: 'top-right',
          icon: '🔔'
        })
      })
      
      socket.on('transaction_update', () => fetchBalance())
      socket.on('balance_updated', (data) => {
        if (data.user_id === user?.id) setBalance(data.new_balance)
      })
    }
    
    return () => {
      if (socket) {
        socket.off('notification')
        socket.off('transaction_update')
        socket.off('balance_updated')
      }
    }
  }, [socket, user])

  const fetchBalance = async () => {
    if (loadingBalance) return
    setLoadingBalance(true)
    try {
      const token = localStorage.getItem('accessToken')
      const response = await axios.get('/api/wallet/balance', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setBalance(response.data.balance)
    } catch (error) {
      console.error('Erreur chargement solde:', error)
    } finally {
      setLoadingBalance(false)
    }
  }

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      await axios.post('/api/auth/logout', {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch (error) {
      console.error('Erreur déconnexion:', error)
    } finally {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      toast.success('Déconnecté avec succès')
      navigate('/login')
    }
  }

  const generatePaymentLink = () => {
    const amountNum = parseInt(qrAmount)
    if (amountNum && amountNum < 25) {
      toast.error('Le montant minimum est de 25 FCFA')
      return null
    }
    
    const params = new URLSearchParams()
    if (user?.phone) params.append('phone', user.phone)
    if (amountNum) params.append('amount', amountNum)
    if (qrDescription) params.append('description', qrDescription)
    
    return `${window.location.origin}/transfer?${params.toString()}`
  }

  const generateDynamicQR = async () => {
    const link = generatePaymentLink()
    if (!link) return
    
    setGenerating(true)
    
    try {
      const encodedLink = encodeURIComponent(link)
      const qrApiUrl = `https://quickchart.io/qr?text=${encodedLink}&size=250&margin=2`
      
      const response = await fetch(qrApiUrl)
      if (response.ok) {
        setPaymentLink(link)
        setQrImageUrl(qrApiUrl)
        setQrGenerated(true)
        toast.success('QR code généré avec succès !')
      } else {
        throw new Error('Erreur génération QR code')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error('Erreur lors de la génération')
    } finally {
      setGenerating(false)
    }
  }

  const resetQRGenerator = () => {
    setQrGenerated(false)
    setQrAmount('')
    setQrDescription('')
    setQrImageUrl('')
    setPaymentLink('')
  }

  const copyToClipboard = (text) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Lien copié !')
    setTimeout(() => setCopied(false), 2000)
  }

  const shareViaWhatsApp = () => {
    if (!paymentLink) return
    const message = `💰 *Demande de paiement CashPays*\n\nCliquez sur ce lien pour me payer :\n${paymentLink}`
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
  }

  const shareViaEmail = () => {
    if (!paymentLink) return
    const subject = 'Demande de paiement CashPays'
    const body = `Bonjour,\n\nLien de paiement: ${paymentLink}\n\nMerci !`
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  const downloadQRCode = () => {
    if (qrImageUrl) {
      const link = document.createElement('a')
      link.download = `cashpays-payment-${user?.phone}.png`
      link.href = qrImageUrl
      link.click()
      toast.success('QR code téléchargé')
    }
  }

  const formatAmount = (amount) => {
    if (amount === null || amount === undefined) return '--- FCFA'
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
  }

  const isActiveLink = (path) => {
    if (path === '/admin') return location.pathname.startsWith('/admin')
    if (path === '/tax-payment') return location.pathname === '/tax-payment'
    return location.pathname === path
  }

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'dark' : 'light'}`}>
      {/* Header */}
      <header className={`sticky top-0 z-40 border-b ${isDark ? 'bg-blue-900/80 border-white/10' : 'bg-white/90 border-gray-200'} backdrop-blur-md`}>
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <Link to="/home" className="flex items-center gap-2 group">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-2 rounded-xl group-hover:scale-105 transition-transform">
                <FaMoneyBillWave className="text-white text-xl" />
              </div>
              <div>
                <span className={`font-bold text-xl ${isDark ? 'text-white' : 'text-gray-900'}`}>CashPays</span>
                <span className="text-blue-400 text-xs block">GOUROUSDJA</span>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              {balance !== null && (
                <div className={`hidden md:flex items-center gap-2 rounded-full px-3 py-1.5 ${isDark ? 'bg-white/10' : 'bg-gray-100'}`}>
                  {loadingBalance ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <FaWallet className={`text-sm ${isDark ? 'text-blue-300' : 'text-blue-600'}`} />
                  )}
                  <span className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {formatAmount(balance)}
                  </span>
                </div>
              )}

              <ThemeToggle />
              <NotificationManager user={user} socket={socket} />

              <button
                onClick={() => setShowQR(true)}
                className={`p-2 rounded-full transition-all ${isDark ? 'text-white/70 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'}`}
                title="Générer un QR code de paiement"
              >
                <FaQrcode size={18} />
              </button>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`md:hidden p-2 rounded-full ${isDark ? 'text-white' : 'text-gray-700'}`}
              >
                <FaUserCircle size={24} />
              </button>

              <button
                onClick={handleLogout}
                className={`hidden md:flex items-center gap-2 transition-colors ${isDark ? 'text-white/60 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <FaSignOutAlt />
                <span className="text-sm">Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6 pb-24 md:pb-6">
        {children}
      </main>

      {/* Footer */}
      <footer className={`mt-auto border-t ${isDark ? 'border-white/10 bg-blue-900/30' : 'border-gray-200 bg-gray-50'} py-6`}>
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <div className="flex items-center gap-2 mb-2">
                <FaMoneyBillWave className={`text-xl ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>CashPays</span>
              </div>
              <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                © 2026 CashPays - GOUROUSDJA
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-6">
              {footerLinks.map((link) => (
                <Link key={link.path} to={link.path} className={`text-sm transition-colors ${isDark ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="flex gap-3">
              {socialLinks.map((social, index) => (
                <a key={index} href={social.href} target="_blank" rel="noopener noreferrer" className={`p-2 rounded-full transition-all ${isDark ? 'bg-white/10 text-white/70 hover:text-white' : 'bg-gray-100 text-gray-600 hover:text-gray-900'} ${social.color}`}>
                  <social.icon size={16} />
                </a>
              ))}
            </div>
          </div>

          <div className={`mt-4 pt-4 text-center text-xs ${isDark ? 'text-white/30' : 'text-gray-400'} border-t ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
            <p>Service client: 62 78 73 07 | support@cashpays.td</p>
          </div>
        </div>
      </footer>

      {/* Bottom Navigation Mobile */}
      <nav className={`fixed bottom-0 left-0 right-0 border-t z-40 md:hidden ${isDark ? 'bg-blue-900/95 border-white/10' : 'bg-white/95 border-gray-200'} backdrop-blur-lg`}>
        <div className="container mx-auto px-2">
          <div className="flex justify-around py-2">
            {navItems.slice(0, 4).map((item) => (
              <Link key={item.path} to={item.path} className={`flex flex-col items-center py-2 px-3 rounded-lg ${isActiveLink(item.path) ? 'text-blue-400' : isDark ? 'text-white/50' : 'text-gray-500'}`}>
                <item.icon className="text-xl" />
                <span className="text-xs mt-1">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Sidebar Desktop AVEC SCROLL */}
      <aside className={`hidden md:block fixed left-0 top-[73px] bottom-0 w-64 border-r z-30 ${isDark ? 'bg-blue-900/40 border-white/10' : 'bg-white/80 border-gray-200'} backdrop-blur-sm`}>
        <div className="p-4 h-full flex flex-col">
          {/* User info - fixe en haut */}
          <div className={`mb-6 p-3 rounded-xl flex-shrink-0 ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-2 rounded-full">
                <FaUser className="text-white" />
              </div>
              <div className="flex-1">
                <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{user?.fullname || 'Utilisateur'}</p>
                <p className={`text-xs truncate ${isDark ? 'text-white/40' : 'text-gray-500'}`}>{user?.phone}</p>
              </div>
            </div>
            {balance !== null && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <div className="flex justify-between">
                  <span className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>Solde</span>
                  <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{formatAmount(balance)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Navigation items avec SCROLL */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActiveLink(item.path)
                    ? 'bg-blue-600 text-white'
                    : isDark ? 'text-white/70 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <item.icon />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Logout - fixe en bas */}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-4 py-3 mt-6 rounded-lg flex-shrink-0 ${
              isDark ? 'text-white/50 hover:bg-white/10' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <FaSignOutAlt />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      <div className="hidden md:block md:ml-64"></div>

      {/* Mobile menu panel */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className={`absolute inset-0 ${isDark ? 'bg-black/60' : 'bg-black/30'}`} onClick={() => setMobileMenuOpen(false)} />
          <div className={`absolute right-0 top-0 bottom-0 w-64 shadow-xl p-4 overflow-y-auto ${isDark ? 'bg-blue-900' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Menu</h3>
              <button onClick={() => setMobileMenuOpen(false)} className={isDark ? 'text-white/60' : 'text-gray-500'}>
                <FaTimes size={20} />
              </button>
            </div>
            <div className={`mb-6 p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
              <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{user?.fullname}</p>
              <p className={`text-sm ${isDark ? 'text-white/40' : 'text-gray-500'}`}>{user?.phone}</p>
              {balance !== null && <p className={`text-sm mt-2 ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>{formatAmount(balance)}</p>}
            </div>
            {navItems.map((item) => (
              <Link key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-3 px-4 py-3 rounded-lg ${isDark ? 'text-white/70 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'}`}>
                <item.icon />
                <span>{item.label}</span>
              </Link>
            ))}
            <button onClick={handleLogout} className={`w-full flex items-center gap-3 px-4 py-3 mt-6 rounded-lg ${isDark ? 'text-white/50 hover:bg-white/10' : 'text-gray-500 hover:bg-gray-100'}`}>
              <FaSignOutAlt /><span>Déconnexion</span>
            </button>
          </div>
        </div>
      )}

      {/* QR CODE MODAL */}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
          <div className={`relative max-w-md w-full rounded-2xl shadow-2xl ${isDark ? 'bg-blue-900' : 'bg-white'} max-h-[90vh] overflow-y-auto`}>
            <div className="sticky top-0 p-4 border-b border-white/10 flex justify-between items-center bg-inherit">
              <h3 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
                <FaQrcode className="text-blue-400" /> QR Code de paiement
              </h3>
              <button onClick={() => setShowQR(false)} className={isDark ? 'text-white/60 hover:text-white' : 'text-gray-400 hover:text-gray-600'}>
                <FaTimes size={20} />
              </button>
            </div>

            <div className="p-6">
              {!qrGenerated ? (
                <div className="space-y-4">
                  <div className="text-center mb-4">
                    <div className="w-20 h-20 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center mb-3">
                      <FaQrcode className="text-blue-400 text-3xl" />
                    </div>
                    <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                      Générez un QR code pour recevoir un paiement
                    </p>
                  </div>

                  <div>
                    <label className="label">Montant (optionnel)</label>
                    <input
                      type="number"
                      value={qrAmount}
                      onChange={(e) => setQrAmount(e.target.value)}
                      className="input-field"
                      placeholder="Ex: 5000"
                      min="25"
                    />
                  </div>

                  <div>
                    <label className="label">Description</label>
                    <input
                      type="text"
                      value={qrDescription}
                      onChange={(e) => setQrDescription(e.target.value)}
                      className="input-field"
                      placeholder="Ex: Paiement service"
                    />
                  </div>

                  <button 
                    onClick={generateDynamicQR} 
                    disabled={generating}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    {generating ? 'Génération...' : 'Générer mon QR code'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center">
                    {qrImageUrl && (
                      <img
                        src={qrImageUrl}
                        alt="QR Code"
                        className="w-48 h-48 mx-auto bg-white p-4 rounded-xl shadow-lg"
                      />
                    )}
                  </div>

                  <div className={`p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                    <div className="flex justify-between text-sm">
                      <span>Votre numéro</span>
                      <span className="font-mono font-bold">{user?.phone}</span>
                    </div>
                    {qrAmount && (
                      <div className="flex justify-between text-sm mt-2">
                        <span>Montant</span>
                        <span className="text-green-400 font-bold">{parseInt(qrAmount).toLocaleString()} FCFA</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm mt-2 pt-2 border-t">
                      <button onClick={() => copyToClipboard(paymentLink)} className="text-blue-400 text-xs">
                        Copier le lien
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={downloadQRCode} className="flex-1 btn-secondary text-sm">
                      <FaDownload className="inline mr-1" /> Télécharger
                    </button>
                    <button onClick={shareViaWhatsApp} className="flex-1 bg-[#25d366]/20 text-white text-sm py-2 rounded-lg">
                      <FaWhatsapp className="inline mr-1" /> WhatsApp
                    </button>
                  </div>

                  <button onClick={resetQRGenerator} className="w-full text-sm text-white/40">
                    Générer un nouveau QR code
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Layout