// src/components/KYCStatus.jsx
import React, { useState } from 'react';
import { 
    FaCheckCircle, FaClock, FaTimes, FaIdCard, FaShieldAlt, 
    FaArrowUp, FaStar, FaCrown, FaGem, FaSpinner 
} from 'react-icons/fa';

const KYCStatus = ({ 
    status, 
    level, 
    onVerify, 
    onUpgrade, 
    message,
    canUpgrade = false,
    userBalance = 0,
    upgradeCost = 0
}) => {
    const [upgrading, setUpgrading] = useState(false);

    const getStatusInfo = () => {
        switch(status) {
            case 'verified':
                return {
                    icon: <FaCheckCircle className="text-green-500 text-xl" />,
                    bgColor: 'bg-green-50',
                    borderColor: 'border-green-200',
                    textColor: 'text-green-700',
                    title: '✅ Compte vérifié',
                    description: `Niveau KYC: ${level || 1}`,
                    actionText: null,
                    actionColor: null,
                    levelLabel: 'Vérifié'
                };
            case 'pending':
                return {
                    icon: <FaClock className="text-yellow-500 text-xl animate-pulse" />,
                    bgColor: 'bg-yellow-50',
                    borderColor: 'border-yellow-200',
                    textColor: 'text-yellow-700',
                    title: '⏳ En attente de vérification',
                    description: 'Votre demande KYC est en cours de traitement',
                    actionText: 'Voir le statut',
                    actionColor: 'bg-yellow-600 hover:bg-yellow-700',
                    levelLabel: 'En attente'
                };
            case 'rejected':
                return {
                    icon: <FaTimes className="text-red-500 text-xl" />,
                    bgColor: 'bg-red-50',
                    borderColor: 'border-red-200',
                    textColor: 'text-red-700',
                    title: '❌ Demande rejetée',
                    description: message || 'Veuillez soumettre une nouvelle demande',
                    actionText: 'Nouvelle demande',
                    actionColor: 'bg-red-600 hover:bg-red-700',
                    levelLabel: 'Rejeté'
                };
            case 'cancelled':
                return {
                    icon: <FaTimes className="text-gray-500 text-xl" />,
                    bgColor: 'bg-gray-50',
                    borderColor: 'border-gray-200',
                    textColor: 'text-gray-700',
                    title: 'Demande annulée',
                    description: 'Vous pouvez soumettre une nouvelle demande',
                    actionText: 'Nouvelle demande',
                    actionColor: 'bg-gray-600 hover:bg-gray-700',
                    levelLabel: 'Annulé'
                };
            case 'none':
            default:
                return {
                    icon: <FaIdCard className="text-blue-500 text-xl" />,
                    bgColor: 'bg-blue-50',
                    borderColor: 'border-blue-200',
                    textColor: 'text-blue-700',
                    title: '📝 Non vérifié',
                    description: 'KYC requis pour créer une entreprise et investir',
                    actionText: 'Soumettre une demande',
                    actionColor: 'bg-blue-600 hover:bg-blue-700',
                    levelLabel: 'Non vérifié'
                };
        }
    };

    const getLevelDetails = (currentLevel) => {
        const levels = {
            0: {
                label: 'Niveau 0 - Non vérifié',
                icon: <FaIdCard className="text-gray-400" />,
                color: 'text-gray-500',
                bgColor: 'bg-gray-100',
                benefits: [
                    '❌ Pas d\'accès aux investissements',
                    '❌ Pas de création d\'entreprise',
                    '💰 Limite de transaction: 25 000 FCFA'
                ],
                upgradeTo: 1,
                upgradeCost: 0,
                required: 'Aucun'
            },
            1: {
                label: 'Niveau 1 - Vérification de base',
                icon: <FaStar className="text-yellow-500" />,
                color: 'text-yellow-600',
                bgColor: 'bg-yellow-50',
                benefits: [
                    '✅ Transferts de base',
                    '✅ Paiements de factures',
                    '💰 Limite de transaction: 100 000 FCFA',
                    '❌ Pas de création d\'entreprise',
                    '❌ Pas d\'investissement'
                ],
                upgradeTo: 2,
                upgradeCost: 1000,
                required: 'Pièce d\'identité valide'
            },
            2: {
                label: 'Niveau 2 - Vérification complète',
                icon: <FaGem className="text-blue-500" />,
                color: 'text-blue-600',
                bgColor: 'bg-blue-50',
                benefits: [
                    '✅ Toutes les transactions',
                    '✅ Création d\'entreprise',
                    '✅ Investissements',
                    '💰 Limite de transaction: 500 000 FCFA',
                    '🏢 Accès au marché des investissements'
                ],
                upgradeTo: 3,
                upgradeCost: 5000,
                required: 'Justificatif de domicile + Revenus'
            },
            3: {
                label: 'Niveau 3 - Vérification premium',
                icon: <FaCrown className="text-purple-500" />,
                color: 'text-purple-600',
                bgColor: 'bg-purple-50',
                benefits: [
                    '✅ Tous les avantages précédents',
                    '✅ Limites de transaction illimitées',
                    '✅ Accès prioritaire aux nouvelles offres',
                    '🎯 Fonctionnalités premium exclusives',
                    '💰 Limite de transaction: Illimitée'
                ],
                upgradeTo: null,
                upgradeCost: 0,
                required: '✅ Niveau maximum atteint'
            }
        };
        return levels[currentLevel] || levels[0];
    };

    const info = getStatusInfo();
    const levelDetails = getLevelDetails(level || 0);
    const isVerified = status === 'verified';
    const canUpgradeLevel = isVerified && canUpgrade && level < 3;

    const handleUpgrade = async () => {
        if (!onUpgrade) return;
        setUpgrading(true);
        try {
            await onUpgrade();
        } finally {
            setUpgrading(false);
        }
    };

    return (
        <div className={`p-4 rounded-xl border ${info.bgColor} ${info.borderColor}`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    {info.icon}
                    <div>
                        <p className={`font-semibold ${info.textColor}`}>{info.title}</p>
                        <p className="text-sm text-gray-600">{info.description}</p>
                        {status === 'verified' && level >= 2 && (
                            <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                                <FaShieldAlt className="text-green-500" />
                                ✅ Vous pouvez créer des entreprises et investir
                            </p>
                        )}
                        {status === 'verified' && level < 2 && (
                            <p className="text-xs text-yellow-600 flex items-center gap-1 mt-1">
                                ⚠️ Niveau KYC {level} - Niveau 2 requis pour créer une entreprise
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {onVerify && info.actionText && (
                        <button
                            onClick={onVerify}
                            className={`px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors ${info.actionColor}`}
                        >
                            {info.actionText}
                        </button>
                    )}
                    {status === 'verified' && (
                        <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
                            <FaCheckCircle className="text-green-600" />
                            <span className="text-sm font-medium text-green-700">Niveau {level || 1}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Détails du niveau KYC */}
            {isVerified && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                        {levelDetails.icon}
                        <span className={`font-semibold ${levelDetails.color}`}>
                            {levelDetails.label}
                        </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                            <p className="text-xs text-gray-500 font-medium mb-1">✅ Avantages</p>
                            <ul className="text-xs space-y-0.5">
                                {levelDetails.benefits.map((benefit, index) => (
                                    <li key={index} className="text-gray-600">{benefit}</li>
                                ))}
                            </ul>
                        </div>
                        
                        {canUpgradeLevel && (
                            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                                <p className="text-xs font-medium text-blue-700 mb-1">
                                    🔓 Débloquer le {levelDetails.upgradeTo && `Niveau ${levelDetails.upgradeTo}`}
                                </p>
                                <p className="text-xs text-gray-600">
                                    Coût: {levelDetails.upgradeCost.toLocaleString()} FCFA
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Requis: {levelDetails.required}
                                </p>
                                <button
                                    onClick={handleUpgrade}
                                    disabled={upgrading || userBalance < levelDetails.upgradeCost}
                                    className={`mt-2 w-full px-3 py-1.5 rounded-lg text-white text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                                        userBalance >= levelDetails.upgradeCost
                                            ? 'bg-blue-600 hover:bg-blue-700'
                                            : 'bg-gray-400 cursor-not-allowed'
                                    }`}
                                >
                                    {upgrading ? (
                                        <FaSpinner className="animate-spin" />
                                    ) : (
                                        <>
                                            <FaArrowUp size={10} />
                                            Passer au niveau supérieur
                                        </>
                                    )}
                                </button>
                                {userBalance < levelDetails.upgradeCost && (
                                    <p className="text-xs text-red-500 mt-1">
                                        Solde insuffisant: {userBalance.toLocaleString()} / {levelDetails.upgradeCost.toLocaleString()} FCFA
                                    </p>
                                )}
                            </div>
                        )}

                        {level >= 3 && (
                            <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                                <p className="text-xs font-medium text-purple-700 flex items-center gap-1">
                                    <FaCrown className="text-purple-500" />
                                    🏆 Niveau maximum atteint !
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                    Vous avez accès à toutes les fonctionnalités premium.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default KYCStatus;