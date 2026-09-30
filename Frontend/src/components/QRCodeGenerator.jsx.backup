// src/components/QRCodeGenerator.jsx
import React, { useState, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FaQrcode, FaDownload, FaCopy, FaShare, FaWhatsapp, FaEnvelope, FaTimes, FaMoneyBillWave, FaSpinner } from 'react-icons/fa';
import QRCode from 'qrcode.react';

function QRCodeGenerator({ user, onClose }) {
    const [amount, setAmount] = useState('');
    const [qrData, setQrData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [qrImage, setQrImage] = useState(null);
    const [deepLink, setDeepLink] = useState('');
    const [webLink, setWebLink] = useState('');
    const qrRef = useRef();

    const generateQRCode = async () => {
        const amountNum = parseInt(amount);
        if (amountNum && amountNum < 25) {
            toast.error('Le montant minimum est de 25 FCFA');
            return;
        }
        
        setLoading(true);
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.get(`/api/qr/generate-dynamic?amount=${amountNum || ''}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setQrData(response.data.qrData);
            setQrImage(response.data.qrImage);
            setDeepLink(response.data.deepLink);
            setWebLink(response.data.webLink);
            toast.success('QR code généré avec succès');
        } catch (error) {
            toast.error('Erreur lors de la génération du QR code');
        } finally {
            setLoading(false);
        }
    };

    const downloadQRCode = () => {
        const canvas = document.getElementById('qr-code-canvas');
        if (canvas) {
            const link = document.createElement('a');
            link.download = `AlkherPay-qrcode-${user?.phone}.png`;
            link.href = canvas.toDataURL();
            link.click();
            toast.success('QR code téléchargé');
        }
    };

    const copyToClipboard = (text, label) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copié !`);
    };

    const shareViaWhatsApp = () => {
        const message = `💰 *Demande de paiement AlkherPay*\n\nScannez ce QR code ou cliquez sur le lien pour me payer :\n${webLink}\n\nMontant: ${amount ? parseInt(amount).toLocaleString() : 'À définir'} FCFA\n\n📱 AlkherPay - Transfert instantané`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    };

    const shareViaEmail = () => {
        const subject = 'Demande de paiement AlkherPay';
        const body = `Bonjour,\n\nJe vous invite à me payer via AlkherPay.\n\nLien de paiement: ${webLink}\n\nMontant: ${amount ? parseInt(amount).toLocaleString() : 'À définir'} FCFA\n\nMerci !`;
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fade-in">
            <div className="relative max-w-md w-full bg-gradient-to-br from-blue-900 to-blue-800 rounded-2xl shadow-2xl">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-white/10">
                    <div className="flex items-center gap-2">
                        <FaQrcode className="text-blue-400 text-xl" />
                        <h3 className="text-white font-bold">Mon QR Code de paiement</h3>
                    </div>
                    <button onClick={onClose} className="text-white/60 hover:text-white">
                        <FaTimes size={20} />
                    </button>
                </div>

                {/* Contenu */}
                <div className="p-6">
                    {!qrData ? (
                        <div className="space-y-4">
                            <div className="text-center">
                                <div className="w-24 h-24 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center mb-3">
                                    <FaQrcode className="text-blue-400 text-4xl" />
                                </div>
                                <p className="text-white/70 text-sm">
                                    Générer un QR code pour recevoir un paiement
                                </p>
                            </div>
                            
                            <div>
                                <label className="label">Montant (optionnel)</label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="input-field flex-1"
                                        placeholder="Ex: 5000"
                                        min="25"
                                    />
                                    <button
                                        onClick={generateQRCode}
                                        disabled={loading}
                                        className="btn-primary px-6"
                                    >
                                        {loading ? <FaSpinner className="animate-spin" /> : <FaQrcode />}
                                    </button>
                                </div>
                                <p className="text-white/40 text-xs mt-1">
                                    Laissez vide pour laisser le montant à définir par le payeur
                                </p>
                            </div>

                            <div className="bg-white/5 rounded-xl p-3">
                                <p className="text-white/50 text-xs text-center">
                                    💡 Le QR code contient un lien qui redirige automatiquement vers la page de transfert
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* QR Code */}
                            <div className="text-center">
                                <div className="bg-white p-4 rounded-xl inline-block mx-auto">
                                    <QRCode
                                        id="qr-code-canvas"
                                        value={qrData}
                                        size={200}
                                        bgColor="#ffffff"
                                        fgColor="#0A2F6C"
                                        level="H"
                                        includeMargin={true}
                                    />
                                </div>
                                <p className="text-white/50 text-xs mt-2">
                                    Scannez ce QR code avec l'app AlkherPay
                                </p>
                            </div>

                            {/* Infos */}
                            <div className="bg-white/5 rounded-xl p-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-white/60">Votre numéro</span>
                                    <span className="text-white font-mono">{user?.phone}</span>
                                </div>
                                {amount && (
                                    <div className="flex justify-between text-sm mt-2">
                                        <span className="text-white/60">Montant demandé</span>
                                        <span className="text-green-400 font-bold">{parseInt(amount).toLocaleString()} FCFA</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm mt-2">
                                    <span className="text-white/60">Lien de paiement</span>
                                    <button
                                        onClick={() => copyToClipboard(webLink, 'Lien')}
                                        className="text-blue-400 text-xs hover:underline"
                                    >
                                        Copier le lien
                                    </button>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <button
                                    onClick={downloadQRCode}
                                    className="flex-1 btn-secondary text-sm flex items-center justify-center gap-2"
                                >
                                    <FaDownload /> Télécharger
                                </button>
                                <button
                                    onClick={() => copyToClipboard(webLink, 'Lien de paiement')}
                                    className="flex-1 btn-secondary text-sm flex items-center justify-center gap-2"
                                >
                                    <FaCopy /> Copier le lien
                                </button>
                            </div>
                            
                            <div className="flex gap-2">
                                <button
                                    onClick={shareViaWhatsApp}
                                    className="flex-1 bg-[#25d366]/20 hover:bg-[#25d366]/30 text-white text-sm py-2 rounded-lg flex items-center justify-center gap-2"
                                >
                                    <FaWhatsapp /> WhatsApp
                                </button>
                                <button
                                    onClick={shareViaEmail}
                                    className="flex-1 bg-white/10 hover:bg-white/20 text-white text-sm py-2 rounded-lg flex items-center justify-center gap-2"
                                >
                                    <FaEnvelope /> Email
                                </button>
                            </div>

                            <button
                                onClick={() => {
                                    setQrData(null);
                                    setAmount('');
                                }}
                                className="w-full text-white/50 text-sm py-2 hover:text-white/70"
                            >
                                Générer un nouveau QR code
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default QRCodeGenerator;