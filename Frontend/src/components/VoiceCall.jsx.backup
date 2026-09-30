// src/components/VoiceCall.jsx
import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import {
    FaPhone, FaPhoneSlash, FaMicrophone, FaMicrophoneSlash,
    FaVolumeUp, FaVolumeMute, FaUser, FaTimes, FaSpinner,
    FaPhoneAlt
} from 'react-icons/fa';

const VoiceCall = ({ socket, user, onClose }) => {
    const [callState, setCallState] = useState('idle'); // idle, calling, incoming, connected, ended
    const [callData, setCallData] = useState(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeakerOn, setIsSpeakerOn] = useState(false);
    const [callDuration, setCallDuration] = useState(0);
    const [dialNumber, setDialNumber] = useState('');
    const [showDialpad, setShowDialpad] = useState(false);

    const localStreamRef = useRef(null);
    const remoteStreamRef = useRef(null);
    const peerConnectionRef = useRef(null);
    const callTimerRef = useRef(null);
    const audioRef = useRef(null);

    // Configuration WebRTC
    const rtcConfig = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
        ]
    };

    // ============================================
    // INITIALISATION WEBSOCKET
    // ============================================
    useEffect(() => {
        if (!socket) return;

        // Appel entrant
        socket.on('incoming_call', (data) => {
            console.log('📞 Appel entrant:', data);
            setCallData(data);
            setCallState('incoming');
            
            // Jouer la sonnerie
            playRingtone();
        });

        // Appel accepté par l'autre
        socket.on('call_accepted', async (data) => {
            console.log('✅ Appel accepté:', data);
            setCallState('connecting');
            
            // Créer l'offre WebRTC
            await createOffer(data.callId);
        });

        // Appel rejeté
        socket.on('call_rejected', (data) => {
            console.log('❌ Appel rejeté:', data);
            toast.error('Appel rejeté');
            endCall();
        });

        // Appel échoué
        socket.on('call_failed', (data) => {
            console.log('❌ Appel échoué:', data);
            toast.error(data.reason || 'Appel échoué');
            resetCall();
        });

        // Appel terminé
        socket.on('call_ended', (data) => {
            console.log('📴 Appel terminé par l\'autre');
            toast('Appel terminé', { icon: '📴' });
            endCall();
        });

        // Réception d'une offre WebRTC
        socket.on('webrtc_offer', async (data) => {
            console.log('📥 Offre WebRTC reçue');
            await handleOffer(data.offer, data.senderId, data.callId);
        });

        // Réception d'une réponse WebRTC
        socket.on('webrtc_answer', async (data) => {
            console.log('📥 Réponse WebRTC reçue');
            await handleAnswer(data.answer);
        });

        // Réception d'un candidat ICE
        socket.on('webrtc_ice_candidate', async (data) => {
            console.log('📥 Candidat ICE reçu');
            await handleIceCandidate(data.candidate);
        });

        return () => {
            socket.off('incoming_call');
            socket.off('call_accepted');
            socket.off('call_rejected');
            socket.off('call_failed');
            socket.off('call_ended');
            socket.off('webrtc_offer');
            socket.off('webrtc_answer');
            socket.off('webrtc_ice_candidate');
        };
    }, [socket]);

    // ============================================
    // TIMER D'APPEL
    // ============================================
    useEffect(() => {
        if (callState === 'connected') {
            callTimerRef.current = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
        } else {
            if (callTimerRef.current) {
                clearInterval(callTimerRef.current);
                callTimerRef.current = null;
            }
        }

        return () => {
            if (callTimerRef.current) {
                clearInterval(callTimerRef.current);
            }
        };
    }, [callState]);

    // ============================================
    // SONNERIE
    // ============================================
    const playRingtone = () => {
        // Vibrer si supporté
        if (navigator.vibrate) {
            navigator.vibrate([500, 300, 500, 300, 500]);
        }
        
        // Jouer un son (optionnel)
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            gainNode.gain.value = 0.1;
            
            oscillator.start();
            
            setTimeout(() => {
                oscillator.stop();
                audioContext.close();
            }, 2000);
        } catch (error) {
            console.log('Son non disponible:', error);
        }
    };

    // ============================================
    // DÉMARRER UN APPEL
    // ============================================
    const startCall = (receiverId, receiverName) => {
        if (!receiverId) {
            toast.error('Veuillez sélectionner un contact');
            return;
        }

        console.log(`📞 Démarrage appel vers ${receiverName} (${receiverId})`);
        
        setCallData({
            receiverId,
            receiverName,
            callerId: user.id,
            callerName: user.fullname
        });
        setCallState('calling');
        
        // Notifier le serveur
        socket.emit('call_user', {
            callerId: user.id,
            callerName: user.fullname,
            receiverId: receiverId,
            callType: 'audio'
        });
    };

    // ============================================
    // ACCEPTER UN APPEL
    // ============================================
    const acceptCall = async () => {
        if (!callData) return;

        console.log('✅ Acceptation de l\'appel');
        
        try {
            // Demander l'accès au microphone
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: false
            });

            localStreamRef.current = stream;
            console.log('🎤 Microphone activé');

            // Initialiser la connexion WebRTC
            await initializePeerConnection();

            // Ajouter les pistes audio
            stream.getTracks().forEach(track => {
                peerConnectionRef.current.addTrack(track, stream);
            });

            // Notifier le serveur
            socket.emit('accept_call', {
                callId: callData.callId,
                callerId: callData.callerId
            });

            setCallState('connecting');

        } catch (error) {
            console.error('❌ Erreur accès micro:', error);
            toast.error('Impossible d\'accéder au microphone');
            rejectCall();
        }
    };

    // ============================================
    // REJETER UN APPEL
    // ============================================
    const rejectCall = () => {
        if (!callData) return;

        console.log('❌ Rejet de l\'appel');
        
        socket.emit('reject_call', {
            callId: callData.callId,
            callerId: callData.callerId,
            reason: 'rejected'
        });

        resetCall();
    };

    // ============================================
    // INITIALISER PEER CONNECTION
    // ============================================
    const initializePeerConnection = async () => {
        if (peerConnectionRef.current) return;

        const pc = new RTCPeerConnection(rtcConfig);
        peerConnectionRef.current = pc;

        // Gérer les candidats ICE
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('📤 Envoi candidat ICE');
                socket.emit('webrtc_ice_candidate', {
                    callId: callData?.callId,
                    receiverId: callData?.callerId || callData?.receiverId,
                    candidate: event.candidate
                });
            }
        };

        // Gérer les pistes distantes
        pc.ontrack = (event) => {
            console.log('🎧 Piste audio reçue');
            
            if (audioRef.current) {
                audioRef.current.srcObject = event.streams[0];
                remoteStreamRef.current = event.streams[0];
            }
        };

        // Surveiller l'état de la connexion
        pc.onconnectionstatechange = () => {
            console.log('🔗 État connexion:', pc.connectionState);
            
            if (pc.connectionState === 'connected') {
                setCallState('connected');
                toast.success('📞 Appel connecté', { icon: '🎤' });
            } else if (pc.connectionState === 'disconnected' || 
                       pc.connectionState === 'failed') {
                toast.error('Connexion perdue');
                endCall();
            }
        };

        return pc;
    };

    // ============================================
    // CRÉER UNE OFFRE (APPELANT)
    // ============================================
    const createOffer = async (callId) => {
        try {
            // Demander l'accès au micro
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: false
            });

            localStreamRef.current = stream;
            console.log('🎤 Microphone activé (appelant)');

            // Initialiser la connexion
            await initializePeerConnection();

            // Ajouter les pistes
            stream.getTracks().forEach(track => {
                peerConnectionRef.current.addTrack(track, stream);
            });

            // Créer l'offre
            const offer = await peerConnectionRef.current.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: false
            });

            await peerConnectionRef.current.setLocalDescription(offer);
            console.log('📤 Envoi offre WebRTC');

            // Envoyer l'offre
            socket.emit('webrtc_offer', {
                callId,
                receiverId: callData?.receiverId,
                offer
            });

        } catch (error) {
            console.error('❌ Erreur création offre:', error);
            toast.error('Erreur de connexion');
            endCall();
        }
    };

    // ============================================
    // GÉRER UNE OFFRE (APPELÉ)
    // ============================================
    const handleOffer = async (offer, senderId, callId) => {
        try {
            await initializePeerConnection();

            await peerConnectionRef.current.setRemoteDescription(
                new RTCSessionDescription(offer)
            );

            // Créer la réponse
            const answer = await peerConnectionRef.current.createAnswer();
            await peerConnectionRef.current.setLocalDescription(answer);

            console.log('📤 Envoi réponse WebRTC');

            socket.emit('webrtc_answer', {
                callId,
                callerId: senderId,
                answer
            });

        } catch (error) {
            console.error('❌ Erreur traitement offre:', error);
            endCall();
        }
    };

    // ============================================
    // GÉRER UNE RÉPONSE (APPELANT)
    // ============================================
    const handleAnswer = async (answer) => {
        try {
            if (peerConnectionRef.current) {
                await peerConnectionRef.current.setRemoteDescription(
                    new RTCSessionDescription(answer)
                );
                console.log('✅ Réponse WebRTC traitée');
            }
        } catch (error) {
            console.error('❌ Erreur traitement réponse:', error);
        }
    };

    // ============================================
    // GÉRER UN CANDIDAT ICE
    // ============================================
    const handleIceCandidate = async (candidate) => {
        try {
            if (peerConnectionRef.current && candidate) {
                await peerConnectionRef.current.addIceCandidate(
                    new RTCIceCandidate(candidate)
                );
            }
        } catch (error) {
            console.error('❌ Erreur candidat ICE:', error);
        }
    };

    // ============================================
    // TERMINER UN APPEL
    // ============================================
    const endCall = () => {
        const otherId = callData?.callerId === user.id 
            ? callData?.receiverId 
            : callData?.callerId;

        if (otherId && callData?.callId) {
            socket.emit('end_call', {
                callId: callData.callId,
                otherUserId: otherId
            });
        }

        resetCall();
    };

    // ============================================
    // RÉINITIALISER
    // ============================================
    const resetCall = () => {
        // Arrêter les pistes locales
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }

        // Fermer la connexion
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }

        // Arrêter le timer
        if (callTimerRef.current) {
            clearInterval(callTimerRef.current);
            callTimerRef.current = null;
        }

        setCallState('idle');
        setCallData(null);
        setCallDuration(0);
        setIsMuted(false);
        setIsSpeakerOn(false);

        if (onClose) onClose();
    };

    // ============================================
    // ACTIVER/DÉSACTIVER LE MICRO
    // ============================================
    const toggleMute = () => {
        if (localStreamRef.current) {
            const audioTrack = localStreamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
                
                toast(audioTrack.enabled ? '🎤 Micro activé' : '🔇 Micro coupé', {
                    duration: 1500
                });
            }
        }
    };

    // ============================================
    // ACTIVER/DÉSACTIVER LE HAUT-PARLEUR
    // ============================================
    const toggleSpeaker = () => {
        setIsSpeakerOn(!isSpeakerOn);
        if (audioRef.current) {
            audioRef.current.volume = isSpeakerOn ? 0.5 : 1.0;
        }
    };

    // ============================================
    // FORMATAGE DU TEMPS
    // ============================================
    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // ============================================
    // CLAVIER D'APPEL
    // ============================================
    const dialpadKeys = [
        { digit: '1', letters: '' },
        { digit: '2', letters: 'ABC' },
        { digit: '3', letters: 'DEF' },
        { digit: '4', letters: 'GHI' },
        { digit: '5', letters: 'JKL' },
        { digit: '6', letters: 'MNO' },
        { digit: '7', letters: 'PQRS' },
        { digit: '8', letters: 'TUV' },
        { digit: '9', letters: 'WXYZ' },
        { digit: '*', letters: '' },
        { digit: '0', letters: '+' },
        { digit: '#', letters: '' }
    ];

    const handleDialKey = (digit) => {
        if (dialNumber.length < 8) {
            setDialNumber(prev => prev + digit);
        }
    };

    const handleDialBackspace = () => {
        setDialNumber(prev => prev.slice(0, -1));
    };

    // ============================================
    // RENDU
    // ============================================
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            {/* Audio caché pour la lecture */}
            <audio ref={audioRef} autoPlay />

            <div className="relative w-full max-w-md">
                
                {/* ============================================
                    APPEL ENTRANT
                ============================================ */}
                {callState === 'incoming' && (
                    <div className="bg-gradient-to-br from-blue-900 to-indigo-900 rounded-3xl p-8 text-center shadow-2xl border border-white/10">
                        {/* Avatar animé */}
                        <div className="relative mb-6">
                            <div className="w-32 h-32 mx-auto bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center animate-pulse">
                                <span className="text-white text-5xl font-bold">
                                    {callData?.callerName?.charAt(0)?.toUpperCase() || '?'}
                                </span>
                            </div>
                            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-3 py-1 rounded-full text-xs">
                                📞 Appel entrant
                            </div>
                        </div>

                        <h3 className="text-2xl font-bold text-white mb-2">
                            {callData?.callerName || 'Inconnu'}
                        </h3>
                        <p className="text-blue-300 mb-8">
                            Vous appelle...
                        </p>

                        {/* Boutons */}
                        <div className="flex justify-center gap-6">
                            <button
                                onClick={rejectCall}
                                className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-2xl transition-all transform hover:scale-110 shadow-lg"
                            >
                                <FaPhoneSlash />
                            </button>
                            <button
                                onClick={acceptCall}
                                className="w-16 h-16 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center text-white text-2xl transition-all transform hover:scale-110 animate-bounce shadow-lg"
                            >
                                <FaPhone />
                            </button>
                        </div>
                    </div>
                )}

                {/* ============================================
                    APPEL SORTANT
                ============================================ */}
                {(callState === 'calling' || callState === 'connecting') && (
                    <div className="bg-gradient-to-br from-blue-900 to-indigo-900 rounded-3xl p-8 text-center shadow-2xl border border-white/10">
                        {/* Avatar animé */}
                        <div className="relative mb-6">
                            <div className="w-32 h-32 mx-auto bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-5xl font-bold">
                                    {callData?.receiverName?.charAt(0)?.toUpperCase() || '?'}
                                </span>
                            </div>
                            <div className="absolute inset-0 w-32 h-32 mx-auto rounded-full border-4 border-blue-400 animate-ping opacity-30"></div>
                        </div>

                        <h3 className="text-2xl font-bold text-white mb-2">
                            {callData?.receiverName || 'Contact'}
                        </h3>
                        
                        {callState === 'calling' ? (
                            <p className="text-blue-300 mb-8 flex items-center justify-center gap-2">
                                <FaSpinner className="animate-spin" />
                                Appel en cours...
                            </p>
                        ) : (
                            <p className="text-green-300 mb-8 flex items-center justify-center gap-2">
                                <FaPhone />
                                Connexion...
                            </p>
                        )}

                        {/* Bouton raccrocher */}
                        <button
                            onClick={endCall}
                            className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-2xl transition-all transform hover:scale-110 shadow-lg mx-auto"
                        >
                            <FaPhoneSlash />
                        </button>
                    </div>
                )}

                {/* ============================================
                    APPEL EN COURS
                ============================================ */}
                {callState === 'connected' && (
                    <div className="bg-gradient-to-br from-green-900 to-emerald-900 rounded-3xl p-8 text-center shadow-2xl border border-white/10">
                        {/* Avatar */}
                        <div className="relative mb-6">
                            <div className="w-32 h-32 mx-auto bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                                <span className="text-white text-5xl font-bold">
                                    {(callData?.receiverName || callData?.callerName)?.charAt(0)?.toUpperCase() || '?'}
                                </span>
                            </div>
                            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-3 py-1 rounded-full text-xs">
                                🎤 En communication
                            </div>
                        </div>

                        <h3 className="text-2xl font-bold text-white mb-2">
                            {callData?.receiverName || callData?.callerName || 'Contact'}
                        </h3>
                        
                        {/* Durée */}
                        <div className="text-3xl font-mono text-green-300 mb-8">
                            {formatDuration(callDuration)}
                        </div>

                        {/* Contrôles */}
                        <div className="flex justify-center gap-4 mb-6">
                            {/* Micro */}
                            <button
                                onClick={toggleMute}
                                className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition-all ${
                                    isMuted 
                                        ? 'bg-red-500 hover:bg-red-600' 
                                        : 'bg-white/20 hover:bg-white/30'
                                }`}
                                title={isMuted ? 'Activer le micro' : 'Couper le micro'}
                            >
                                {isMuted ? <FaMicrophoneSlash /> : <FaMicrophone />}
                            </button>

                            {/* Haut-parleur */}
                            <button
                                onClick={toggleSpeaker}
                                className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition-all ${
                                    isSpeakerOn 
                                        ? 'bg-blue-500 hover:bg-blue-600' 
                                        : 'bg-white/20 hover:bg-white/30'
                                }`}
                                title={isSpeakerOn ? 'Désactiver haut-parleur' : 'Activer haut-parleur'}
                            >
                                {isSpeakerOn ? <FaVolumeUp /> : <FaVolumeMute />}
                            </button>

                            {/* Raccrocher */}
                            <button
                                onClick={endCall}
                                className="w-14 h-14 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-xl transition-all transform hover:scale-110 shadow-lg"
                            >
                                <FaPhoneSlash />
                            </button>
                        </div>
                    </div>
                )}

                {/* ============================================
                    CLAVIER D'APPEL (MODE COMPOSITION)
                ============================================ */}
                {callState === 'idle' && showDialpad && (
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-6 shadow-2xl border border-white/10">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white">
                                📞 Composer un numéro
                            </h3>
                            <button
                                onClick={() => {
                                    setShowDialpad(false);
                                    setDialNumber('');
                                }}
                                className="text-white/60 hover:text-white p-2"
                            >
                                <FaTimes size={20} />
                            </button>
                        </div>

                        {/* Affichage du numéro */}
                        <div className="bg-white/10 rounded-2xl p-4 mb-6 text-center">
                            <div className="text-3xl font-mono text-white tracking-widest min-h-[48px]">
                                {dialNumber || '_ _ _ _ _ _ _ _'}
                            </div>
                        </div>

                        {/* Clavier */}
                        <div className="grid grid-cols-3 gap-3 mb-6">
                            {dialpadKeys.map(({ digit, letters }) => (
                                <button
                                    key={digit}
                                    onClick={() => handleDialKey(digit)}
                                    className="bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-2xl py-4 transition-all flex flex-col items-center justify-center"
                                >
                                    <span className="text-2xl font-bold text-white">{digit}</span>
                                    {letters && (
                                        <span className="text-xs text-white/50 tracking-widest mt-1">
                                            {letters}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-center gap-4">
                            {/* Effacer */}
                            <button
                                onClick={handleDialBackspace}
                                disabled={!dialNumber}
                                className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center disabled:opacity-30"
                            >
                                ⌫
                            </button>

                            {/* Appeler */}
                            <button
                                onClick={() => {
                                    if (dialNumber.length === 8) {
                                        // Chercher l'utilisateur par téléphone
                                        socket.emit('check_user_by_phone', { 
                                            phone: dialNumber,
                                            callerId: user.id 
                                        });
                                        // Ou utiliser directement un ID si connu
                                    } else {
                                        toast.error('Numéro incomplet (8 chiffres requis)');
                                    }
                                }}
                                disabled={dialNumber.length !== 8}
                                className="w-16 h-16 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center text-white text-2xl transition-all transform hover:scale-110 shadow-lg disabled:opacity-30 disabled:transform-none"
                            >
                                <FaPhoneAlt />
                            </button>

                            {/* Espace vide pour centrer */}
                            <div className="w-12 h-12"></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VoiceCall;