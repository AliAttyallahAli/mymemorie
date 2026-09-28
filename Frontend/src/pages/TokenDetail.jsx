// src/pages/TokenDetail.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    FaCoins, FaArrowLeft, FaSpinner, FaMoneyBillWave,
    FaUsers, FaChartLine, FaShoppingCart, FaTag, FaTimes,
    FaHistory, FaBox, FaCheckCircle
} from 'react-icons/fa';

const API_URL = '';

function TokenDetail({ user }) {
    const navigate = useNavigate();
    const { id } = useParams();

    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(null);
    const [sellOrders, setSellOrders] = useState([]);
    const [myHolding, setMyHolding] = useState(null);
    const [topHolders, setTopHolders] = useState([]);
    const [transactions, setTransactions] = useState([]);

    const [showBuyModal, setShowBuyModal] = useState(false);
    const [showSellModal, setShowSellModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [buyParts, setBuyParts] = useState(1);
    const [sellParts, setSellParts] = useState(1);
    const [sellPrice, setSellPrice] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    const getAuthHeaders = () => ({
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || localStorage.getItem('token')}` }
    });

    useEffect(() => {
        if (!user) { navigate('/login'); return; }
        fetchToken();
    }, [user, id]);

    const fetchToken = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_URL}/api/tokens/${id}`, getAuthHeaders());
            setToken(response.data.token);
            setSellOrders(response.data.sell_orders || []);
            setMyHolding(response.data.my_holding);
            setTopHolders(response.data.top_holders || []);
            setTransactions(response.data.transactions || []);
            setSellPrice(response.data.token?.price_per_part || 0);
        } catch (error) {
            console.error('❌ Erreur:', error);
            toast.error('Token non trouvé');
            navigate('/token-market');
        } finally {
            setLoading(false);
        }
    };

    const handleBuy = async () => {
        setSubmitting(true);
        try {
            const payload = { parts_count: buyParts };
            if (selectedOrder) payload.sell_order_id = selectedOrder.id;

            const response = await axios.post(
                `${API_URL}/api/tokens/${id}/buy`,
                payload,
                getAuthHeaders()
            );
            toast.success(response.data.message);
            setShowBuyModal(false);
            setSelectedOrder(null);
            setBuyParts(1);
            fetchToken();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Erreur');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSell = async () => {
        setSubmitting(true);
        try {
            const response = await axios.post(
                `${API_URL}/api/tokens/${id}/sell`,
                { parts_count: sellParts, price_per_part: sellPrice },
                getAuthHeaders()
            );
            toast.success(response.data.message);
            setShowSellModal(false);
            setSellParts(1);
            fetchToken();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Erreur');
        } finally {
            setSubmitting(false);
        }
    };

    if (!user || loading) {
        return (
            <div className="min-h-screen bg-[#0a192f] flex items-center justify-center">
                <FaSpinner className="animate-spin text-4xl text-yellow-500" />
            </div>
        );
    }

    if (!token) return null;

    const isCreator = token.creator_id === user?.id;
    const primaryPartsAvailable = token.parts_available;
    const buyPrice = selectedOrder
        ? selectedOrder.price_per_part
        : token.price_per_part;
    const totalBuy = buyParts * buyPrice;
    const feeBuy = Math.floor(totalBuy * 0.02);

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0a192f] to-[#1e3a5f]">
            {/* HEADER */}
            <div className="bg-gradient-to-r from-[#0a192f] to-[#1e3a5f] border-b border-blue-500/20 shadow-lg">
                <div className="container mx-auto px-4 py-6 flex justify-between items-center">
                    <button onClick={() => navigate('/token-market')} className="flex items-center gap-2 text-white hover:text-blue-300">
                        <FaArrowLeft /> Marché
                    </button>
                    <h1 className="text-xl font-bold text-white">{token.name}</h1>
                    <div className="w-20"></div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 max-w-6xl">
                {/* CARTE PRINCIPALE */}
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-700 p-6 text-white">
                        <div className="flex items-center gap-4">
                            <span className="text-6xl">{token.logo || '🪙'}</span>
                            <div className="flex-1">
                                <h1 className="text-3xl font-bold">{token.name}</h1>
                                <p className="text-purple-200 text-lg">{token.symbol}</p>
                                <div className="flex gap-4 mt-2 text-sm">
                                    <span className="bg-white/20 px-3 py-1 rounded-full">
                                        {token.category}
                                    </span>
                                    {token.location && (
                                        <span className="bg-white/20 px-3 py-1 rounded-full">📍 {token.location}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-50 rounded-xl p-4 text-center">
                            <p className="text-xs text-gray-500 mb-1">Prix/part</p>
                            <p className="text-xl font-bold text-purple-700">
                                {Number(token.price_per_part).toLocaleString()} F
                            </p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4 text-center">
                            <p className="text-xs text-gray-500 mb-1">Valorisation</p>
                            <p className="text-xl font-bold text-gray-800">
                                {Number(token.initial_valuation).toLocaleString()} F
                            </p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4 text-center">
                            <p className="text-xs text-gray-500 mb-1">Parts dispo</p>
                            <p className="text-xl font-bold text-green-600">{token.parts_available}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4 text-center">
                            <p className="text-xs text-gray-500 mb-1">Détenteurs</p>
                            <p className="text-xl font-bold text-blue-600">{topHolders.length}</p>
                        </div>
                    </div>

                    {/* Barre de progression */}
                    <div className="px-6 pb-6">
                        <div className="flex justify-between text-sm text-gray-500 mb-2">
                            <span>Progression de la vente</span>
                            <span>{token.percent_sold}% ({token.parts_sold}/{token.total_parts})</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                                className="bg-gradient-to-r from-purple-500 to-indigo-600 h-3 rounded-full"
                                style={{ width: `${token.percent_sold}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* MON HOLDING */}
                {myHolding?.parts_owned > 0 && (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl p-6 mb-6">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center gap-3">
                                <FaBox className="text-green-600 text-3xl" />
                                <div>
                                    <h3 className="font-bold text-green-900">Ma position</h3>
                                    <p className="text-sm text-green-700">
                                        {myHolding.parts_owned} parts • Investi: {Number(myHolding.total_invested).toLocaleString()} F
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowSellModal(true)}
                                    className="bg-gradient-to-r from-red-500 to-red-700 text-white px-5 py-2 rounded-xl font-semibold hover:opacity-90 flex items-center gap-2"
                                >
                                    <FaTag /> Vendre mes parts
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ACTIONS */}
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                    {/* ACHAT PRIMAIRE */}
                    {!isCreator && primaryPartsAvailable > 0 && (
                        <button
                            onClick={() => { setSelectedOrder(null); setShowBuyModal(true); }}
                            className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white p-6 rounded-2xl hover:opacity-90 transition text-left"
                        >
                            <FaShoppingCart className="text-3xl mb-2" />
                            <h3 className="text-xl font-bold">Acheter (marché primaire)</h3>
                            <p className="text-purple-200 text-sm">
                                {primaryPartsAvailable} parts disponibles à {Number(token.price_per_part).toLocaleString()} F
                            </p>
                        </button>
                    )}

                    {/* INFO si créateur */}
                    {isCreator && (
                        <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-6">
                            <FaCheckCircle className="text-blue-600 text-3xl mb-2" />
                            <h3 className="text-xl font-bold text-blue-900">Vous êtes le créateur</h3>
                            <p className="text-blue-700 text-sm">
                                Vous détenez {myHolding?.parts_owned || 0} parts. Vous pouvez les vendre sur le marché secondaire.
                            </p>
                        </div>
                    )}
                </div>

                {/* ORDRES DE VENTE (MARCHÉ SECONDAIRE) */}
                {sellOrders.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
                        <div className="bg-gradient-to-r from-orange-500 to-red-600 p-4 text-white">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <FaTag /> Marché secondaire — Parts en vente
                            </h2>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {sellOrders.map(order => (
                                <div key={order.id} className="p-4 flex items-center justify-between flex-wrap gap-3 hover:bg-gray-50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                                            <FaUsers className="text-orange-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-800">{order.seller_name || 'Vendeur'}</p>
                                            <p className="text-xs text-gray-500">
                                                {order.parts_remaining} parts à {Number(order.price_per_part).toLocaleString()} F
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <p className="text-xs text-gray-500">Total</p>
                                            <p className="font-bold text-orange-700">
                                                {Number(order.parts_remaining * order.price_per_part).toLocaleString()} F
                                            </p>
                                        </div>
                                        {order.seller_id !== user?.id && (
                                            <button
                                                onClick={() => { setSelectedOrder(order); setShowBuyModal(true); setBuyParts(1); }}
                                                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90"
                                            >
                                                Acheter
                                            </button>
                                        )}
                                        {order.seller_id === user?.id && (
                                            <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full">Ma vente</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* TOP HOLDERS */}
                {topHolders.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 text-white">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <FaUsers /> Top détenteurs
                            </h2>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {topHolders.map((h, i) => (
                                <div key={i} className="p-3 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-sm">
                                            #{i + 1}
                                        </span>
                                        <p className="font-medium text-gray-800">{h.fullname || 'Anonyme'}</p>
                                    </div>
                                    <p className="font-bold text-purple-700">{h.parts_owned} parts</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* HISTORIQUE */}
                {transactions.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                        <div className="bg-gradient-to-r from-gray-700 to-gray-900 p-4 text-white">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <FaHistory /> Historique des transactions
                            </h2>
                        </div>
                        <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                            {transactions.map((tx, i) => (
                                <div key={i} className="p-3 flex items-center justify-between text-sm">
                                    <div>
                                        <p className="font-medium text-gray-800">
                                            {tx.transaction_type === 'creation' && '🪙 Création'}
                                            {tx.transaction_type === 'primary_buy' && `📥 Achat primaire`}
                                            {tx.transaction_type === 'secondary_buy' && `🔄 Achat secondaire`}
                                            {tx.transaction_type === 'sell' && '📤 Vente'}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {tx.parts_count} parts × {Number(tx.price_per_part).toLocaleString()} F
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-gray-800">
                                            {Number(tx.total_amount).toLocaleString()} F
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {new Date(tx.created_at).toLocaleDateString('fr-FR')}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL ACHAT */}
            {showBuyModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full">
                        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-4 rounded-t-2xl text-white flex justify-between items-center">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <FaShoppingCart /> Acheter des parts
                            </h3>
                            <button onClick={() => { setShowBuyModal(false); setSelectedOrder(null); }} className="text-2xl">×</button>
                        </div>
                        <div className="p-6 space-y-4">
                            {selectedOrder ? (
                                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm text-orange-800">
                                    🔄 Achat secondaire — Vendeur: <strong>{selectedOrder.seller_name}</strong>
                                    <br />Prix: {Number(selectedOrder.price_per_part).toLocaleString()} F/part
                                </div>
                            ) : (
                                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-sm text-purple-800">
                                    📥 Achat primaire — Créateur: <strong>{token.creator_name}</strong>
                                    <br />Prix: {Number(token.price_per_part).toLocaleString()} F/part
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nombre de parts
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max={selectedOrder ? selectedOrder.parts_remaining : primaryPartsAvailable}
                                    value={buyParts}
                                    onChange={(e) => setBuyParts(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-full px-4 py-3 border rounded-xl text-black text-lg font-semibold"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Max: {selectedOrder ? selectedOrder.parts_remaining : primaryPartsAvailable} parts
                                </p>
                            </div>

                            <div className="bg-gray-500 rounded-xl p-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span>Prix unitaire</span>
                                    <span className="font-medium">{Number(buyPrice).toLocaleString()} F</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Sous-total</span>
                                    <span className="font-medium">{Number(totalBuy).toLocaleString()} F</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Frais marché (2%)</span>
                                    <span className="text-orange-600">{Number(feeBuy).toLocaleString()} F</span>
                                </div>
                                <div className="border-t pt-2 flex justify-between font-bold">
                                    <span>Total à payer</span>
                                    <span className="text-green-700 text-lg">
                                        {Number(totalBuy + feeBuy).toLocaleString()} F
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setShowBuyModal(false); setSelectedOrder(null); }}
                                    className="flex-1 px-4 py-2 border text-black rounded-lg hover:bg-red-500"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleBuy}
                                    disabled={submitting}
                                    className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {submitting ? <><FaSpinner className="animate-spin" /> Achat...</> : <><FaCheckCircle /> Confirmer</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL VENTE */}
            {showSellModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full">
                        <div className="bg-gradient-to-r from-red-500 to-red-700 p-4 rounded-t-2xl text-white flex justify-between items-center">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <FaTag /> Vendre mes parts
                            </h3>
                            <button onClick={() => setShowSellModal(false)} className="text-2xl">×</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800">
                                Vous détenez <strong>{myHolding?.parts_owned || 0} parts</strong>
                                {myHolding?.parts_listed_for_sale > 0 && (
                                    <> (dont {myHolding.parts_listed_for_sale} déjà en vente)</>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nombre de parts à vendre
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max={(myHolding?.parts_owned || 0) - (myHolding?.parts_listed_for_sale || 0)}
                                    value={sellParts}
                                    onChange={(e) => setSellParts(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-full px-4 py-3 border text-black rounded-xl"
                                />
                                <p className="text-xs text-red-500 mt-1">
                                    Max: {(myHolding?.parts_owned || 0) - (myHolding?.parts_listed_for_sale || 0)} parts
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Prix par part (FCFA)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={sellPrice}
                                    onChange={(e) => setSellPrice(parseInt(e.target.value) || 0)}
                                    className="w-full px-4 py-3 border text-black rounded-xl"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Prix de référence : {Number(token.price_per_part).toLocaleString()} F
                                </p>
                            </div>

                            <div className="bg-gray-500 rounded-xl p-4">
                                <div className="flex justify-between font-bold">
                                    <span>Montant total</span>
                                    <span className="text-red-600 text-lg">
                                        {Number(sellParts * sellPrice).toLocaleString()} F
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowSellModal(false)}
                                    className="bg-black flex-1 px-4 py-2 border rounded-lg hover:bg-gray-500"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleSell}
                                    disabled={submitting}
                                    className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-red-700 text-white rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {submitting ? <><FaSpinner className="animate-spin" /> Mise en vente...</> : <><FaTag /> Mettre en vente</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TokenDetail;