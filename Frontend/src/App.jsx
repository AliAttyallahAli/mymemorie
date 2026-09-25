// src/App.jsx - Version optimisée avec lazy loading
import React, { useState, useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import axios from 'axios'
import { Toaster } from 'react-hot-toast'
import { toast } from './utils/toast'
import ErrorBoundary from './components/ErrorBoundary'
import PrivateRoute from './components/PrivateRoute'

// ============================================
// PAGES PUBLIQUES (import direct - chargement immédiat)
// ============================================
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'

// ============================================
// PAGES PROTÉGÉES (lazy loading - chargement à la demande)
// ============================================

// Dashboard & core
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Transfer = lazy(() => import('./pages/Transfer'))
const History = lazy(() => import('./pages/History'))
const Profile = lazy(() => import('./pages/Profile'))
const Settings = lazy(() => import('./pages/Settings'))
const Chat = lazy(() => import('./pages/Chat'))

// Admin
const AdminPanel = lazy(() => import('./pages/AdminPanel'))
const CreateAgent = lazy(() => import('./pages/CreateAgent'))
const AdminLoans = lazy(() => import('./pages/AdminLoans'))
const AdminTaxes = lazy(() => import('./pages/AdminTaxes'))
const AdminSavings = lazy(() => import('./pages/AdminSavings'))
const AdminCards = lazy(() => import('./pages/AdminCards'))
const AdminBillCompanies = lazy(() => import('./pages/AdminBillCompanies'))
const KYCDetail = lazy(() => import('./pages/KYCDetail'))
const AgentApplicationDetail = lazy(() => import('./pages/AgentApplicationDetail'))

// Pages publiques secondaires
const Announcements = lazy(() => import('./pages/Announcements'))
const Terms = lazy(() => import('./pages/Terms'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Contact = lazy(() => import('./pages/Contact'))
const Features = lazy(() => import('./pages/Features'))
const Fees = lazy(() => import('./pages/Fees'))
const BecomeAgent = lazy(() => import('./pages/BecomeAgent'))
const FAQ = lazy(() => import('./pages/FAQ'))
const Blog = lazy(() => import('./pages/Blog'))
const BlogPost = lazy(() => import('./pages/BlogPost'))
const Agents = lazy(() => import('./pages/Agents'))
const Licenses = lazy(() => import('./pages/Licenses'))

// Services financiers
const LoanRequest = lazy(() => import('./pages/LoanRequest'))
const Investments = lazy(() => import('./pages/Investments'))
const InvestmentDetail = lazy(() => import('./pages/InvestmentDetail'))
const Deposit = lazy(() => import('./pages/Deposit'))
const Withdraw = lazy(() => import('./pages/Withdraw'))
const Savings = lazy(() => import('./pages/Savings'))

// Cartes virtuelles
const VirtualCard = lazy(() => import('./pages/VirtualCard'))
const CardPayment = lazy(() => import('./pages/CardPayment'))

// Taxes & Impôts
const TaxPayment = lazy(() => import('./pages/TaxPayment'))
const TaxManagement = lazy(() => import('./pages/TaxManagement'))

// Entreprises
const MyCompany = lazy(() => import('./pages/MyCompany'))
const CompanyDashboard = lazy(() => import('./pages/CompanyDashboard'))

// Services divers
const BillPayment = lazy(() => import('./pages/BillPayment'))
const BusBooking = lazy(() => import('./pages/BusBooking'))
const AgencyManagement = lazy(() => import('./pages/AgencyManagement'))

// KYC & Sécurité
const KYCLevel2 = lazy(() => import('./pages/KYCLevel2'))
const TwoFactorAuth = lazy(() => import('./pages/TwoFactorAuth'))
const NotificationDetail = lazy(() => import('./pages/NotificationDetail'))

// ============================================
// CONFIG SOCKET
// ============================================
const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
let socket = null

// ============================================
// COMPOSANT LOADING
// ============================================
function PageLoader() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
            <div className="text-center">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-white text-lg font-medium">Chargement...</p>
            </div>
        </div>
    )
}

// ============================================
// APP
// ============================================
function App() {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        checkAuth()
    }, [])

    const checkAuth = async () => {
        setLoading(true)

        try {
            const token = localStorage.getItem('accessToken')
            const savedUser = localStorage.getItem('user')

            if (token && savedUser) {
                const userData = JSON.parse(savedUser)

                try {
                    const response = await axios.get('/api/auth/verify', {
                        headers: { Authorization: `Bearer ${token}` }
                    })

                    if (response.data.valid) {
                        setUser(userData)
                        initSocket(token)
                    } else {
                        handleLogout()
                    }
                } catch (error) {
                    console.error('Erreur vérification token:', error)
                    setUser(userData)
                    initSocket(token)
                }
            }
        } catch (error) {
            console.error('Erreur lors de la vérification:', error)
            handleLogout()
        } finally {
            setLoading(false)
        }
    }

    const initSocket = (token) => {
        if (socket && socket.connected) {
            socket.disconnect()
        }

        socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 10000,
            auth: { token }
        })

        socket.on('connect', () => {
            console.log('✅ Socket connecté')
            socket.emit('authenticate', token)
        })

        socket.on('connect_error', (error) => {
            console.error('❌ Socket error:', error.message)
        })

        socket.on('disconnect', (reason) => {
            console.log('🔌 Socket déconnecté:', reason)
        })

        socket.on('reconnect', (attemptNumber) => {
            console.log(`🔄 Socket reconnecté après ${attemptNumber} tentatives`)
            socket.emit('authenticate', token)
        })

        socket.on('notification', (notification) => {
            console.log('📢 Notification reçue:', notification)

            if (notification.type === 'security') {
                toast.security(notification.message || notification.title, {
                    icon: '🔑',
                    duration: 10000
                })
            } else if (notification.type === 'success') {
                toast.success(notification.message || notification.title)
            } else if (notification.type === 'error') {
                toast.error(notification.message || notification.title)
            } else {
                toast.info(notification.message || notification.title)
            }
        })
    }

    const handleLogout = () => {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        setUser(null)
        if (socket && socket.connected) {
            socket.disconnect()
        }
        toast.success('Déconnecté avec succès')
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                    <p className="text-white">Chargement...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen">
            <Toaster position="top-right" />
            <ErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                    <Routes>
                        {/* ============================================ */}
                        {/* ROUTES PUBLIQUES */}
                        {/* ============================================ */}
                        <Route path="/" element={<Home />} />
                        <Route path="/home" element={<Home />} />
                        <Route path="/login" element={<Login setUser={setUser} />} />
                        <Route path="/register" element={<Register />} />

                        <Route path="/features" element={<Features user={user} />} />
                        <Route path="/fees" element={<Fees user={user} />} />
                        <Route path="/become-agent" element={<BecomeAgent user={user} />} />
                        <Route path="/faq" element={<FAQ user={user} />} />
                        <Route path="/blog" element={<Blog user={user} />} />
                        <Route path="/blog/:slug" element={<BlogPost user={user} />} />
                        <Route path="/agents" element={<Agents user={user} />} />
                        <Route path="/licenses" element={<Licenses user={user} />} />
                        <Route path="/terms" element={<Terms user={user} />} />
                        <Route path="/privacy" element={<Privacy user={user} />} />
                        <Route path="/contact" element={<Contact user={user} />} />

                        {/* ============================================ */}
                        {/* ROUTES PROTÉGÉES */}
                        {/* ============================================ */}
                        <Route element={<PrivateRoute user={user} />}>
                            <Route path="/dashboard" element={<Dashboard user={user} socket={socket} />} />
                            <Route path="/transfer" element={<Transfer user={user} socket={socket} />} />
                            <Route path="/history" element={<History user={user} />} />
                            <Route path="/profile" element={<Profile user={user} />} />
                            <Route path="/settings" element={<Settings user={user} />} />
                            <Route path="/settings/2fa" element={<TwoFactorAuth user={user} />} />
                            <Route path="/chat" element={<Chat user={user} socket={socket} />} />
                            <Route path="/chat/:conversationId" element={<Chat user={user} socket={socket} />} />
                            <Route path="/notifications/:id" element={<NotificationDetail user={user} />} />

                            {/* Services financiers */}
                            <Route path="/deposit" element={<Deposit user={user} socket={socket} />} />
                            <Route path="/withdraw" element={<Withdraw user={user} socket={socket} />} />
                            <Route path="/savings" element={<Savings user={user} socket={socket} />} />
                            <Route path="/loans" element={<LoanRequest user={user} socket={socket} />} />
                            <Route path="/investments" element={<Investments user={user} socket={socket} />} />
                            <Route path="/investment/:id" element={<InvestmentDetail user={user} socket={socket} />} />

                            {/* Cartes virtuelles */}
                            <Route path="/virtual-card" element={<VirtualCard user={user} />} />
                            <Route path="/card-payment" element={<CardPayment user={user} />} />

                            {/* Taxes & Impôts */}
                            <Route path="/tax-payment" element={<TaxPayment user={user} />} />
                            <Route path="/tax-management" element={<TaxManagement />} />

                            {/* Entreprises */}
                            <Route path="/my-company" element={<MyCompany user={user} socket={socket} />} />
                            <Route path="/company/dashboard" element={<CompanyDashboard user={user} />} />

                            {/* Services divers */}
                            <Route path="/bill-payment" element={<BillPayment user={user} />} />
                            <Route path="/bus-booking" element={<BusBooking user={user} socket={socket} />} />
                            <Route path="/agency-management" element={<AgencyManagement user={user} socket={socket} />} />
                            <Route path="/announcements" element={<Announcements />} />

                            {/* KYC */}
                            <Route path="/kyc-level-2" element={<KYCLevel2 user={user} socket={socket} />} />

                            {/* Admin */}
                            <Route path="/admin" element={<AdminPanel user={user} socket={socket} />} />
                            <Route path="/admin/taxes" element={<AdminTaxes user={user} />} />
                            <Route path="/admin/loans" element={<AdminLoans user={user} socket={socket} />} />
                            <Route path="/admin/savings" element={<AdminSavings user={user} socket={socket} />} />
                            <Route path="/admin/cards" element={<AdminCards user={user} />} />
                            <Route path="/admin/bill-companies" element={<AdminBillCompanies user={user} />} />
                            <Route path="/admin/create-agent" element={<CreateAgent user={user} />} />
                            <Route path="/admin/agent-applications/:id" element={<AgentApplicationDetail user={user} />} />
                            <Route path="/admin/kyc/:id" element={<KYCDetail user={user} />} />
                        </Route>

                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Suspense>
            </ErrorBoundary>
        </div>
    )
}

export default App