// src/pages/Settings.jsx
import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
    FaUser, FaBell, FaLock, FaLanguage, FaGlobe,
    FaMoneyBillWave, FaShieldAlt, FaPalette, FaMobile,
    FaExchangeAlt, FaDatabase, FaSave, FaUndo, FaKey,
    FaEnvelope, FaSms, FaMoon, FaSun, FaQrcode, FaFingerprint,
    FaChartLine, FaPercent, FaMinusCircle, FaPlusCircle,
    FaDownload, FaWhatsapp, FaCopy, FaShare, FaLockOpen,
    FaClock, FaCheckCircle, FaExclamationTriangle, FaChevronRight,
    FaSpinner
} from 'react-icons/fa'
import Layout from '../components/Layout'

// ✅ API_URL vide → proxy Vite
const API_URL = ''

function Settings({ user }) {
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState('profile')
    const [loading, setLoading] = useState(false)
    const [provinces, setProvinces] = useState([])

    // QR
    const [qrAmount, setQrAmount] = useState('')
    const [qrDescription, setQrDescription] = useState('')
    const [qrGenerated, setQrGenerated] = useState(false)
    const [qrImageUrl, setQrImageUrl] = useState('')
    const [paymentLink, setPaymentLink] = useState('')
    const [generating, setGenerating] = useState(false)
    const [copied, setCopied] = useState(false)

    // PIN
    const [transactionPin, setTransactionPin] = useState({
        currentPin: '',
        newPin: '',
        confirmPin: '',
        isPinSet: false
    })
    const [showPinModal, setShowPinModal] = useState(false)
    const [pinMode, setPinMode] = useState('create')
    const [pinError, setPinError] = useState('')
    const [pinSuccess, setPinSuccess] = useState('')
    const [resetRequestSent, setResetRequestSent] = useState(false)
    const [resetReason, setResetReason] = useState('')
    const [showResetModal, setShowResetModal] = useState(false)

    // 2FA
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)

    // États principaux
    const [profileData, setProfileData] = useState({
        fullname: '',
        phone: '',
        email: '',
        province: '',
        city: '',
        address: ''
    })

    const [securityData, setSecurityData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    })

    const [preferences, setPreferences] = useState({
        language: 'fr',
        theme: 'dark',
        notifications: {
            email: true,
            sms: true,
            push: true,
            transaction: true,
            promo: true
        },
        biometric: false,
        quickActions: true,
        defaultTransferMessage: ''
    })

    const [appSettings, setAppSettings] = useState({
        minTransaction: 25,
        maxTransaction: 10000000,
        transferFee: 2,
        depositFee: 0,
        withdrawalFee: 2,
        referralBonus: 500,
        maintenanceMode: false,
        allowInternationalTransfer: false
    })

    const getToken = () => localStorage.getItem('accessToken') || localStorage.getItem('token')
    const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${getToken()}` } })

    // ============================================
    // EFFETS
    // ============================================
    useEffect(() => {
        if (!user) {
            navigate('/login')
            return
        }
        fetchProvinces()
        fetchUserProfile()
        fetchUserPreferences()
        fetchTransactionPinStatus()
        fetch2FAStatus()
        if (user?.role === 'admin') {
            fetchAppSettings()
        }
    }, [user])

    // ============================================
    // CHARGEMENT DES DONNÉES
    // ============================================
    const fetchProvinces = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/provinces`, getAuthHeaders())
            if (Array.isArray(response.data)) {
                setProvinces(response.data)
            }
        } catch (error) {
            console.error('Erreur provinces:', error)
        }
    }

    const fetchUserProfile = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/user/me`, getAuthHeaders())
            setProfileData({
                fullname: response.data.fullname || '',
                phone: response.data.phone || '',
                email: response.data.email || '',
                province: response.data.province || '',
                city: response.data.city || '',
                address: response.data.address || ''
            })
        } catch (error) {
            console.error('Erreur profil:', error)
        }
    }

    const fetchTransactionPinStatus = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/user/pin-status`, getAuthHeaders())
            setTransactionPin(prev => ({
                ...prev,
                isPinSet: response.data.isPinSet || false
            }))
        } catch (error) {
            console.error('Erreur statut PIN:', error)
        }
    }

    const fetch2FAStatus = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/user/2fa/status`, getAuthHeaders())
            setTwoFactorEnabled(response.data.enabled || false)
        } catch (error) {
            console.error('Erreur statut 2FA:', error)
        }
    }

    const fetchUserPreferences = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/user/preferences`, getAuthHeaders())
                .catch(() => ({ data: null }))

            if (response.data) {
                setPreferences(prev => ({ ...prev, ...response.data }))
                console.log('✅ Préférences chargées:', response.data)
            }

            const savedTheme = localStorage.getItem('theme')
            if (savedTheme) {
                setPreferences(prev => ({ ...prev, theme: savedTheme }))
            }
        } catch (error) {
            console.error('Erreur préférences:', error)
        }
    }

    const fetchAppSettings = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/admin/settings`, getAuthHeaders())
            if (response.data) {
                setAppSettings(prev => ({ ...prev, ...response.data }))
            }
        } catch (error) {
            console.error('Erreur paramètres app:', error)
        }
    }

    // ============================================
    // ACTIONS PROFIL
    // ============================================
    const updateProfile = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            await axios.put(`${API_URL}/api/user/profile`, {
                fullname: profileData.fullname,
                email: profileData.email,
                province: profileData.province,
                city: profileData.city,
                address: profileData.address
            }, getAuthHeaders())

            toast.success('✅ Profil mis à jour')

            const savedUser = JSON.parse(localStorage.getItem('user') || '{}')
            savedUser.fullname = profileData.fullname
            localStorage.setItem('user', JSON.stringify(savedUser))
        } catch (error) {
            console.error('Erreur:', error)
            toast.error(error.response?.data?.error || 'Erreur mise à jour')
        } finally {
            setLoading(false)
        }
    }

    const updatePassword = async (e) => {
        e.preventDefault()

        if (securityData.newPassword !== securityData.confirmPassword) {
            toast.error('Les mots de passe ne correspondent pas')
            return
        }
        if (securityData.newPassword.length < 4) {
            toast.error('Minimum 4 caractères')
            return
        }

        setLoading(true)
        try {
            await axios.post(`${API_URL}/api/user/change-password`, {
                oldPassword: securityData.currentPassword,
                newPassword: securityData.newPassword
            }, getAuthHeaders())

            toast.success('✅ Mot de passe modifié')
            setSecurityData({ currentPassword: '', newPassword: '', confirmPassword: '' })
        } catch (error) {
            console.error('Erreur:', error)
            toast.error(error.response?.data?.error || 'Erreur changement mot de passe')
        } finally {
            setLoading(false)
        }
    }

    // ============================================
    // ACTIONS PIN
    // ============================================
    const handleCreatePin = async (e) => {
        e.preventDefault()
        setPinError('')
        setPinSuccess('')

        if (!/^\d{4}$/.test(transactionPin.newPin)) {
            setPinError('Le PIN doit contenir 4 chiffres')
            return
        }

        if (transactionPin.newPin !== transactionPin.confirmPin) {
            setPinError('Les PIN ne correspondent pas')
            return
        }

        setLoading(true)
        try {
            await axios.post(`${API_URL}/api/user/set-transaction-pin`, {
                pin: transactionPin.newPin
            }, getAuthHeaders())

            setPinSuccess('✅ PIN créé avec succès !')
            toast.success('PIN de transaction créé')
            setTimeout(() => {
                setShowPinModal(false)
                fetchTransactionPinStatus()
                setTransactionPin({ currentPin: '', newPin: '', confirmPin: '', isPinSet: true })
            }, 1500)
        } catch (error) {
            setPinError(error.response?.data?.error || 'Erreur création PIN')
        } finally {
            setLoading(false)
        }
    }

    const handleChangePin = async (e) => {
        e.preventDefault()
        setPinError('')
        setPinSuccess('')

        if (!/^\d{4}$/.test(transactionPin.currentPin)) {
            setPinError('PIN actuel invalide')
            return
        }
        if (!/^\d{4}$/.test(transactionPin.newPin)) {
            setPinError('Nouveau PIN invalide')
            return
        }
        if (transactionPin.newPin !== transactionPin.confirmPin) {
            setPinError('Les nouveaux PIN ne correspondent pas')
            return
        }

        setLoading(true)
        try {
            await axios.post(`${API_URL}/api/user/change-transaction-pin`, {
                currentPin: transactionPin.currentPin,
                newPin: transactionPin.newPin
            }, getAuthHeaders())

            setPinSuccess('✅ PIN modifié !')
            toast.success('PIN modifié')
            setTimeout(() => {
                setShowPinModal(false)
                setTransactionPin({ currentPin: '', newPin: '', confirmPin: '', isPinSet: true })
            }, 1500)
        } catch (error) {
            setPinError(error.response?.data?.error || 'Erreur modification PIN')
        } finally {
            setLoading(false)
        }
    }

    const handleResetPinRequest = async () => {
        if (!resetReason.trim()) {
            toast.error('Veuillez indiquer une raison')
            return
        }

        setLoading(true)
        try {
            await axios.post(`${API_URL}/api/user/request-pin-reset`, {
                reason: resetReason
            }, getAuthHeaders())

            setResetRequestSent(true)
            toast.success('📤 Demande envoyée. L\'admin vous contactera.')
            setShowResetModal(false)
            setResetReason('')
        } catch (error) {
            toast.error(error.response?.data?.error || 'Erreur demande')
        } finally {
            setLoading(false)
        }
    }

    // ============================================
    // ✅ ACTIONS PRÉFÉRENCES (ACTIVÉ)
    // ============================================
    const updatePreferences = async () => {
        setLoading(true)
        try {
            console.log('📤 Envoi préférences:', preferences)

            await axios.post(`${API_URL}/api/user/preferences`, preferences, getAuthHeaders())

            // Appliquer le thème immédiatement
            document.documentElement.classList.toggle('light', preferences.theme === 'light')
            localStorage.setItem('theme', preferences.theme)

            // Appliquer la langue
            localStorage.setItem('language', preferences.language)

            toast.success('✅ Préférences enregistrées')
        } catch (error) {
            console.error('❌ Erreur:', error)
            toast.error(error.response?.data?.error || 'Erreur enregistrement')
        } finally {
            setLoading(false)
        }
    }

    // ✅ Toggle générique pour les notifications
    const toggleNotification = (key) => {
        setPreferences(prev => ({
            ...prev,
            notifications: {
                ...prev.notifications,
                [key]: !prev.notifications[key]
            }
        }))
    }

    // ============================================
    // ACTIONS ADMIN
    // ============================================
    const updateAppSettings = async () => {
        setLoading(true)
        try {
            await axios.put(`${API_URL}/api/admin/settings`, appSettings, getAuthHeaders())
            toast.success('✅ Paramètres mis à jour')
        } catch (error) {
            toast.error('Erreur mise à jour')
        } finally {
            setLoading(false)
        }
    }

    const resetSettings = async () => {
        if (window.confirm('Réinitialiser tous les paramètres ?')) {
            setAppSettings({
                minTransaction: 25,
                maxTransaction: 10000000,
                transferFee: 2,
                depositFee: 0,
                withdrawalFee: 2,
                referralBonus: 500,
                maintenanceMode: false,
                allowInternationalTransfer: false
            })
            toast.success('Paramètres réinitialisés')
        }
    }

    // ============================================
    // QR CODE
    // ============================================
    const generateDynamicQR = async () => {
        const amountNum = parseInt(qrAmount)
        if (qrAmount && (isNaN(amountNum) || amountNum < 25)) {
            toast.error('Montant minimum: 25 FCFA')
            return
        }

        setGenerating(true)
        try {
            const params = new URLSearchParams()
            if (user?.phone) params.append('phone', user.phone)
            if (amountNum) params.append('amount', amountNum)
            if (qrDescription) params.append('description', qrDescription)

            const link = `${window.location.origin}/transfer?${params.toString()}`
            const qrApiUrl = `https://quickchart.io/qr?text=${encodeURIComponent(link)}&size=250&margin=2`

            setPaymentLink(link)
            setQrImageUrl(qrApiUrl)
            setQrGenerated(true)
            toast.success('✅ QR code généré')
        } catch (error) {
            toast.error('Erreur génération')
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

    const copyToClipboard = async (text) => {
        if (!text) return
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text)
            } else {
                const textarea = document.createElement('textarea')
                textarea.value = text
                textarea.style.position = 'fixed'
                textarea.style.top = '-9999px'
                document.body.appendChild(textarea)
                textarea.select()
                document.execCommand('copy')
                document.body.removeChild(textarea)
            }
            setCopied(true)
            toast.success('📋 Copié !')
            setTimeout(() => setCopied(false), 2000)
        } catch (error) {
            toast.error('Impossible de copier')
        }
    }

    const shareViaWhatsApp = () => {
        if (!paymentLink) return
        const message = `💰 *Demande de paiement AlkherPay*\n\nCliquez sur ce lien pour me payer :\n${paymentLink}`
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
    }

    const downloadQRCode = () => {
        if (qrImageUrl) {
            const link = document.createElement('a')
            link.download = `alkherpay-qr-${user?.phone}.png`
            link.href = qrImageUrl
            link.click()
            toast.success('📥 QR téléchargé')
        }
    }

    // ============================================
    // TABS
    // ============================================
    const tabs = [
        { id: 'profile', label: 'Profil', icon: FaUser },
        { id: 'security', label: 'Sécurité', icon: FaShieldAlt },
        { id: 'preferences', label: 'Préférences', icon: FaPalette },
        { id: 'notifications', label: 'Notifications', icon: FaBell },
        { id: 'qr', label: 'QR Code', icon: FaQrcode },
    ]

    if (user?.role === 'admin') {
        tabs.push(
            { id: 'app', label: 'Application', icon: FaGlobe },
            { id: 'fees', label: 'Frais & Limites', icon: FaPercent },
            { id: 'system', label: 'Système', icon: FaDatabase }
        )
    }

    if (!user) return null

    return (
        <Layout user={user}>
            <div className="card">
                <h2 className="text-2xl font-bold text-white mb-6">⚙️ Paramètres</h2>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 mb-6 border-b border-white/10 pb-4 overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
                                activeTab === tab.id
                                    ? 'bg-blue-600 text-white'
                                    : 'text-white/60 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            <tab.icon /> {tab.label}
                        </button>
                    ))}
                </div>

                {/* ============================================
                    TAB PROFIL
                ============================================ */}
                {activeTab === 'profile' && (
                    <form onSubmit={updateProfile} className="space-y-4 max-w-2xl">
                        <div>
                            <label className="label">Nom complet</label>
                            <input
                                type="text"
                                value={profileData.fullname}
                                onChange={(e) => setProfileData({ ...profileData, fullname: e.target.value })}
                                className="input-field"
                                required
                            />
                        </div>

                        <div>
                            <label className="label">Téléphone</label>
                            <input
                                type="tel"
                                value={profileData.phone}
                                className="input-field bg-white/5"
                                disabled
                            />
                            <p className="text-white/40 text-xs mt-1">Non modifiable</p>
                        </div>

                        <div>
                            <label className="label">Email</label>
                            <input
                                type="email"
                                value={profileData.email}
                                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                                className="input-field"
                                placeholder="votre@email.com"
                            />
                        </div>

                        <div>
                            <label className="label">Province</label>
                            <select
                                value={profileData.province}
                                onChange={(e) => setProfileData({ ...profileData, province: e.target.value })}
                                className="input-field"
                            >
                                <option value="">Sélectionnez</option>
                                {provinces.map(p => (
                                    <option key={p.id} value={p.name}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="label">Ville</label>
                            <input
                                type="text"
                                value={profileData.city}
                                onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                                className="input-field"
                            />
                        </div>

                        <div>
                            <label className="label">Adresse</label>
                            <textarea
                                value={profileData.address}
                                onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                                className="input-field"
                                rows="2"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary flex items-center gap-2 disabled:opacity-50"
                        >
                            {loading ? <><FaSpinner className="animate-spin" /> Enregistrement...</> : 'Enregistrer'}
                        </button>
                    </form>
                )}

                {/* ============================================
                    TAB SÉCURITÉ
                ============================================ */}
                {activeTab === 'security' && (
                    <div className="space-y-6 max-w-2xl">
                        {/* Mot de passe */}
                        <form onSubmit={updatePassword} className="space-y-4">
                            <h3 className="text-white text-lg font-semibold">Changer le mot de passe</h3>
                            <div>
                                <label className="label">Mot de passe actuel</label>
                                <input
                                    type="password"
                                    value={securityData.currentPassword}
                                    onChange={(e) => setSecurityData({ ...securityData, currentPassword: e.target.value })}
                                    className="input-field"
                                    required
                                />
                            </div>
                            <div>
                                <label className="label">Nouveau mot de passe</label>
                                <input
                                    type="password"
                                    value={securityData.newPassword}
                                    onChange={(e) => setSecurityData({ ...securityData, newPassword: e.target.value })}
                                    className="input-field"
                                    required
                                />
                            </div>
                            <div>
                                <label className="label">Confirmer</label>
                                <input
                                    type="password"
                                    value={securityData.confirmPassword}
                                    onChange={(e) => setSecurityData({ ...securityData, confirmPassword: e.target.value })}
                                    className="input-field"
                                    required
                                />
                            </div>
                            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                                {loading ? <FaSpinner className="animate-spin" /> : 'Changer le mot de passe'}
                            </button>
                        </form>

                        {/* 2FA */}
                        <div className="border-t border-white/10 pt-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-white text-lg font-semibold">2FA</h3>
                                <Link to="/settings/2fa" className="text-blue-400 text-sm hover:text-blue-300 flex items-center gap-1">
                                    Configurer <FaChevronRight size={12} />
                                </Link>
                            </div>
                            <div className={`rounded-xl p-4 ${twoFactorEnabled ? 'bg-green-500/10 border border-green-500/30' : 'bg-yellow-500/10 border border-yellow-500/30'}`}>
                                <div className="flex items-center gap-3">
                                    <FaShieldAlt className={`text-xl ${twoFactorEnabled ? 'text-green-400' : 'text-yellow-400'}`} />
                                    <div>
                                        <p className="text-white font-medium">
                                            {twoFactorEnabled ? '2FA activée' : '2FA désactivée'}
                                        </p>
                                        <p className="text-white/50 text-xs">
                                            {twoFactorEnabled ? 'Compte protégé' : 'Activez la 2FA pour plus de sécurité'}
                                        </p>
                                    </div>
                                    {twoFactorEnabled && <FaCheckCircle className="text-green-400 ml-auto" />}
                                </div>
                            </div>
                        </div>

                        {/* PIN */}
                        <div className="border-t border-white/10 pt-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-white text-lg font-semibold">PIN de transaction</h3>
                                {transactionPin.isPinSet ? (
                                    <button
                                        onClick={() => {
                                            setPinMode('change')
                                            setShowPinModal(true)
                                            setPinError('')
                                            setPinSuccess('')
                                            setTransactionPin({ currentPin: '', newPin: '', confirmPin: '', isPinSet: true })
                                        }}
                                        className="text-blue-400 text-sm hover:text-blue-300"
                                    >
                                        Modifier
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            setPinMode('create')
                                            setShowPinModal(true)
                                            setPinError('')
                                            setPinSuccess('')
                                        }}
                                        className="text-blue-400 text-sm hover:text-blue-300"
                                    >
                                        Créer un PIN
                                    </button>
                                )}
                            </div>

                            <div className="bg-white/5 rounded-xl p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <FaLock className="text-blue-400" />
                                        <div>
                                            <p className="text-white font-medium">PIN de transaction</p>
                                            <p className="text-white/40 text-xs">
                                                {transactionPin.isPinSet ? '✓ Activé' : 'Non défini'}
                                            </p>
                                        </div>
                                    </div>
                                    {transactionPin.isPinSet ? (
                                        <FaCheckCircle className="text-green-400 text-xl" />
                                    ) : (
                                        <FaExclamationTriangle className="text-yellow-400 text-xl" />
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={() => setShowResetModal(true)}
                                className="mt-3 text-yellow-400 text-sm hover:text-yellow-300 flex items-center gap-2"
                            >
                                <FaLockOpen size={14} /> PIN oublié ?
                            </button>
                        </div>
                    </div>
                )}

                {/* ============================================
                    TAB PRÉFÉRENCES (ACTIVÉ)
                ============================================ */}
                {activeTab === 'preferences' && (
                    <div className="space-y-6 max-w-2xl">
                        {/* Langue */}
                        <div>
                            <label className="label flex items-center gap-2">
                                <FaLanguage className="text-blue-400" /> Langue
                            </label>
                            <select
                                value={preferences.language}
                                onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                                className="input-field"
                            >
                                <option value="fr">🇫🇷 Français</option>
                                <option value="en">🇬🇧 English</option>
                                <option value="ar">🇹🇩 العربية</option>
                            </select>
                        </div>

                        {/* Thème */}
                        <div>
                            <label className="label flex items-center gap-2">
                                <FaPalette className="text-blue-400" /> Thème
                            </label>
                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setPreferences({ ...preferences, theme: 'dark' })}
                                    className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                                        preferences.theme === 'dark'
                                            ? 'border-blue-500 bg-blue-500/20'
                                            : 'border-white/20 bg-white/5'
                                    }`}
                                >
                                    <FaMoon className="mx-auto text-2xl mb-2" />
                                    <p className="text-white">Sombre</p>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPreferences({ ...preferences, theme: 'light' })}
                                    className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                                        preferences.theme === 'light'
                                            ? 'border-blue-500 bg-blue-500/20'
                                            : 'border-white/20 bg-white/5'
                                    }`}
                                >
                                    <FaSun className="mx-auto text-2xl mb-2" />
                                    <p className="text-white">Clair</p>
                                </button>
                            </div>
                        </div>

                        {/* Actions rapides */}
                        <div>
                            <label className="label">Actions rapides</label>
                            <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                                <div>
                                    <p className="text-white">Afficher les actions rapides</p>
                                    <p className="text-white/40 text-sm">Transfert rapide, QR sur dashboard</p>
                                </div>
                                <button
                                    onClick={() => setPreferences({ ...preferences, quickActions: !preferences.quickActions })}
                                    className={`w-12 h-6 rounded-full transition-all ${
                                        preferences.quickActions ? 'bg-blue-500' : 'bg-white/20'
                                    }`}
                                >
                                    <div className={`w-5 h-5 rounded-full bg-white transition-all ${
                                        preferences.quickActions ? 'translate-x-6' : 'translate-x-1'
                                    }`} />
                                </button>
                            </div>
                        </div>

                        {/* Biometric */}
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                            <div className="flex items-center gap-3">
                                <FaFingerprint className="text-blue-400" />
                                <div>
                                    <p className="text-white">Biométrie</p>
                                    <p className="text-white/40 text-sm">Empreinte / Face ID</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setPreferences({ ...preferences, biometric: !preferences.biometric })}
                                className={`w-12 h-6 rounded-full transition-all ${
                                    preferences.biometric ? 'bg-blue-500' : 'bg-white/20'
                                }`}
                            >
                                <div className={`w-5 h-5 rounded-full bg-white transition-all ${
                                    preferences.biometric ? 'translate-x-6' : 'translate-x-1'
                                }`} />
                            </button>
                        </div>

                        {/* Message par défaut */}
                        <div>
                            <label className="label">Message par défaut</label>
                            <textarea
                                value={preferences.defaultTransferMessage}
                                onChange={(e) => setPreferences({ ...preferences, defaultTransferMessage: e.target.value })}
                                className="input-field"
                                rows="2"
                                placeholder="Ex: Merci pour votre paiement"
                            />
                        </div>

                        <button
                            onClick={updatePreferences}
                            disabled={loading}
                            className="btn-primary flex items-center gap-2 disabled:opacity-50"
                        >
                            {loading ? <FaSpinner className="animate-spin" /> : <FaSave />}
                            Enregistrer les préférences
                        </button>
                    </div>
                )}

                {/* ============================================
                    TAB NOTIFICATIONS (ACTIVÉ)
                ============================================ */}
                {activeTab === 'notifications' && (
                    <div className="space-y-4 max-w-2xl">
                        <h3 className="text-white text-lg font-semibold mb-4">Canaux de notification</h3>

                        {/* Email */}
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                            <div className="flex items-center gap-3">
                                <FaEnvelope className="text-blue-400 text-xl" />
                                <div>
                                    <p className="text-white font-medium">Notifications par email</p>
                                    <p className="text-white/40 text-sm">Recevez des alertes par email</p>
                                </div>
                            </div>
                            <button
                                onClick={() => toggleNotification('email')}
                                className={`w-12 h-6 rounded-full transition-all ${
                                    preferences.notifications.email ? 'bg-blue-500' : 'bg-white/20'
                                }`}
                            >
                                <div className={`w-5 h-5 rounded-full bg-white transition-all ${
                                    preferences.notifications.email ? 'translate-x-6' : 'translate-x-1'
                                }`} />
                            </button>
                        </div>

                        {/* SMS */}
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                            <div className="flex items-center gap-3">
                                <FaSms className="text-blue-400 text-xl" />
                                <div>
                                    <p className="text-white font-medium">Notifications par SMS</p>
                                    <p className="text-white/40 text-sm">Recevez des alertes par SMS</p>
                                </div>
                            </div>
                            <button
                                onClick={() => toggleNotification('sms')}
                                className={`w-12 h-6 rounded-full transition-all ${
                                    preferences.notifications.sms ? 'bg-blue-500' : 'bg-white/20'
                                }`}
                            >
                                <div className={`w-5 h-5 rounded-full bg-white transition-all ${
                                    preferences.notifications.sms ? 'translate-x-6' : 'translate-x-1'
                                }`} />
                            </button>
                        </div>

                        {/* Push */}
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                            <div className="flex items-center gap-3">
                                <FaBell className="text-blue-400 text-xl" />
                                <div>
                                    <p className="text-white font-medium">Notifications push</p>
                                    <p className="text-white/40 text-sm">Notifications dans l'app</p>
                                </div>
                            </div>
                            <button
                                onClick={() => toggleNotification('push')}
                                className={`w-12 h-6 rounded-full transition-all ${
                                    preferences.notifications.push ? 'bg-blue-500' : 'bg-white/20'
                                }`}
                            >
                                <div className={`w-5 h-5 rounded-full bg-white transition-all ${
                                    preferences.notifications.push ? 'translate-x-6' : 'translate-x-1'
                                }`} />
                            </button>
                        </div>

                        {/* Types de notifications */}
                        <div className="border-t border-white/10 pt-6 mt-6">
                            <h3 className="text-white font-semibold mb-4">Types de notifications</h3>

                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl mb-3">
                                <div>
                                    <p className="text-white font-medium">Transactions</p>
                                    <p className="text-white/40 text-sm">Envoi / réception d'argent</p>
                                </div>
                                <button
                                    onClick={() => toggleNotification('transaction')}
                                    className={`w-12 h-6 rounded-full transition-all ${
                                        preferences.notifications.transaction ? 'bg-blue-500' : 'bg-white/20'
                                    }`}
                                >
                                    <div className={`w-5 h-5 rounded-full bg-white transition-all ${
                                        preferences.notifications.transaction ? 'translate-x-6' : 'translate-x-1'
                                    }`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                                <div>
                                    <p className="text-white font-medium">Promotions</p>
                                    <p className="text-white/40 text-sm">Offres et actualités</p>
                                </div>
                                <button
                                    onClick={() => toggleNotification('promo')}
                                    className={`w-12 h-6 rounded-full transition-all ${
                                        preferences.notifications.promo ? 'bg-blue-500' : 'bg-white/20'
                                    }`}
                                >
                                    <div className={`w-5 h-5 rounded-full bg-white transition-all ${
                                        preferences.notifications.promo ? 'translate-x-6' : 'translate-x-1'
                                    }`} />
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={updatePreferences}
                            disabled={loading}
                            className="btn-primary flex items-center gap-2 disabled:opacity-50 mt-6"
                        >
                            {loading ? <FaSpinner className="animate-spin" /> : <FaSave />}
                            Enregistrer les préférences
                        </button>
                    </div>
                )}

                {/* ============================================
                    TAB QR CODE
                ============================================ */}
                {activeTab === 'qr' && (
                    <div className="space-y-6 max-w-2xl">
                        {!qrGenerated ? (
                            <div className="space-y-4">
                                <div className="text-center mb-4">
                                    <div className="w-20 h-20 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center mb-3">
                                        <FaQrcode className="text-blue-400 text-3xl" />
                                    </div>
                                    <p className="text-white/60 text-sm">Générez un QR code pour recevoir un paiement</p>
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
                                    <p className="text-white/40 text-xs mt-1">Minimum: 25 FCFA</p>
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
                                    {generating ? <><FaSpinner className="animate-spin" /> Génération...</> : 'Générer mon QR code'}
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

                                <div className="p-3 rounded-xl bg-white/5">
                                    <div className="flex justify-between text-sm">
                                        <span>Numéro</span>
                                        <span className="font-mono font-bold">{user?.phone}</span>
                                    </div>
                                    {qrAmount && (
                                        <div className="flex justify-between text-sm mt-2">
                                            <span>Montant</span>
                                            <span className="text-green-400 font-bold">{parseInt(qrAmount).toLocaleString()} FCFA</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <button onClick={downloadQRCode} className="flex-1 btn-secondary text-sm flex items-center justify-center gap-2">
                                        <FaDownload /> Télécharger
                                    </button>
                                    <button onClick={shareViaWhatsApp} className="flex-1 bg-[#25d366]/20 hover:bg-[#25d366]/30 text-white text-sm py-2 rounded-lg flex items-center justify-center gap-2">
                                        <FaWhatsapp /> WhatsApp
                                    </button>
                                </div>

                                <button
                                    onClick={() => copyToClipboard(paymentLink)}
                                    className="w-full btn-secondary text-sm flex items-center justify-center gap-2"
                                >
                                    <FaCopy /> Copier le lien
                                </button>

                                <button
                                    onClick={resetQRGenerator}
                                    className="w-full text-sm text-white/40 hover:text-white/60"
                                >
                                    Générer un nouveau QR code
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ============================================
                    TAB APPLICATION (Admin)
                ============================================ */}
                {activeTab === 'app' && user?.role === 'admin' && (
                    <div className="space-y-6 max-w-2xl">
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                            <div>
                                <p className="text-white font-medium">Mode maintenance</p>
                                <p className="text-white/40 text-sm">Désactiver temporairement l'app</p>
                            </div>
                            <button
                                onClick={() => setAppSettings({ ...appSettings, maintenanceMode: !appSettings.maintenanceMode })}
                                className={`w-12 h-6 rounded-full transition-all ${
                                    appSettings.maintenanceMode ? 'bg-red-500' : 'bg-white/20'
                                }`}
                            >
                                <div className={`w-5 h-5 rounded-full bg-white transition-all ${
                                    appSettings.maintenanceMode ? 'translate-x-6' : 'translate-x-1'
                                }`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                            <div>
                                <p className="text-white font-medium">Transferts internationaux</p>
                                <p className="text-white/40 text-sm">Autoriser les transferts vers l'étranger</p>
                            </div>
                            <button
                                onClick={() => setAppSettings({ ...appSettings, allowInternationalTransfer: !appSettings.allowInternationalTransfer })}
                                className={`w-12 h-6 rounded-full transition-all ${
                                    appSettings.allowInternationalTransfer ? 'bg-blue-500' : 'bg-white/20'
                                }`}
                            >
                                <div className={`w-5 h-5 rounded-full bg-white transition-all ${
                                    appSettings.allowInternationalTransfer ? 'translate-x-6' : 'translate-x-1'
                                }`} />
                            </button>
                        </div>

                        <div>
                            <label className="label">Bonus de parrainage (FCFA)</label>
                            <input
                                type="number"
                                value={appSettings.referralBonus}
                                onChange={(e) => setAppSettings({ ...appSettings, referralBonus: parseInt(e.target.value) })}
                                className="input-field"
                            />
                        </div>

                        <div className="flex gap-4">
                            <button onClick={updateAppSettings} disabled={loading} className="btn-primary flex items-center gap-2">
                                {loading ? <FaSpinner className="animate-spin" /> : <FaSave />} Sauvegarder
                            </button>
                            <button onClick={resetSettings} className="btn-secondary flex items-center gap-2">
                                <FaUndo /> Réinitialiser
                            </button>
                        </div>
                    </div>
                )}

                {/* ============================================
                    TAB FRAIS (Admin)
                ============================================ */}
                {activeTab === 'fees' && user?.role === 'admin' && (
                    <div className="space-y-6 max-w-2xl">
                        <div>
                            <label className="label">Montant minimum (FCFA)</label>
                            <input
                                type="number"
                                value={appSettings.minTransaction}
                                onChange={(e) => setAppSettings({ ...appSettings, minTransaction: parseInt(e.target.value) })}
                                className="input-field"
                            />
                        </div>

                        <div>
                            <label className="label">Montant maximum (FCFA)</label>
                            <input
                                type="number"
                                value={appSettings.maxTransaction}
                                onChange={(e) => setAppSettings({ ...appSettings, maxTransaction: parseInt(e.target.value) })}
                                className="input-field"
                            />
                        </div>

                        <div>
                            <label className="label">Frais de transfert (%)</label>
                            <input
                                type="number"
                                value={appSettings.transferFee}
                                onChange={(e) => setAppSettings({ ...appSettings, transferFee: parseInt(e.target.value) })}
                                className="input-field"
                                step="0.5"
                            />
                        </div>

                        <div>
                            <label className="label">Frais de retrait (%)</label>
                            <input
                                type="number"
                                value={appSettings.withdrawalFee}
                                onChange={(e) => setAppSettings({ ...appSettings, withdrawalFee: parseInt(e.target.value) })}
                                className="input-field"
                                step="0.5"
                            />
                        </div>

                        <div className="bg-yellow-500/10 rounded-xl p-4 border border-yellow-500/30">
                            <p className="text-yellow-400 text-sm">
                                ⚠️ Les frais s'appliquent aux nouvelles transactions uniquement.
                            </p>
                        </div>

                        <button onClick={updateAppSettings} disabled={loading} className="btn-primary flex items-center gap-2">
                            {loading ? <FaSpinner className="animate-spin" /> : <FaSave />} Sauvegarder
                        </button>
                    </div>
                )}

                {/* ============================================
                    TAB SYSTÈME (Admin)
                ============================================ */}
                {activeTab === 'system' && user?.role === 'admin' && (
                    <div className="space-y-6 max-w-2xl">
                        <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/30">
                            <h3 className="text-green-400 font-semibold mb-2 flex items-center gap-2">
                                <FaCheckCircle /> Système opérationnel
                            </h3>
                            <p className="text-white/70 text-sm">Tous les services actifs</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/5 rounded-xl p-4">
                                <p className="text-white/40 text-sm">Version API</p>
                                <p className="text-white text-xl font-bold">v1.0.0</p>
                            </div>
                            <div className="bg-white/5 rounded-xl p-4">
                                <p className="text-white/40 text-sm">Version App</p>
                                <p className="text-white text-xl font-bold">v1.0.0</p>
                            </div>
                        </div>

                        <div className="bg-white/5 rounded-xl p-4">
                            <p className="text-white/40 text-sm mb-2">Cache</p>
                            <button className="text-blue-400 text-sm hover:text-blue-300">Vider le cache</button>
                        </div>

                        <div className="bg-white/5 rounded-xl p-4">
                            <p className="text-white/40 text-sm mb-2">Logs</p>
                            <button className="text-blue-400 text-sm hover:text-blue-300">Exporter les logs</button>
                        </div>
                    </div>
                )}
            </div>

            {/* ============================================
                MODAL PIN
            ============================================ */}
            {showPinModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
                    <div className="relative max-w-md w-full bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl shadow-2xl">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white">
                                {pinMode === 'create' ? 'Créer un PIN' : 'Modifier le PIN'}
                            </h3>
                            <button onClick={() => setShowPinModal(false)} className="text-white/60 hover:text-white text-2xl">
                                ✕
                            </button>
                        </div>

                        <div className="p-6">
                            {pinSuccess && (
                                <div className="bg-green-500/20 rounded-xl p-3 mb-4 flex items-center gap-2">
                                    <FaCheckCircle className="text-green-400" />
                                    <p className="text-green-400 text-sm">{pinSuccess}</p>
                                </div>
                            )}

                            {pinError && (
                                <div className="bg-red-500/20 rounded-xl p-3 mb-4 flex items-center gap-2">
                                    <FaExclamationTriangle className="text-red-400" />
                                    <p className="text-red-400 text-sm">{pinError}</p>
                                </div>
                            )}

                            <form onSubmit={pinMode === 'create' ? handleCreatePin : handleChangePin} className="space-y-4">
                                {pinMode === 'change' && (
                                    <div>
                                        <label className="label">PIN actuel</label>
                                        <input
                                            type="password"
                                            maxLength={4}
                                            value={transactionPin.currentPin}
                                            onChange={(e) => setTransactionPin({ ...transactionPin, currentPin: e.target.value.replace(/\D/g, '') })}
                                            className="input-field text-center text-2xl tracking-widest"
                                            placeholder="••••"
                                            required
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="label">Nouveau PIN</label>
                                    <input
                                        type="password"
                                        maxLength={4}
                                        value={transactionPin.newPin}
                                        onChange={(e) => setTransactionPin({ ...transactionPin, newPin: e.target.value.replace(/\D/g, '') })}
                                        className="input-field text-center text-2xl tracking-widest"
                                        placeholder="••••"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="label">Confirmer le PIN</label>
                                    <input
                                        type="password"
                                        maxLength={4}
                                        value={transactionPin.confirmPin}
                                        onChange={(e) => setTransactionPin({ ...transactionPin, confirmPin: e.target.value.replace(/\D/g, '') })}
                                        className="input-field text-center text-2xl tracking-widest"
                                        placeholder="••••"
                                        required
                                    />
                                </div>

                                <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                                    {loading ? <FaSpinner className="animate-spin" /> : null}
                                    {pinMode === 'create' ? 'Créer le PIN' : 'Modifier le PIN'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================
                MODAL RESET PIN
            ============================================ */}
            {showResetModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
                    <div className="relative max-w-md w-full bg-gradient-to-br from-yellow-900 to-yellow-800 rounded-2xl shadow-2xl">
                        <div className="p-4 border-b border-white/10 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <FaLockOpen className="text-yellow-400" /> Réinitialiser le PIN
                            </h3>
                            <button onClick={() => setShowResetModal(false)} className="text-white/60 hover:text-white text-2xl">
                                ✕
                            </button>
                        </div>

                        <div className="p-6">
                            <p className="text-white/80 text-sm mb-4">
                                PIN oublié ? Envoyez une demande à l'administrateur.
                            </p>

                            <div className="bg-yellow-500/20 rounded-xl p-3 mb-4">
                                <p className="text-yellow-300 text-xs flex items-center gap-2">
                                    <FaClock size={12} /> Traitement sous quelques minutes
                                </p>
                            </div>

                            <textarea
                                value={resetReason}
                                onChange={(e) => setResetReason(e.target.value)}
                                className="input-field w-full mb-4"
                                rows="3"
                                placeholder="Raison (optionnel)..."
                            />

                            <div className="flex gap-3">
                                <button onClick={() => setShowResetModal(false)} className="flex-1 btn-secondary">
                                    Annuler
                                </button>
                                <button
                                    onClick={handleResetPinRequest}
                                    disabled={loading}
                                    className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-2 rounded-lg font-semibold"
                                >
                                    {loading ? <FaSpinner className="animate-spin mx-auto" /> : 'Envoyer'}
                                </button>
                            </div>

                            {resetRequestSent && (
                                <div className="mt-4 bg-green-500/20 rounded-xl p-3">
                                    <p className="text-green-400 text-sm text-center">
                                        ✓ Demande envoyée
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    )
}

export default Settings