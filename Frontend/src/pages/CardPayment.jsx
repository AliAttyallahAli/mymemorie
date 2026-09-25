// src/pages/CardPayment.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
    FaCreditCard, FaLock, FaCheckCircle, FaSpinner,
    FaArrowLeft, FaPrint, FaUser, FaMoneyBillWave, FaUniversity,
    FaExclamationTriangle, FaKey, FaQrcode
} from 'react-icons/fa';
import Layout from '../components/Layout';

// ✅ API_URL vide → utilise le proxy Vite
const API_URL = '';

function CardPayment({ user }) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [step, setStep] = useState(1);
    const [cardNumber, setCardNumber] = useState('');
    const [pin, setPin] = useState('');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [verifiedCard, setVerifiedCard] = useState(null);
    const [loading, setLoading] = useState(false);
    const [receipt, setReceipt] = useState(null);
    const [pinNotSet, setPinNotSet] = useState(false);

    const getToken = () => localStorage.getItem('accessToken') || localStorage.getItem('token');
    const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${getToken()}` } });

    // ============================================
    // PRÉ-REMPLIR LE NUMÉRO DEPUIS L'URL
    // ============================================
    useEffect(() => {
        const cardFromUrl = searchParams.get('card');
        if (cardFromUrl) {
            const clean = cardFromUrl.replace(/\s/g, '').replace(/\D/g, '');
            const limited = clean.slice(0, 16);
            const formatted = limited.match(/.{1,4}/g)?.join(' ') || limited;
            setCardNumber(formatted);

            toast.success('Numéro de carte pré-rempli', {
                icon: '💳',
                duration: 3000
            });
        }
    }, [searchParams]);

    const formatCardNumber = (value) => {
        const clean = value.replace(/\s/g, '').replace(/\D/g, '');
        const limited = clean.slice(0, 16);
        return limited.match(/.{1,4}/g)?.join(' ') || limited;
    };

    // ============================================
    // VÉRIFIER LA CARTE
    // ============================================
    const handleVerify = async (e) => {
        e.preventDefault();
        setPinNotSet(false);

        if (!cardNumber || cardNumber.replace(/\s/g, '').length !== 16) {
            toast.error('Numéro de carte invalide (16 chiffres)');
            return;
        }

        if (!pin || pin.length !== 4) {
            toast.error('PIN invalide (4 chiffres)');
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post(
                `${API_URL}/api/cards/verify`,
                { card_number: cardNumber, pin },
                getAuthHeaders()
            );

            if (response.data.success) {
                setVerifiedCard(response.data.card);
                toast.success('Carte vérifiée !');
                setStep(2);
            }
        } catch (error) {
            console.error('❌ Erreur:', error);

            if (error.response?.data?.needs_pin_setup) {
                setPinNotSet(true);
                toast.error('Ce client n\'a pas encore défini son PIN', { duration: 5000 });
                return;
            }

            toast.error(error.response?.data?.error || 'Carte invalide');
        } finally {
            setLoading(false);
        }
    };

    // ============================================
    // EFFECTUER LE PAIEMENT
    // ============================================
    const handlePayment = async (e) => {
        e.preventDefault();

        const amountNum = parseInt(amount);
        if (!amountNum || amountNum < 100) {
            toast.error('Montant minimum: 100 FCFA');
            return;
        }

        if (amountNum > verifiedCard.balance) {
            toast.error(`Solde insuffisant. Disponible: ${verifiedCard.balance.toLocaleString()} FCFA`);
            return;
        }

        if (amountNum > verifiedCard.daily_remaining) {
            toast.error(`Limite journalière dépassée. Restant: ${verifiedCard.daily_remaining.toLocaleString()} FCFA`);
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post(
                `${API_URL}/api/cards/pay`,
                {
                    card_number: cardNumber,
                    pin,
                    amount: amountNum,
                    description: description || 'Paiement guichet'
                },
                getAuthHeaders()
            );

            if (response.data.success) {
                setReceipt(response.data.receipt);
                toast.success('Paiement effectué !');
                setStep(3);
            }
        } catch (error) {
            console.error('❌ Erreur:', error);
            toast.error(error.response?.data?.error || 'Erreur paiement');
        } finally {
            setLoading(false);
        }
    };

    // ============================================
    // IMPRIMER LE REÇU
    // ============================================
    const handlePrintReceipt = () => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Reçu ${receipt?.receipt_number}</title>
                <meta charset="UTF-8">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; background: #f5f5f5; }
                    .receipt { max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
                    .header { text-align: center; border-bottom: 3px solid #7c3aed; padding-bottom: 20px; margin-bottom: 25px; }
                    .header h1 { color: #7c3aed; font-size: 24px; margin-bottom: 5px; }
                    .header p { color: #666; font-size: 13px; }
                    .section { margin-bottom: 20px; }
                    .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
                    .row:last-child { border-bottom: none; }
                    .label { color: #666; font-size: 14px; }
                    .value { color: #333; font-weight: 600; font-size: 14px; }
                    .total { background: linear-gradient(135deg, #f3e8ff, #e9d5ff); padding: 20px; border-radius: 12px; margin-top: 20px; text-align: center; }
                    .total-label { color: #666; margin-bottom: 8px; font-size: 13px; }
                    .total .amount { font-size: 32px; font-weight: bold; color: #7c3aed; }
                    .badge { display: inline-block; background: #16a34a; color: white; padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; }
                    .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px; }
                    .section-title { color: #7c3aed; font-size: 14px; font-weight: bold; margin-bottom: 10px; border-left: 4px solid #7c3aed; padding-left: 10px; }
                </style>
            </head>
            <body>
                <div class="receipt">
                    <div class="header">
                        <h1>💳 Reçu de Paiement</h1>
                        <p>CashPays - Carte Virtuelle</p>
                    </div>

                    <div class="section">
                        <div class="section-title">📄 INFORMATIONS GÉNÉRALES</div>
                        <div class="row"><span class="label">N° Reçu</span><strong class="value">${receipt?.receipt_number}</strong></div>
                        <div class="row"><span class="label">Date</span><span class="value">${new Date().toLocaleString('fr-FR')}</span></div>
                        <div class="row"><span class="label">Statut</span><span class="badge">PAYÉ</span></div>
                    </div>

                    <div class="section">
                        <div class="section-title">👤 TITULAIRE</div>
                        <div class="row"><span class="label">Nom</span><span class="value">${receipt?.card_holder}</span></div>
                        <div class="row"><span class="label">Carte</span><span class="value">**** ${receipt?.card_last4}</span></div>
                    </div>

                    <div class="section">
                        <div class="section-title">💰 DÉTAILS</div>
                        <div class="row"><span class="label">Description</span><span class="value">${receipt?.description || '-'}</span></div>
                        <div class="row"><span class="label">Montant</span><span class="value">${Number(receipt?.amount || 0).toLocaleString()} FCFA</span></div>
                        <div class="row"><span class="label">Frais</span><span class="value" style="color: #ea580c;">${Number(receipt?.fee || 0).toLocaleString()} FCFA</span></div>
                    </div>

                    <div class="total">
                        <div class="total-label">TOTAL ENCAISSÉ</div>
                        <div class="amount">${Number(receipt?.total_amount || 0).toLocaleString()} FCFA</div>
                    </div>

                    <div class="footer">
                        <p>✅ Paiement validé</p>
                        <p>Merci de votre confiance</p>
                        <p style="margin-top: 10px;">CashPays - GOUROUSDJA</p>
                    </div>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        setTimeout(() => window.print(), 500);
    };

    // ============================================
    // RESET
    // ============================================
    const handleReset = () => {
        setStep(1);
        setCardNumber('');
        setPin('');
        setAmount('');
        setDescription('');
        setVerifiedCard(null);
        setReceipt(null);
        setPinNotSet(false);
    };

    if (!user) return null;

    return (
        <Layout user={user}>
            <div className="max-w-3xl mx-auto p-4">

                {/* BOUTON RETOUR */}
                <button
                    onClick={() => navigate('/dashboard')}
                    className="mb-4 flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                    <FaArrowLeft /> Retour
                </button>

                {/* HEADER */}
                <div className="bg-gradient-to-r from-purple-700 to-indigo-800 rounded-2xl p-6 mb-8 shadow-lg">
                    <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                        <FaCreditCard /> Encaisser un paiement par carte
                    </h1>
                    <p className="text-purple-200">Guichet - Réception de paiement</p>
                </div>

                {/* ÉTAPES */}
                <div className="flex justify-between mb-6">
                    {[
                        { n: 1, label: 'Vérification' },
                        { n: 2, label: 'Montant' },
                        { n: 3, label: 'Reçu' }
                    ].map(s => (
                        <div key={s.n} className="flex-1 text-center">
                            <div className={`w-10 h-10 rounded-full mx-auto flex items-center justify-center font-bold transition-all ${
                                step >= s.n ? 'bg-purple-600 text-white shadow-lg' : 'bg-gray-200 text-gray-500'
                            }`}>
                                {step > s.n ? '✓' : s.n}
                            </div>
                            <p className={`text-sm mt-2 ${step >= s.n ? 'text-purple-600 font-medium' : 'text-gray-400'}`}>
                                {s.label}
                            </p>
                        </div>
                    ))}
                </div>

                {/* ============================================
                    ÉTAPE 1 : VÉRIFICATION
                ============================================ */}
                {step === 1 && (
                    <div className="bg-white rounded-2xl shadow-xl p-6">

                        {/* BANNIÈRE QR CODE */}
                        {searchParams.get('card') && (
                            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 mb-4 flex items-center gap-2">
                                <FaQrcode className="text-purple-600 text-xl" />
                                <p className="text-sm text-purple-800">
                                    Carte scannée depuis QR code. Vérifiez le numéro et demandez le PIN.
                                </p>
                            </div>
                        )}

                        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <FaCreditCard className="text-purple-600" /> Informations de la carte
                        </h2>

                        {/* ALERTE PIN NON DÉFINI */}
                        {pinNotSet && (
                            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-4 mb-4">
                                <div className="flex items-start gap-3">
                                    <FaExclamationTriangle className="text-yellow-600 text-2xl flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <h3 className="font-bold text-yellow-900 mb-1">
                                            🔐 PIN non défini
                                        </h3>
                                        <p className="text-sm text-yellow-800 mb-3">
                                            Ce client n'a pas encore défini son PIN. Il doit d'abord en créer un
                                            depuis son application CashPays avant de pouvoir payer.
                                        </p>
                                        <div className="bg-yellow-100 rounded-lg p-3 text-xs text-yellow-900">
                                            <strong>Instructions à donner au client :</strong>
                                            <ol className="list-decimal list-inside mt-1 space-y-1">
                                                <li>Ouvrir l'application CashPays</li>
                                                <li>Aller dans <strong>Ma Carte</strong></li>
                                                <li>Cliquer sur <strong>Définir mon PIN</strong></li>
                                                <li>Choisir un code à 4 chiffres</li>
                                                <li>Revenir pour payer</li>
                                            </ol>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleVerify} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Numéro de carte
                                </label>
                                <div className="relative">
                                    <FaCreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        value={cardNumber}
                                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                                        maxLength="19"
                                        placeholder="4XXX XXXX XXXX XXXX"
                                        className="w-full pl-10 pr-4 py-3 border rounded-xl font-mono text-lg focus:ring-2 focus:ring-purple-500"
                                        autoFocus
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Code PIN
                                </label>
                                <div className="relative">
                                    <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="password"
                                        inputMode="numeric"
                                        value={pin}
                                        onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                        maxLength="4"
                                        placeholder="••••"
                                        className="w-full pl-10 pr-4 py-3 border rounded-xl font-mono text-lg text-center tracking-widest focus:ring-2 focus:ring-purple-500"
                                        required
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                    <FaUser className="text-purple-500" />
                                    Le client tape son PIN lui-même
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-700 text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
                            >
                                {loading ? (
                                    <>
                                        <FaSpinner className="animate-spin" /> Vérification...
                                    </>
                                ) : (
                                    <>
                                        <FaKey /> Vérifier la carte
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Aide */}
                        <div className="mt-6 bg-blue-50 rounded-xl p-4 border border-blue-200">
                            <h4 className="text-sm font-bold text-blue-800 mb-2">💡 Rappel pour le guichet</h4>
                            <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                                <li>Demandez au client son numéro de carte</li>
                                <li>Laissez-le taper son PIN lui-même (ne le regardez pas)</li>
                                <li>Ne partagez jamais le PIN avec qui que ce soit</li>
                            </ul>
                        </div>
                    </div>
                )}

                {/* ============================================
                    ÉTAPE 2 : MONTANT
                ============================================ */}
                {step === 2 && verifiedCard && (
                    <div className="bg-white rounded-2xl shadow-xl p-6">

                        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                            <div className="flex items-center gap-3 mb-3">
                                <FaCheckCircle className="text-green-600 text-2xl" />
                                <div>
                                    <div className="font-bold text-green-800 text-lg">
                                        {verifiedCard.holder_name}
                                    </div>
                                    <div className="text-sm text-green-700">Carte vérifiée ✅</div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-green-200">
                                <div>
                                    <div className="text-xs text-green-700 mb-1">Solde disponible</div>
                                    <div className="font-bold text-green-900 text-lg">
                                        {Number(verifiedCard.balance || 0).toLocaleString()} FCFA
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-green-700 mb-1">Limite restante aujourd'hui</div>
                                    <div className="font-bold text-green-900 text-lg">
                                        {Number(verifiedCard.daily_remaining || 0).toLocaleString()} FCFA
                                    </div>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handlePayment} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Montant à débiter (FCFA)
                                </label>
                                <div className="relative">
                                    <FaMoneyBillWave className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        min="100"
                                        step="100"
                                        placeholder="10000"
                                        className="w-full pl-10 pr-4 py-3 border rounded-xl text-lg font-semibold focus:ring-2 focus:ring-purple-500"
                                        autoFocus
                                        required
                                    />
                                </div>
                                {amount && parseInt(amount) >= 100 && (
                                    <div className="text-xs text-gray-500 mt-2 space-y-1">
                                        <div>Frais de service (1%): <strong>{Math.floor(parseInt(amount) * 0.01).toLocaleString()} FCFA</strong></div>
                                        <div>Total à débiter: <strong className="text-purple-700">{parseInt(amount).toLocaleString()} FCFA</strong></div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Description (optionnel)
                                </label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500"
                                    placeholder="Ex: Achat marchandise"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="px-6 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 font-medium"
                                >
                                    Retour
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
                                >
                                    {loading ? (
                                        <>
                                            <FaSpinner className="animate-spin" /> Traitement...
                                        </>
                                    ) : (
                                        <>
                                            <FaMoneyBillWave /> Encaisser
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* ============================================
                    ÉTAPE 3 : REÇU
                ============================================ */}
                {step === 3 && receipt && (
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                        <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 text-center">
                            <FaCheckCircle className="w-16 h-16 mx-auto text-white mb-3" />
                            <h2 className="text-2xl font-bold text-white">Paiement réussi !</h2>
                            <p className="text-green-100 mt-2">Le reçu est prêt</p>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
                                <div>
                                    <div className="text-xs text-gray-500">N° Reçu</div>
                                    <div className="text-black font-mono text-sm font-semibold">{receipt.receipt_number}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500">Date</div>
                                    <div className="text-black font-medium">{new Date().toLocaleString('fr-FR')}</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-xs text-gray-500 mb-1">Titulaire</div>
                                    <div className="text-black font-medium">{receipt.card_holder}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 mb-1">Carte</div>
                                    <div className="text-black font-mono">**** {receipt.card_last4}</div>
                                </div>
                            </div>

                            <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-600">Montant</span>
                                    <span className="text-black font-medium">{Number(receipt.amount).toLocaleString()} FCFA</span>
                                </div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-600">Frais</span>
                                    <span className="text-orange-600">{Number(receipt.fee).toLocaleString()} FCFA</span>
                                </div>
                                <div className="flex justify-between pt-3 border-t border-purple-200">
                                    <span className="font-bold text-gray-800">Total encaissé</span>
                                    <span className="font-bold text-purple-700 text-xl">
                                        {Number(receipt.total_amount).toLocaleString()} FCFA
                                    </span>
                                </div>
                            </div>

                            {receipt.description && (
                                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                                    <span className="text-gray-500">Description: </span>
                                    <span className="text-gray-800">{receipt.description}</span>
                                </div>
                            )}
                        </div>
                        <div className="p-6 bg-gray-50 flex gap-3 border-t">
                            <button
                                onClick={handlePrintReceipt}
                                className="flex-1 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-100 font-medium flex items-center justify-center gap-2"
                            >
                                <FaPrint /> Imprimer
                            </button>
                            <button
                                onClick={handleReset}
                                className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-700 text-white rounded-xl font-medium shadow-lg hover:opacity-90 flex items-center justify-center gap-2"
                            >
                                <FaCreditCard /> Nouveau paiement
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}

export default CardPayment;