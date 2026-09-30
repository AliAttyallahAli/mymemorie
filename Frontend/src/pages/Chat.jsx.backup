// src/pages/Chat.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';
import {
    FaArrowLeft, FaSearch, FaUserPlus, FaPaperPlane, FaTimes,
    FaPhone, FaCheck, FaCheckDouble, FaClock, FaSpinner,
    FaWhatsapp, FaTelegram, FaFacebook, FaSms, FaShare,
    FaUserCircle, FaComments, FaPlus, FaTrash, FaEllipsisV,
    FaSmile, FaImage, FaPaperclip, FaInfoCircle, FaCopy,
    FaAddressBook, FaStar, FaHistory, FaUserFriends, FaBell,
    FaPhoneSlash, FaMicrophone, FaMicrophoneSlash, FaVolumeUp,
    FaVolumeMute, FaPhoneAlt, FaBackspace, FaUser, FaCheckCircle,
    FaPhoneVolume, FaSignal,
} from 'react-icons/fa';

const Chat = ({ user, socket }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [conversations, setConversations] = useState([]);
    const [messages, setMessages] = useState([]);
    const [selectedContact, setSelectedContact] = useState(null);
    const [newMessage, setNewMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showNewChatModal, setShowNewChatModal] = useState(false);
    const [showUnknownUserModal, setShowUnknownUserModal] = useState(false);
    const [showDialpad, setShowDialpad] = useState(false);
    const [unknownNumber, setUnknownNumber] = useState('');
    const [newChatForm, setNewChatForm] = useState({
        phone: '',
        message: ''
    });
    const [dialpadNumber, setDialpadNumber] = useState('');
    const [dialpadSearch, setDialpadSearch] = useState('');
    const [dialpadContacts, setDialpadContacts] = useState([]);
    const [sending, setSending] = useState(false);
    const [recentContacts, setRecentContacts] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);
    
    // États pour l'appel vocal
    const [callState, setCallState] = useState('idle'); // idle, calling, ringing, connected, ended
    const [activeCall, setActiveCall] = useState(null);
    const [callDuration, setCallDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeakerOn, setIsSpeakerOn] = useState(false);
    const [incomingCall, setIncomingCall] = useState(null);
    const [callHistory, setCallHistory] = useState([]);
    
    const messagesEndRef = useRef(null);
    const pollIntervalRef = useRef(null);
    const callTimerRef = useRef(null);
    const localStreamRef = useRef(null);
    const peerConnectionRef = useRef(null);

    useEffect(() => {
        if (user) {
            fetchConversations();
            fetchRecentContacts();
            fetchCallHistory();
            startPolling();
        }
        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            if (callTimerRef.current) clearInterval(callTimerRef.current);
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }
            if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
            }
        };
    }, [user]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // ✅ WebSocket - Écouter les événements
    useEffect(() => {
        if (socket) {
            // Nouveaux messages
            socket.on('new_message', (data) => {
                console.log('📩 Nouveau message:', data);
                
                if (selectedContact && 
                    (data.sender_id === selectedContact.id || data.receiver_id === selectedContact.id)) {
                    setMessages(prev => [...prev, data]);
                }
                
                fetchConversations();
                
                if (data.sender_id !== user.id) {
                    toast.success(`💬 Nouveau message de ${data.sender_name || 'quelqu\'un'}`, {
                        duration: 4000,
                        icon: '💬'
                    });
                }
            });

            // Appel entrant
            socket.on('incoming_call', (data) => {
                console.log('📞 Appel entrant:', data);
                setIncomingCall(data);
                setCallState('ringing');
                playRingtone();
            });

            // Appel accepté
            socket.on('call_accepted', (data) => {
                console.log('✅ Appel accepté');
                setCallState('connected');
                setActiveCall(data);
                startCallTimer();
            });

            // Appel rejeté
            socket.on('call_rejected', (data) => {
                console.log('❌ Appel rejeté');
                toast.error('Appel rejeté');
                endCall();
            });

            // Appel terminé
            socket.on('call_ended', () => {
                console.log('📴 Appel terminé');
                toast('Appel terminé', { icon: '📴' });
                endCall();
            });

            // Appel annulé
            socket.on('call_cancelled', () => {
                console.log('📴 Appel annulé');
                endCall();
            });

            return () => {
                socket.off('new_message');
                socket.off('incoming_call');
                socket.off('call_accepted');
                socket.off('call_rejected');
                socket.off('call_ended');
                socket.off('call_cancelled');
            };
        }
    }, [socket, selectedContact, user]);

    const startPolling = () => {
        pollIntervalRef.current = setInterval(() => {
            fetchConversations();
            if (selectedContact) {
                fetchMessages(selectedContact.id, false);
            }
        }, 5000);
    };

    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // ============================================
    // SONNERIE
    // ============================================
    const playRingtone = () => {
        // Créer un son de sonnerie avec Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 440;
            oscillator.type = 'sine';
            gainNode.gain.value = 0.1;
            
            oscillator.start();
            
            // Arrêter après 30 secondes
            setTimeout(() => {
                try { oscillator.stop(); } catch(e) {}
            }, 30000);
        } catch (error) {
            console.log('Son non disponible:', error);
        }
    };

    // ============================================
    // APPEL VOCAL
    // ============================================
    const startCallTimer = () => {
        setCallDuration(0);
        if (callTimerRef.current) clearInterval(callTimerRef.current);
        callTimerRef.current = setInterval(() => {
            setCallDuration(prev => prev + 1);
        }, 1000);
    };

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Démarrer un appel
    const handleStartCall = (contact) => {
        if (!contact) {
            toast.error('Aucun contact sélectionné');
            return;
        }

        if (!socket) {
            toast.error('Connexion temps réel non disponible');
            return;
        }

        console.log('📞 Démarrage appel vers:', contact);

        // Émettre l'événement d'appel
        socket.emit('start_call', {
            caller_id: user.id,
            caller_name: user.fullname,
            caller_phone: user.phone,
            receiver_id: contact.id,
            receiver_phone: contact.phone
        });

        setActiveCall({
            id: `call-${Date.now()}`,
            contact: contact,
            type: 'outgoing',
            startedAt: new Date().toISOString()
        });
        setCallState('calling');
    };

    // Accepter un appel
    const handleAcceptCall = () => {
        if (!incomingCall || !socket) return;

        console.log('✅ Acceptation appel de:', incomingCall);

        socket.emit('accept_call', {
            call_id: incomingCall.call_id,
            caller_id: incomingCall.caller_id,
            receiver_id: user.id
        });

        setActiveCall({
            id: incomingCall.call_id,
            contact: {
                id: incomingCall.caller_id,
                name: incomingCall.caller_name,
                phone: incomingCall.caller_phone
            },
            type: 'incoming',
            startedAt: new Date().toISOString()
        });
        setIncomingCall(null);
        setCallState('connected');
        startCallTimer();
    };

    // Rejeter un appel
    const handleRejectCall = () => {
        if (!incomingCall || !socket) return;

        socket.emit('reject_call', {
            call_id: incomingCall.call_id,
            caller_id: incomingCall.caller_id,
            receiver_id: user.id
        });

        setIncomingCall(null);
        setCallState('idle');
    };

    // Terminer un appel
    const endCall = () => {
        if (callTimerRef.current) {
            clearInterval(callTimerRef.current);
            callTimerRef.current = null;
        }

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }

        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }

        setCallState('idle');
        setActiveCall(null);
        setCallDuration(0);
        setIsMuted(false);
        setIsSpeakerOn(false);
        
        // Sauvegarder dans l'historique
        fetchCallHistory();
    };

    // Annuler un appel en cours
    const handleCancelCall = () => {
        if (!activeCall || !socket) return;

        socket.emit('cancel_call', {
            call_id: activeCall.id,
            caller_id: user.id,
            receiver_id: activeCall.contact.id
        });

        endCall();
    };

    // Basculer le micro
    const toggleMute = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
                
                toast(isMuted ? '🎤 Micro activé' : '🔇 Micro désactivé', {
                    duration: 2000
                });
            }
        } else {
            setIsMuted(!isMuted);
        }
    };

    // Basculer le haut-parleur
    const toggleSpeaker = () => {
        setIsSpeakerOn(!isSpeakerOn);
        toast(isSpeakerOn ? '🔊 Haut-parleur désactivé' : '🔊 Haut-parleur activé', {
            duration: 2000
        });
    };

    // ============================================
    // CLAVIER D'APPEL
    // ============================================
    const dialpadKeys = [
        { number: '1', letters: '' },
        { number: '2', letters: 'ABC' },
        { number: '3', letters: 'DEF' },
        { number: '4', letters: 'GHI' },
        { number: '5', letters: 'JKL' },
        { number: '6', letters: 'MNO' },
        { number: '7', letters: 'PQRS' },
        { number: '8', letters: 'TUV' },
        { number: '9', letters: 'WXYZ' },
        { number: '*', letters: '' },
        { number: '0', letters: '+' },
        { number: '#', letters: '' }
    ];

    const handleDialpadPress = (key) => {
        if (dialpadNumber.length < 15) {
            setDialpadNumber(prev => prev + key);
        }
    };

    const handleDialpadDelete = () => {
        setDialpadNumber(prev => prev.slice(0, -1));
    };

    const handleDialpadClear = () => {
        setDialpadNumber('');
    };

    // Rechercher un contact par numéro
    useEffect(() => {
        if (dialpadNumber.length >= 3) {
            const search = dialpadNumber.toLowerCase();
            const filtered = conversations.filter(conv =>
                conv.contact_phone?.includes(search) ||
                conv.contact_name?.toLowerCase().includes(search)
            );
            setDialpadContacts(filtered);
        } else {
            setDialpadContacts([]);
        }
    }, [dialpadNumber, conversations]);

    // Appeler depuis le clavier
    const handleDialpadCall = async () => {
        if (!dialpadNumber) {
            toast.error('Veuillez entrer un numéro');
            return;
        }

        if (dialpadNumber.length < 8) {
            toast.error('Le numéro doit contenir 8 chiffres');
            return;
        }

        // Chercher le contact
        const contact = conversations.find(conv =>
            conv.contact_phone === dialpadNumber
        );

        if (contact) {
            setSelectedContact({
                id: contact.contact_id,
                name: contact.contact_name,
                phone: contact.contact_phone
            });
            setShowDialpad(false);
            handleStartCall({
                id: contact.contact_id,
                name: contact.contact_name,
                phone: contact.contact_phone
            });
        } else {
            // Vérifier si l'utilisateur existe
            try {
                const token = localStorage.getItem('accessToken');
                const response = await axios.post('/api/chat/check-user', {
                    phone: dialpadNumber
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (response.data.exists) {
                    setShowDialpad(false);
                    handleStartCall({
                        id: response.data.user.id,
                        name: response.data.user.fullname,
                        phone: response.data.user.phone
                    });
                } else {
                    toast.error('Ce numéro n\'est pas sur AlkherPay');
                    setUnknownNumber(dialpadNumber);
                    setShowDialpad(false);
                    setShowUnknownUserModal(true);
                }
            } catch (error) {
                console.error('❌ Erreur:', error);
                toast.error('Erreur lors de la vérification');
            }
        }
    };

    // ============================================
    // HISTORIQUE DES APPELS
    // ============================================
    const fetchCallHistory = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.get('/api/chat/call-history', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCallHistory(response.data.data || []);
        } catch (error) {
            console.error('❌ Erreur historique appels:', error);
            setCallHistory([]);
        }
    };

    // ============================================
    // RÉCUPÉRATION DES DONNÉES
    // ============================================
    const fetchConversations = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.get('/api/chat/conversations', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setConversations(response.data.data || []);
        } catch (error) {
            console.error('❌ Erreur conversations:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRecentContacts = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.get('/api/chat/recent-contacts', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRecentContacts(response.data.data || []);
        } catch (error) {
            console.error('❌ Erreur contacts:', error);
        }
    };

    const fetchMessages = async (contactId, showLoading = true) => {
        try {
            if (showLoading) setLoading(true);
            const token = localStorage.getItem('accessToken');
            const response = await axios.get(`/api/chat/messages/${contactId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessages(response.data.data || []);
        } catch (error) {
            console.error('❌ Erreur messages:', error);
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    const handleSelectContact = (contact) => {
        setSelectedContact(contact);
        fetchMessages(contact.id);
    };

    // ============================================
    // ENVOYER UN MESSAGE
    // ============================================
    const handleSendMessage = async () => {
        if (!newMessage.trim()) {
            toast.error('Veuillez écrire un message');
            return;
        }

        if (!selectedContact) {
            toast.error('Aucun contact sélectionné');
            return;
        }

        setSending(true);
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.post('/api/chat/send', {
                receiver_id: selectedContact.id,
                message: newMessage.trim()
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setNewMessage('');
                fetchMessages(selectedContact.id, false);
                fetchConversations();
                fetchRecentContacts();
            } else {
                toast.error(response.data.error || 'Erreur lors de l\'envoi');
            }
        } catch (error) {
            console.error('❌ Erreur envoi:', error);
            toast.error(error.response?.data?.error || 'Erreur lors de l\'envoi');
        } finally {
            setSending(false);
        }
    };

    // ============================================
    // NOUVELLE CONVERSATION
    // ============================================
    const handleNewChat = async (e) => {
        e.preventDefault();

        const phone = newChatForm.phone.trim();
        const message = newChatForm.message.trim();

        if (!phone) {
            toast.error('Veuillez entrer un numéro de téléphone');
            return;
        }

        if (phone.length < 8) {
            toast.error('Le numéro doit contenir 8 chiffres');
            return;
        }

        if (!message) {
            toast.error('Veuillez écrire un message');
            return;
        }

        setSending(true);
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.post('/api/chat/check-user', {
                phone: phone
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.exists) {
                const sendResponse = await axios.post('/api/chat/send-by-phone', {
                    phone: phone,
                    message: message
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (sendResponse.data.success) {
                    toast.success('✅ Message envoyé !');
                    setShowNewChatModal(false);
                    setNewChatForm({ phone: '', message: '' });
                    
                    handleSelectContact(sendResponse.data.contact);
                    fetchConversations();
                    fetchRecentContacts();
                }
            } else {
                setUnknownNumber(phone);
                setShowNewChatModal(false);
                setShowUnknownUserModal(true);
            }
        } catch (error) {
            console.error('❌ Erreur:', error);
            toast.error(error.response?.data?.error || 'Erreur lors de l\'envoi');
        } finally {
            setSending(false);
        }
    };

    // ============================================
    // PARTAGER L'INVITATION
    // ============================================
    const shareInvitation = (platform) => {
        const appUrl = window.location.origin;
        const message = `👋 Salut ! Je t'invite à rejoindre AlkherPay, la plateforme qui simplifie la vie. 

📱 Inscris-toi ici : ${appUrl}/register?ref=${user?.referral_code || ''}

Une fois inscrit, tu pourras discuter avec moi et profiter de tous nos services ! 💬`;

        switch(platform) {
            case 'whatsapp':
                window.open(`https://wa.me/${unknownNumber ? '235' + unknownNumber : ''}?text=${encodeURIComponent(message)}`, '_blank');
                break;
            case 'telegram':
                window.open(`https://t.me/share/url?url=${encodeURIComponent(appUrl)}&text=${encodeURIComponent(message)}`, '_blank');
                break;
            case 'facebook':
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(appUrl)}`, '_blank');
                break;
            case 'sms':
                window.open(`sms:${unknownNumber}?body=${encodeURIComponent(message)}`, '_blank');
                break;
            case 'copy':
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(message);
                    toast.success('📋 Message copié !');
                }
                break;
            default:
                break;
        }
    };

    const handleDeleteConversation = async (contactId) => {
        if (!window.confirm('Voulez-vous supprimer cette conversation ?')) return;

        try {
            const token = localStorage.getItem('accessToken');
            await axios.delete(`/api/chat/conversation/${contactId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success('Conversation supprimée');
            fetchConversations();
            
            if (selectedContact?.id === contactId) {
                setSelectedContact(null);
                setMessages([]);
            }
        } catch (error) {
            console.error('❌ Erreur suppression:', error);
            toast.error('Erreur lors de la suppression');
        }
    };

    // ============================================
    // FORMATAGE
    // ============================================
    const formatTime = (date) => {
        if (!date) return '';
        return new Date(date).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDate = (date) => {
        if (!date) return '';
        const d = new Date(date);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (d.toDateString() === today.toDateString()) {
            return 'Aujourd\'hui';
        } else if (d.toDateString() === yesterday.toDateString()) {
            return 'Hier';
        } else {
            return d.toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        }
    };

    const groupedMessages = messages.reduce((groups, message) => {
        const date = formatDate(message.created_at);
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(message);
        return groups;
    }, {});

    const filteredConversations = conversations.filter(conv =>
        conv.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.contact_phone?.includes(searchTerm)
    );

    if (!user) {
        navigate('/login');
        return null;
    }

    return (
        <Layout user={user} socket={socket}>
            <div className="container mx-auto px-4 py-6">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="mb-4 flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors bg-white rounded-lg shadow-sm hover:shadow-md"
                >
                    <FaArrowLeft /> Retour
                </button>

                {/* En-tête */}
                <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-2xl p-6 mb-6 shadow-lg">
                    <div className="flex justify-between items-start flex-wrap gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                                <FaComments /> Messagerie
                            </h1>
                            <p className="text-blue-200">Discutez et appelez vos contacts AlkherPay</p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <button
                                onClick={() => setShowDialpad(true)}
                                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
                            >
                                <FaPhoneAlt /> Clavier d'appel
                            </button>
                            <button
                                onClick={() => setShowNewChatModal(true)}
                                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition flex items-center gap-2"
                            >
                                <FaUserPlus /> Nouveau message
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-300px)] min-h-[500px]">
                    {/* LISTE DES CONVERSATIONS */}
                    <div className="lg:col-span-1 bg- rounded-2xl shadow-lg overflow-hidden flex flex-col">
                        <div className="p-4 border-b bg-blue-600">
                            <div className="relative">
                                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Rechercher un contact..."
                                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {loading ? (
                                <div className="flex justify-center py-8">
                                    <FaSpinner className="animate-spin text-blue-500 text-2xl" />
                                </div>
                            ) : filteredConversations.length === 0 ? (
                                <div className="text-center py-12 px-4">
                                    <FaComments className="text-gray-300 text-4xl mx-auto mb-3" />
                                    <p className="text-gray-500 text-sm">Aucune conversation</p>
                                    <button
                                        onClick={() => setShowNewChatModal(true)}
                                        className="mt-3 text-blue-600 text-sm hover:text-blue-700 font-medium"
                                    >
                                        Démarrer une conversation →
                                    </button>
                                </div>
                            ) : (
                                filteredConversations.map((conv) => (
                                    <div
                                        key={conv.contact_id}
                                        className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition ${
                                            selectedContact?.id === conv.contact_id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div 
                                                className="relative"
                                                onClick={() => handleSelectContact({
                                                    id: conv.contact_id,
                                                    name: conv.contact_name,
                                                    phone: conv.contact_phone
                                                })}
                                            >
                                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                                                    {conv.contact_name?.charAt(0)?.toUpperCase() || '?'}
                                                </div>
                                                {conv.is_online && (
                                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                                                )}
                                            </div>
                                            <div 
                                                className="flex-1 min-w-0"
                                                onClick={() => handleSelectContact({
                                                    id: conv.contact_id,
                                                    name: conv.contact_name,
                                                    phone: conv.contact_phone
                                                })}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <p className="font-medium text-gray-800 truncate">
                                                        {conv.contact_name || conv.contact_phone}
                                                    </p>
                                                    <span className="text-xs text-gray-400">
                                                        {formatTime(conv.last_message_at)}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-500 truncate mt-1">
                                                    {conv.last_message_sender_id === user.id && '✓ '}
                                                    {conv.last_message || 'Nouvelle conversation'}
                                                </p>
                                            </div>
                                            <div className="flex flex-col gap-2 items-center">
                                                {conv.unread_count > 0 && (
                                                    <div className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                                        {conv.unread_count > 9 ? '9+' : conv.unread_count}
                                                    </div>
                                                )}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleStartCall({
                                                            id: conv.contact_id,
                                                            name: conv.contact_name,
                                                            phone: conv.contact_phone
                                                        });
                                                    }}
                                                    className="p-2 text-green-600 hover:bg-green-100 rounded-full transition"
                                                    title="Appeler"
                                                >
                                                    <FaPhone size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* ZONE DE CHAT */}
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col">
                        {!selectedContact ? (
                            <div className="flex-1 flex items-center justify-center p-8">
                                <div className="text-center">
                                    <FaComments className="text-gray-200 text-6xl mx-auto mb-4" />
                                    <p className="text-gray-500 mb-2">Sélectionnez une conversation</p>
                                    <p className="text-gray-400 text-sm mb-4">ou démarrez-en une nouvelle</p>
                                    <div className="flex gap-2 justify-center">
                                        <button
                                            onClick={() => setShowNewChatModal(true)}
                                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
                                        >
                                            <FaPlus /> Nouveau message
                                        </button>
                                        <button
                                            onClick={() => setShowDialpad(true)}
                                            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                                        >
                                            <FaPhoneAlt /> Appeler
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* En-tête du chat */}
                                <div className="p-4 border-b bg-blue-800/50 from-blue-50 to-indigo-50 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                                            {selectedContact.name?.charAt(0)?.toUpperCase() || '?'}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">
                                                {selectedContact.name || selectedContact.phone}
                                            </p>
                                            <p className="text-xs text-black">
                                                {selectedContact.phone}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleStartCall(selectedContact)}
                                            className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition"
                                            title="Appel vocal"
                                        >
                                            <FaPhone />
                                        </button>
                                        <button
                                            onClick={() => window.open(`tel:${selectedContact.phone}`)}
                                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition"
                                            title="Appeler via téléphone"
                                        >
                                            <FaPhoneAlt />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteConversation(selectedContact.id)}
                                            className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition"
                                            title="Supprimer"
                                        >
                                            <FaTrash />
                                        </button>
                                    </div>
                                </div>

                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                                    {Object.entries(groupedMessages).map(([date, dateMessages]) => (
                                        <div key={date}>
                                            <div className="text-center my-4">
                                                <span className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                                                    {date}
                                                </span>
                                            </div>
                                            {dateMessages.map((msg) => {
                                                const isMine = msg.sender_id === user.id;
                                                return (
                                                    <div
                                                        key={msg.id}
                                                        className={`flex mb-3 ${isMine ? 'justify-end' : 'justify-start'}`}
                                                    >
                                                        <div className={`max-w-[70%] ${isMine ? 'order-2' : 'order-1'}`}>
                                                            <div
                                                                className={`px-4 py-2 rounded-2xl ${
                                                                    isMine
                                                                        ? 'bg-blue-600 text-white rounded-br-md'
                                                                        : 'bg-white text-gray-800 rounded-bl-md shadow-sm'
                                                                }`}
                                                            >
                                                                <p className="text-sm break-words">{msg.message}</p>
                                                            </div>
                                                            <div className={`flex items-center gap-1 mt-1 text-xs text-gray-400 ${
                                                                isMine ? 'justify-end' : 'justify-start'
                                                            }`}>
                                                                <span>{formatTime(msg.created_at)}</span>
                                                                {isMine && (
                                                                    <>
                                                                        {msg.is_read ? (
                                                                            <FaCheckDouble className="text-blue-500" />
                                                                        ) : (
                                                                            <FaCheck />
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Zone de saisie */}
                                <div className="p-4 border-t bg-blue-800/80">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                            placeholder="Écrivez votre message..."
                                            className="flex-1 px-4 py-3 border rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            disabled={sending}
                                        />
                                        <button
                                            onClick={handleSendMessage}
                                            disabled={sending || !newMessage.trim()}
                                            className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center w-12 h-12"
                                        >
                                            {sending ? (
                                                <FaSpinner className="animate-spin" />
                                            ) : (
                                                <FaPaperPlane />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* ============================================
                MODAL: CLAVIER D'APPEL
            ============================================ */}
            {showDialpad && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="relative max-w-sm w-full bg-gradient-to-br from-blue-900 to-indigo-900 rounded-3xl shadow-2xl overflow-hidden">
                        {/* En-tête */}
                        <div className="p-4 border-b border-white/10 flex justify-between items-center">
                            <h3 className="text-white font-bold flex items-center gap-2">
                                <FaPhoneAlt className="text-green-400" /> Clavier d'appel
                            </h3>
                            <button
                                onClick={() => {
                                    setShowDialpad(false);
                                    setDialpadNumber('');
                                }}
                                className="text-white/60 hover:text-white p-2"
                            >
                                <FaTimes size={20} />
                            </button>
                        </div>

                        {/* Affichage du numéro */}
                        <div className="p-6 text-center">
                            <div className="bg-white/10 rounded-2xl p-4 mb-4 min-h-[80px] flex items-center justify-center">
                                <p className="text-white text-3xl font-light tracking-widest break-all">
                                    {dialpadNumber || <span className="text-white/30">Entrez un numéro</span>}
                                </p>
                            </div>
                            
                            {/* Indication si contact trouvé */}
                            {dialpadContacts.length > 0 && dialpadNumber.length >= 3 && (
                                <div className="bg-green-500/20 rounded-lg p-2 mb-4">
                                    <p className="text-green-300 text-sm">
                                        <FaCheckCircle className="inline mr-1" />
                                        {dialpadContacts[0].contact_name} trouvé
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Clavier */}
                        <div className="px-6 pb-6">
                            <div className="grid grid-cols-3 gap-3">
                                {dialpadKeys.map((key) => (
                                    <button
                                        key={key.number}
                                        onClick={() => handleDialpadPress(key.number)}
                                        className="bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-2xl p-4 transition-all"
                                    >
                                        <p className="text-white text-2xl font-light">{key.number}</p>
                                        {key.letters && (
                                            <p className="text-white/50 text-xs">{key.letters}</p>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Boutons d'action */}
                            <div className="grid grid-cols-3 gap-3 mt-4">
                                <div></div>
                                <button
                                    onClick={handleDialpadCall}
                                    disabled={!dialpadNumber || dialpadNumber.length < 8}
                                    className="bg-green-500 hover:bg-green-600 disabled:bg-green-500/30 disabled:cursor-not-allowed rounded-full p-5 transition-all flex items-center justify-center"
                                >
                                    <FaPhone className="text-white text-2xl" />
                                </button>
                                <button
                                    onClick={handleDialpadDelete}
                                    disabled={!dialpadNumber}
                                    className="bg-white/10 hover:bg-white/20 disabled:opacity-30 rounded-full p-5 transition-all flex items-center justify-center"
                                >
                                    <FaBackspace className="text-white text-2xl" />
                                </button>
                            </div>

                            {/* Boutons supplémentaires */}
                            <div className="grid grid-cols-2 gap-3 mt-4">
                                <button
                                    onClick={handleDialpadClear}
                                    disabled={!dialpadNumber}
                                    className="bg-red-500/20 hover:bg-red-500/30 disabled:opacity-30 text-red-300 py-3 rounded-xl transition-all text-sm font-medium"
                                >
                                    Effacer tout
                                </button>
                                <button
                                    onClick={() => {
                                        setShowDialpad(false);
                                        setShowNewChatModal(true);
                                        setNewChatForm({ ...newChatForm, phone: dialpadNumber });
                                    }}
                                    className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 py-3 rounded-xl transition-all text-sm font-medium"
                                >
                                    Envoyer message
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================
                MODAL: APPEL ENTRANT
            ============================================ */}
            {callState === 'ringing' && incomingCall && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <div className="relative max-w-sm w-full bg-gradient-to-br from-blue-900 to-indigo-900 rounded-3xl shadow-2xl overflow-hidden">
                        <div className="p-8 text-center">
                            {/* Animation */}
                            <div className="relative mb-6">
                                <div className="w-32 h-32 mx-auto bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center relative">
                                    <div className="absolute inset-0 rounded-full bg-green-400 animate-ping opacity-30"></div>
                                    <FaUser className="text-white text-5xl" />
                                </div>
                            </div>

                            {/* Nom de l'appelant */}
                            <h2 className="text-white text-2xl font-bold mb-2">
                                {incomingCall.caller_name}
                            </h2>
                            <p className="text-white/60 mb-1">{incomingCall.caller_phone}</p>
                            <p className="text-green-400 text-lg mb-8 animate-pulse">
                                📞 Appel entrant...
                            </p>

                            {/* Boutons */}
                            <div className="flex justify-center gap-8">
                                <button
                                    onClick={handleRejectCall}
                                    className="bg-red-500 hover:bg-red-600 rounded-full p-5 transition-all flex flex-col items-center"
                                >
                                    <FaPhoneSlash className="text-white text-2xl" />
                                    <span className="text-white text-xs mt-1">Rejeter</span>
                                </button>
                                <button
                                    onClick={handleAcceptCall}
                                    className="bg-green-500 hover:bg-green-600 rounded-full p-5 transition-all flex flex-col items-center animate-bounce"
                                >
                                    <FaPhone className="text-white text-2xl" />
                                    <span className="text-white text-xs mt-1">Accepter</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================
                MODAL: APPEL EN COURS
            ============================================ */}
            {(callState === 'calling' || callState === 'connected') && activeCall && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <div className="relative max-w-sm w-full bg-gradient-to-br from-blue-900 to-indigo-900 rounded-3xl shadow-2xl overflow-hidden">
                        <div className="p-8 text-center">
                            {/* Animation */}
                            <div className="relative mb-6">
                                <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center relative ${
                                    callState === 'connected' 
                                        ? 'bg-gradient-to-br from-green-400 to-green-600' 
                                        : 'bg-gradient-to-br from-blue-400 to-blue-600'
                                }`}>
                                    {callState === 'calling' && (
                                        <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-30"></div>
                                    )}
                                    {callState === 'connected' && (
                                        <div className="absolute inset-0 rounded-full bg-green-400 animate-pulse opacity-20"></div>
                                    )}
                                    <FaUser className="text-white text-5xl" />
                                </div>
                            </div>

                            {/* Nom du contact */}
                            <h2 className="text-white text-2xl font-bold mb-2">
                                {activeCall.contact?.name}
                            </h2>
                            <p className="text-white/60 mb-1">{activeCall.contact?.phone}</p>
                            
                            {/* État de l'appel */}
                            {callState === 'calling' && (
                                <p className="text-blue-400 text-lg mb-8">
                                    📞 Appel en cours...
                                </p>
                            )}
                            {callState === 'connected' && (
                                <div className="mb-8">
                                    <p className="text-green-400 text-lg mb-2">
                                        ✅ Appel connecté
                                    </p>
                                    <p className="text-white text-3xl font-mono">
                                        {formatDuration(callDuration)}
                                    </p>
                                </div>
                            )}

                            {/* Boutons de contrôle */}
                            <div className="flex justify-center gap-4">
                                <button
                                    onClick={toggleMute}
                                    className={`rounded-full p-4 transition-all flex flex-col items-center ${
                                        isMuted 
                                            ? 'bg-red-500 hover:bg-red-600' 
                                            : 'bg-white/20 hover:bg-white/30'
                                    }`}
                                >
                                    {isMuted ? (
                                        <FaMicrophoneSlash className="text-white text-xl" />
                                    ) : (
                                        <FaMicrophone className="text-white text-xl" />
                                    )}
                                    <span className="text-white text-xs mt-1">
                                        {isMuted ? 'Activer' : 'Muet'}
                                    </span>
                                </button>

                                <button
                                    onClick={callState === 'calling' ? handleCancelCall : endCall}
                                    className="bg-red-500 hover:bg-red-600 rounded-full p-4 transition-all flex flex-col items-center"
                                >
                                    <FaPhoneSlash className="text-white text-xl" />
                                    <span className="text-white text-xs mt-1">
                                        {callState === 'calling' ? 'Annuler' : 'Terminer'}
                                    </span>
                                </button>

                                <button
                                    onClick={toggleSpeaker}
                                    className={`rounded-full p-4 transition-all flex flex-col items-center ${
                                        isSpeakerOn 
                                            ? 'bg-green-500 hover:bg-green-600' 
                                            : 'bg-white/20 hover:bg-white/30'
                                    }`}
                                >
                                    {isSpeakerOn ? (
                                        <FaVolumeUp className="text-white text-xl" />
                                    ) : (
                                        <FaVolumeMute className="text-white text-xl" />
                                    )}
                                    <span className="text-white text-xs mt-1">
                                        {isSpeakerOn ? 'HP ON' : 'HP OFF'}
                                    </span>
                                </button>
                            </div>

                            {/* Info signal */}
                            {callState === 'connected' && (
                                <div className="mt-6 flex items-center justify-center gap-2 text-green-400">
                                    <FaSignal size={14} />
                                    <span className="text-xs">Connexion stable</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================
                MODAL: NOUVEAU MESSAGE
            ============================================ */}
            {showNewChatModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="relative max-w-md w-full bg-blue-900 rounded-2xl shadow-2xl">
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 rounded-t-2xl flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <FaUserPlus /> Nouveau message
                            </h3>
                            <button
                                onClick={() => setShowNewChatModal(false)}
                                className="text-white/80 hover:text-white p-1"
                            >
                                <FaTimes size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleNewChat} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-black mb-1">
                                    <FaPhone className="inline mr-2 text-blue-500" />
                                    Numéro de téléphone *
                                </label>
                                <input
                                    type="tel"
                                    value={newChatForm.phone}
                                    onChange={(e) => setNewChatForm({ ...newChatForm, phone: e.target.value })}
                                    placeholder="Ex: 62787307"
                                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-lg"
                                    maxLength={8}
                                    required
                                />
                                <p className="text-xs text-gray-50 mt-1">
                                    8 chiffres (ex: 62787307)
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-70 mb-1">
                                    <FaComments className="inline mr-2 text-blue-500" />
                                    Votre message *
                                </label>
                                <textarea
                                    value={newChatForm.message}
                                    onChange={(e) => setNewChatForm({ ...newChatForm, message: e.target.value })}
                                    placeholder="Écrivez votre message..."
                                    rows="4"
                                    className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                                    required
                                />
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p className="text-xs text-blue-700 flex items-start gap-2">
                                    <FaInfoCircle className="mt-0.5 flex-shrink-0" />
                                    <span>
                                        Si le destinataire n'est pas sur AlkherPay, nous vous proposerons 
                                        de l'inviter à rejoindre la plateforme.
                                    </span>
                                </p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowNewChatModal(false)}
                                    className="flex-1 border border-gray-300 py-3 rounded-lg hover:bg-red-500 transition"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={sending}
                                    className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                                >
                                    {sending ? (
                                        <><FaSpinner className="animate-spin" /> Envoi...</>
                                    ) : (
                                        <><FaPaperPlane /> Envoyer</>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ============================================
                MODAL: UTILISATEUR INCONNU
            ============================================ */}
            {showUnknownUserModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="relative max-w-md w-full bg-white rounded-2xl shadow-2xl">
                        <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4 rounded-t-2xl flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <FaUserPlus /> Inviter cet utilisateur
                            </h3>
                            <button
                                onClick={() => setShowUnknownUserModal(false)}
                                className="text-white/80 hover:text-white p-1"
                            >
                                <FaTimes size={20} />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="text-center mb-6">
                                <div className="text-5xl mb-3">📱</div>
                                <h4 className="text-lg font-bold text-gray-800 mb-2">
                                    Ce numéro n'est pas sur AlkherPay
                                </h4>
                                <p className="text-gray-600 text-sm">
                                    Le numéro <strong className="text-blue-600">{unknownNumber}</strong> n'est 
                                    pas encore inscrit sur la plateforme.
                                </p>
                            </div>

                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                                <p className="text-sm text-orange-800">
                                    💡 <strong>Invitez-le à rejoindre AlkherPay</strong> pour pouvoir 
                                    discuter avec lui et profiter de tous nos services !
                                </p>
                            </div>

                            <div className="mb-4">
                                <p className="text-sm font-medium text-gray-700 mb-3 text-center">
                                    Partager l'invitation via :
                                </p>
                                <div className="grid grid-cols-4 gap-3">
                                    <button
                                        onClick={() => shareInvitation('whatsapp')}
                                        className="flex flex-col items-center gap-2 p-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition"
                                    >
                                        <FaWhatsapp size={24} />
                                        <span className="text-xs">WhatsApp</span>
                                    </button>
                                    <button
                                        onClick={() => shareInvitation('telegram')}
                                        className="flex flex-col items-center gap-2 p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition"
                                    >
                                        <FaTelegram size={24} />
                                        <span className="text-xs">Telegram</span>
                                    </button>
                                    <button
                                        onClick={() => shareInvitation('facebook')}
                                        className="flex flex-col items-center gap-2 p-3 bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition"
                                    >
                                        <FaFacebook size={24} />
                                        <span className="text-xs">Facebook</span>
                                    </button>
                                    <button
                                        onClick={() => shareInvitation('sms')}
                                        className="flex flex-col items-center gap-2 p-3 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition"
                                    >
                                        <FaSms size={24} />
                                        <span className="text-xs">SMS</span>
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={() => shareInvitation('copy')}
                                className="bg-emerald-400 w-full border border-gray-300 py-2.5 rounded-lg hover:bg-green-500 transition flex items-center justify-center gap-2 text-sm"
                            >
                                <FaCopy /> Copier le message d'invitation
                            </button>

                            <button
                                onClick={() => {
                                    setShowUnknownUserModal(false);
                                    setNewChatForm({ phone: '', message: '' });
                                }}
                                className="w-full mt-3 text-red-500 hover:text-gray-700 text-sm py-2"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default Chat;