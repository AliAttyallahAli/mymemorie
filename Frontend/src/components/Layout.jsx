// src/components/Layout.jsx
import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
    FaHome, FaExchangeAlt, FaHistory, FaUser, FaSignOutAlt, FaComments,
    FaBullhorn, FaCog, FaBell, FaWallet, FaQrcode, FaTimes, FaUsers, FaHandHoldingUsd,
    FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaUserCircle,
    FaMoneyBillWave, FaPhone, FaEnvelope, FaMapMarkerAlt, FaFacebook,
    FaWhatsapp, FaTelegram, FaGlobe, FaArrowDown, FaArrowUp, FaPiggyBank,
    FaStore, FaReceipt, FaIdCard, FaClock, FaShare, FaChartLine, FaUserShield,
    FaDownload, FaCopy, FaUniversity, FaCreditCard, FaComment, FaLandmark,
    FaBuilding, FaTint, FaPlug, FaClipboardList, FaBus, FaTicketAlt
} from 'react-icons/fa'
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
    const [isCompanyAgent, setIsCompanyAgent] = useState(false)
    const [unreadMessages, setUnreadMessages] = useState(0)
    const [hasCard, setHasCard] = useState(false)

    // ============================================
    // VÉRIFICATIONS
    // ============================================
    useEffect(() => {
        const checkCompanyStatus = async () => {
            if (user?.role === 'agent') {
                try {
                    const token = localStorage.getItem('accessToken')
                    const response = await axios.get('/api/company/check', {
                        headers: { Authorization: `Bearer ${token}` }
                    }).catch(() => ({ data: { isCompanyAgent: false } }))
                    setIsCompanyAgent(response.data?.isCompanyAgent || false)
                } catch {
                    setIsCompanyAgent(false)
                }
            }
        }
        checkCompanyStatus()
    }, [user])

    // Vérifier si l'utilisateur a une carte virtuelle active
    useEffect(() => {
        const checkCardStatus = async () => {
            if (!user) return
            try {
                const token = localStorage.getItem('accessToken')
                const res = await axios.get('/api/cards/my-card', {
                    headers: { Authorization: `Bearer ${token}` }
                }).catch(() => ({ data: { card: null } }))
                setHasCard(res.data?.card?.status === 'active')
            } catch {
                setHasCard(false)
            }
        }
        checkCardStatus()
    }, [user])

    // Messages non lus
    useEffect(() => {
        const fetchUnreadMessages = async () => {
            if (!user) return
            try {
                const token = localStorage.getItem('accessToken')
                const response = await axios.get('/api/chat/unread-count', {
                    headers: { Authorization: `Bearer ${token}` }
                }).catch(() => ({ data: { count: 0 } }))
                setUnreadMessages(response.data?.count || 0)
            } catch {
                setUnreadMessages(0)
            }
        }
        fetchUnreadMessages()
        const interval = setInterval(fetchUnreadMessages, 30000)
        return () => clearInterval(interval)
    }, [user])

    // ============================================
    // NAVIGATION ITEMS
    // ============================================
    const navItems = [
        { path: '/dashboard', icon: FaHome, label: 'Accueil' },
        { path: '/my-company', icon: FaBuilding, label: 'Mon Entreprise' },
        { path: '/tax-management', icon: FaLandmark, label: 'Gestion des Taxes' },
        { path: '/company/dashboard', icon: FaStore, label: 'Mon Bureau' },

        // ✅ Menu ÉPARGNE
        { path: '/savings', icon: FaPiggyBank, label: 'Épargne' },

        // ✅ Menu INVESTISSEMENTS
        { path: '/investments', icon: FaChartLine, label: 'Investissements' },

        // ✅ Menu PRÊTS
        {
            path: '/loans',
            icon: FaHandHoldingUsd,
            label: 'Prêts',
            subLabel: 'Demander un prêt',
            roles: ['user', 'agent']
        },

        // ✅ Menu CARTE VIRTUELLE
        {
            path: '/virtual-card',
            icon: FaCreditCard,
            label: hasCard ? 'Ma Carte' : 'Demander une carte',
            subLabel: hasCard ? 'Carte active' : 'Carte virtuelle',
            badge: hasCard ? null : 'NEW',
            roles: ['user', 'agent', 'admin', 'commune']
        },

        // ✅ Menu ENCAISSER (paiement par carte)
        {
            path: '/card-payment',
            icon: FaUniversity,
            label: 'Encaisser',
            subLabel: 'Paiement par carte',
            roles: ['user', 'agent', 'admin']
        },

        // ✅ Menu AGENCE (agents)
        {
            path: '/agency-management',
            icon: FaBuilding,
            label: 'Agence',
            subLabel: 'Gestion voyages',
            roles: ['agent', 'admin']
        },

        { path: '/history', icon: FaHistory, label: 'Historique' },
        { path: '/settings', icon: FaCog, label: 'Paramètres' },
        { path: '/announcements', icon: FaBell, label: 'Annonces' },
        { path: '/blog', icon: FaBullhorn, label: 'Blog' },
        { path: '/profile', icon: FaUser, label: 'Profil' },

        {
            path: '/chat',
            icon: FaComments,
            label: 'Messagerie',
            subLabel: 'Discuter',
            badge: unreadMessages > 0 ? unreadMessages : null,
            roles: ['user', 'agent', 'admin', 'commune']
        },
    ]

    // ✅ Menu Admin (séparé)
    const adminItems = [
        { path: '/admin', icon: FaUserShield, label: 'Admin' },
        { path: '/admin/savings', icon: FaPiggyBank, label: 'Gestion Épargne' },
        { path: '/admin/loans', icon: FaHandHoldingUsd, label: 'Gestion Prêts' },
        { path: '/admin/cards', icon: FaCreditCard, label: 'Gestion Cartes' },
    ]

    // ============================================
    // FILTRAGE PAR RÔLE
    // ============================================
    const getFilteredNavItems = () => {
        return navItems.filter(item => {
            if (!item.roles) return true
            return item.roles.includes(user?.role)
        })
    }

    const filteredNavItems = getFilteredNavItems()

    const allNavItems = user?.role === 'admin'
        ? [...filteredNavItems, ...adminItems]
        : filteredNavItems

    const footerLinks = [
        { path: '/terms', label: 'Conditions' },
        { path: '/privacy', label: 'Confidentialité' },
        { path: '/contact', label: 'Contact' },
        { path: '/faq', label: 'FAQ' },
        { path: '/agents', label: 'Agents' },
    ]

    const socialLinks = [
        { icon: FaFacebook, href: 'https://facebook.com/AlkherPay', color: 'hover:bg-[#1877f2]' },
        { icon: FaWhatsapp, href: 'https://wa.me/23562787307', color: 'hover:bg-[#25d366]' },
        { icon: FaTelegram, href: 'https://t.me/AlkherPay', color: 'hover:bg-[#0088cc]' },
        { icon: FaGlobe, href: 'https://alkherpay.td', color: 'hover:bg-blue-500' },
    ]

    // ============================================
    // EFFETS SOLDE / SOCKET
    // ============================================
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

    // ============================================
    // QR CODE
    // ============================================
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
        const message = `💰 *Demande de paiement AlkherPay*\n\nCliquez sur ce lien pour me payer :\n${paymentLink}`
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
    }

    const downloadQRCode = () => {
        if (qrImageUrl) {
            const link = document.createElement('a')
            link.download = `alkherpay-payment-${user?.phone}.png`
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
        return location.pathname === path
    }

    // Items pour la navigation mobile (premiers 5)
    const mobileNavItems = filteredNavItems.slice(0, 5)

    // ============================================
    // RENDU
    // ============================================
    return (
        <div className={`min-h-screen flex flex-col ${isDark ? 'dark' : 'light'}`}>
            {/* HEADER */}
            <header className={`sticky top-0 z-40 border-b ${isDark ? 'bg-blue-900/80 border-white/10' : 'bg-white/90 border-gray-200'} backdrop-blur-md`}>
                <div className="container mx-auto px-4 py-3">
                    <div className="flex justify-between items-center">
                        <Link to="/dashboard" className="flex items-center gap-2 group">
                            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-2 rounded-xl group-hover:scale-105 transition-transform">
                                <FaMoneyBillWave className="text-white text-xl" />
                            </div>
                            <div>
                                <span className={`font-bold text-xl ${isDark ? 'text-white' : 'text-gray-900'}`}>AlkherPay</span>
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

            {/* SIDEBAR DESKTOP */}
            <aside className={`hidden md:block fixed left-0 top-[73px] bottom-0 w-64 border-r z-30 ${isDark ? 'bg-blue-900/40 border-white/10' : 'bg-white/80 border-gray-200'} backdrop-blur-sm`}>
                <div className="p-4 h-full flex flex-col">
                    {/* User info */}
                    <div className={`mb-6 p-3 rounded-xl flex-shrink-0 ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                        <div className="flex items-center gap-3">
                            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-2 rounded-full">
                                <FaUser className="text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {user?.fullname || 'Utilisateur'}
                                </p>
                                <p className={`text-xs truncate ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                                    {user?.phone}
                                </p>
                                {user?.role === 'agent' && (
                                    <span className="text-[10px] text-yellow-400">🏢 Agent</span>
                                )}
                                {user?.role === 'admin' && (
                                    <span className="text-[10px] text-red-400">🛡️ Admin</span>
                                )}
                                {hasCard && (
                                    <span className="text-[10px] text-purple-400 block">💳 Carte active</span>
                                )}
                            </div>
                        </div>
                        {balance !== null && (
                            <div className={`mt-3 pt-3 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                                <div className="flex justify-between">
                                    <span className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>Solde</span>
                                    <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                        {formatAmount(balance)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Navigation items avec SCROLL */}
                    <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                        {allNavItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${
                                    isActiveLink(item.path)
                                        ? 'bg-yellow-500 text-black'
                                        : isDark ? 'text-white/70 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                <item.icon className="text-lg flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium truncate">{item.label}</div>
                                    {item.subLabel && (
                                        <div className={`text-[10px] truncate ${isActiveLink(item.path) ? 'text-black/70' : 'text-gray-400'}`}>
                                            {item.subLabel}
                                        </div>
                                    )}
                                </div>
                                {item.badge && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                        item.badge === 'NEW'
                                            ? 'bg-green-500 text-white'
                                            : 'bg-red-500 text-white'
                                    }`}>
                                        {item.badge}
                                    </span>
                                )}
                            </Link>
                        ))}
                    </div>

                    {/* Logout */}
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

            {/* Espace pour la sidebar desktop */}
            <div className="hidden md:block md:ml-64">
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
                                    <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>AlkherPay</span>
                                </div>
                                <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                                    © 2026 AlkherPay - GOUROUSDJA
                                </p>
                            </div>

                            <div className="flex flex-wrap justify-center gap-6">
                                {footerLinks.map((link) => (
                                    <Link
                                        key={link.path}
                                        to={link.path}
                                        className={`text-sm transition-colors ${isDark ? 'text-white/50 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                            </div>

                            <div className="flex gap-3">
                                {socialLinks.map((social, index) => (
                                    <a
                                        key={index}
                                        href={social.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`p-2 rounded-full transition-all ${isDark ? 'bg-white/10 text-white/70 hover:text-white' : 'bg-gray-100 text-gray-600 hover:text-gray-900'} ${social.color}`}
                                    >
                                        <social.icon size={16} />
                                    </a>
                                ))}
                            </div>
                        </div>

                        <div className={`mt-4 pt-4 text-center text-xs ${isDark ? 'text-white/30' : 'text-gray-400'} border-t ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
                            <p>Service client: 62 78 73 07 |supportalkher@gmail.com</p>
                        </div>
                    </div>
                </footer>
            </div>

            {/* MAIN CONTENT MOBILE */}
            <div className="md:hidden flex-1">
                <main className="container mx-auto px-4 py-6 pb-24">
                    {children}
                </main>
            </div>

            {/* BOTTOM NAVIGATION MOBILE */}
            <nav className={`fixed bottom-0 left-0 right-0 border-t z-40 md:hidden ${isDark ? 'bg-blue-900/95 border-white/10' : 'bg-white/95 border-gray-200'} backdrop-blur-lg`}>
                <div className="container mx-auto px-2">
                    <div className="flex justify-around py-2">
                        {mobileNavItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex flex-col items-center py-2 px-3 rounded-lg relative ${
                                    isActiveLink(item.path)
                                        ? 'text-yellow-400'
                                        : isDark ? 'text-white/50' : 'text-gray-500'
                                }`}
                            >
                                <item.icon className="text-xl" />
                                <span className="text-xs mt-1">{item.label}</span>
                                {item.badge && (
                                    <span className="absolute top-0 right-0 text-[8px] bg-red-500 text-white px-1 rounded-full">
                                        {item.badge}
                                    </span>
                                )}
                            </Link>
                        ))}
                    </div>
                </div>
            </nav>

            {/* MOBILE MENU PANEL */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-50 md:hidden">
                    <div
                        className={`absolute inset-0 ${isDark ? 'bg-black/60' : 'bg-black/30'}`}
                        onClick={() => setMobileMenuOpen(false)}
                    />
                    <div className={`absolute right-0 top-0 bottom-0 w-64 shadow-xl p-4 overflow-y-auto ${isDark ? 'bg-blue-900' : 'bg-white'}`}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Menu</h3>
                            <button
                                onClick={() => setMobileMenuOpen(false)}
                                className={isDark ? 'text-white/60' : 'text-gray-500'}
                            >
                                <FaTimes size={20} />
                            </button>
                        </div>

                        <div className={`mb-6 p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                            <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{user?.fullname}</p>
                            <p className={`text-sm ${isDark ? 'text-white/40' : 'text-gray-500'}`}>{user?.phone}</p>
                            {balance !== null && (
                                <p className={`text-sm mt-2 ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>
                                    {formatAmount(balance)}
                                </p>
                            )}
                        </div>

                        {allNavItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setMobileMenuOpen(false)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                                    isActiveLink(item.path)
                                        ? 'bg-yellow-500 text-black'
                                        : isDark ? 'text-white/70 hover:bg-white/10' : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                <item.icon />
                                <span className="flex-1">{item.label}</span>
                                {item.badge && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                        item.badge === 'NEW'
                                            ? 'bg-green-500 text-white'
                                            : 'bg-red-500 text-white'
                                    }`}>
                                        {item.badge}
                                    </span>
                                )}
                            </Link>
                        ))}

                        <button
                            onClick={handleLogout}
                            className={`w-full flex items-center gap-3 px-4 py-3 mt-6 rounded-lg ${
                                isDark ? 'text-white/50 hover:bg-white/10' : 'text-gray-500 hover:bg-gray-100'
                            }`}
                        >
                            <FaSignOutAlt />
                            <span>Déconnexion</span>
                        </button>
                    </div>
                </div>
            )}

            {/* QR CODE MODAL */}
            {showQR && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
                    <div className={`relative max-w-md w-full rounded-2xl shadow-2xl ${isDark ? 'bg-blue-900' : 'bg-white'} max-h-[90vh] overflow-y-auto`}>
                        <div className={`sticky top-0 p-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'} flex justify-between items-center ${isDark ? 'bg-blue-900' : 'bg-white'}`}>
                            <h3 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
                                <FaQrcode className="text-blue-400" /> QR Code de paiement
                            </h3>
                            <button
                                onClick={() => setShowQR(false)}
                                className={isDark ? 'text-white/60 hover:text-white' : 'text-gray-400 hover:text-gray-600'}
                            >
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
                                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                                            Montant (optionnel)
                                        </label>
                                        <input
                                            type="number"
                                            value={qrAmount}
                                            onChange={(e) => setQrAmount(e.target.value)}
                                            className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 ${
                                                isDark
                                                    ? 'bg-white/10 border-white/20 text-white placeholder-white/40'
                                                    : 'bg-gray-50 border-gray-300 text-gray-900'
                                            }`}
                                            placeholder="Ex: 5000"
                                            min="25"
                                        />
                                    </div>

                                    <div>
                                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                                            Description
                                        </label>
                                        <input
                                            type="text"
                                            value={qrDescription}
                                            onChange={(e) => setQrDescription(e.target.value)}
                                            className={`w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-blue-500 ${
                                                isDark
                                                    ? 'bg-white/10 border-white/20 text-white placeholder-white/40'
                                                    : 'bg-gray-50 border-gray-300 text-gray-900'
                                            }`}
                                            placeholder="Ex: Paiement service"
                                        />
                                    </div>

                                    <button
                                        onClick={generateDynamicQR}
                                        disabled={generating}
                                        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-lg hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                                    >
                                        {generating ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Génération...
                                            </>
                                        ) : (
                                            <>
                                                <FaQrcode /> Générer mon QR code
                                            </>
                                        )}
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
                                        <div className={`flex justify-between text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                            <span className={isDark ? 'text-white/60' : 'text-gray-500'}>Votre numéro</span>
                                            <span className="font-mono font-bold">{user?.phone}</span>
                                        </div>
                                        {qrAmount && (
                                            <div className={`flex justify-between text-sm mt-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                                <span className={isDark ? 'text-white/60' : 'text-gray-500'}>Montant</span>
                                                <span className="text-green-500 font-bold">
                                                    {parseInt(qrAmount).toLocaleString()} FCFA
                                                </span>
                                            </div>
                                        )}
                                        <div className={`flex justify-between text-sm mt-2 pt-2 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                                            <button
                                                onClick={() => copyToClipboard(paymentLink)}
                                                className="text-blue-400 text-xs flex items-center gap-1 hover:text-blue-300"
                                            >
                                                {copied ? <FaCheckCircle /> : <FaCopy />}
                                                {copied ? 'Copié !' : 'Copier le lien'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={downloadQRCode}
                                            className="flex-1 bg-gray-600 text-white text-sm py-2 rounded-lg hover:bg-gray-700 transition flex items-center justify-center gap-1"
                                        >
                                            <FaDownload /> Télécharger
                                        </button>
                                        <button
                                            onClick={shareViaWhatsApp}
                                            className="flex-1 bg-[#25d366] text-white text-sm py-2 rounded-lg hover:bg-[#20b859] transition flex items-center justify-center gap-1"
                                        >
                                            <FaWhatsapp /> WhatsApp
                                        </button>
                                    </div>

                                    <button
                                        onClick={resetQRGenerator}
                                        className={`w-full text-sm transition ${
                                            isDark ? 'text-white/40 hover:text-white/60' : 'text-gray-400 hover:text-gray-600'
                                        }`}
                                    >
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