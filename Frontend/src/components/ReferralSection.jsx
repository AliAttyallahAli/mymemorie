// src/components/ReferralSection.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FaCopy, FaShare, FaWhatsapp, FaEnvelope, FaUsers, FaMoneyBillWave } from 'react-icons/fa';

const ReferralSection = ({ user }) => {
    const [referralData, setReferralData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (user) {
            fetchReferralData();
        }
    }, [user]);

    const fetchReferralData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.get('/api/referral/stats', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setReferralData(response.data);
        } catch (error) {
            console.error('Erreur chargement parrainage:', error);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success('Lien copié !');
        setTimeout(() => setCopied(false), 3000);
    };

    const shareViaWhatsApp = () => {
        const message = `🎉 Rejoignez Alkherpays avec mon code de parrainage : ${referralData?.referral_code}\n\n📱 Inscrivez-vous ici : ${referralData?.referral_link}\n\n💰 Bonus de 500 FCFA pour chaque parrainage !`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    };

    const shareViaEmail = () => {
        const subject = 'Rejoignez Alkherpays avec mon code de parrainage';
        const body = `Bonjour,\n\nRejoignez Alkherpays avec mon code de parrainage : ${referralData?.referral_code}\n\nInscrivez-vous ici : ${referralData?.referral_link}\n\nBonus de 500 FCFA pour chaque parrainage !\n\nÀ bientôt !`;
        window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    if (loading) {
        return <div className="text-center py-8">Chargement...</div>;
    }

    if (!referralData) {
        return null;
    }

    return (
        <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <FaUsers className="text-blue-500" />
                Parrainage
            </h3>

            {/* Code de parrainage */}
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600 mb-1">Votre code de parrainage</p>
                <div className="flex items-center gap-2">
                    <code className="text-2xl font-bold text-blue-600 bg-white px-4 py-2 rounded-lg border border-blue-200 flex-1 text-center">
                        {referralData.referral_code}
                    </code>
                    <button
                        onClick={() => copyToClipboard(referralData.referral_code)}
                        className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                        title="Copier le code"
                    >
                        <FaCopy />
                    </button>
                </div>
            </div>

            {/* Lien de parrainage */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600 mb-1">Lien de parrainage</p>
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={referralData.referral_link}
                        readOnly
                        className="flex-1 px-3 py-2 bg-white border rounded-lg text-sm font-mono"
                    />
                    <button
                        onClick={() => copyToClipboard(referralData.referral_link)}
                        className="p-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                        title="Copier le lien"
                    >
                        <FaCopy />
                    </button>
                </div>
            </div>

            {/* Statistiques */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">
                        {referralData.stats.total_referrals}
                    </p>
                    <p className="text-xs text-gray-600">Total parrainés</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-yellow-600">
                        {referralData.stats.active_referrals}
                    </p>
                    <p className="text-xs text-gray-600">Actifs</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">
                        {referralData.stats.total_bonus.toLocaleString()} FCFA
                    </p>
                    <p className="text-xs text-gray-600">Bonus total</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-purple-600">
                        {referralData.stats.claimed_bonus.toLocaleString()} FCFA
                    </p>
                    <p className="text-xs text-gray-600">Reçu</p>
                </div>
            </div>

            {/* Actions de partage */}
            <div className="flex gap-2">
                <button
                    onClick={shareViaWhatsApp}
                    className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 flex items-center justify-center gap-2"
                >
                    <FaWhatsapp /> WhatsApp
                </button>
                <button
                    onClick={shareViaEmail}
                    className="flex-1 bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2"
                >
                    <FaEnvelope /> Email
                </button>
                <button
                    onClick={() => copyToClipboard(referralData.referral_link)}
                    className="flex-1 bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 flex items-center justify-center gap-2"
                >
                    <FaShare /> Partager
                </button>
            </div>

            {/* Information bonus */}
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800 flex items-center gap-2">
                    <FaMoneyBillWave className="text-yellow-600" />
                    <span>💰 Gagnez <strong>500 FCFA</strong> pour chaque ami qui s'inscrit avec votre code !</span>
                </p>
            </div>
        </div>
    );
};

export default ReferralSection;