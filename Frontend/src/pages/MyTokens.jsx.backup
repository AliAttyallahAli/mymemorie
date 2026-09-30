// src/pages/MyTokens.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    FaCoins, FaArrowLeft, FaSpinner, FaBox, FaPlus,
    FaTag, FaEye, FaTrash, FaChartLine
} from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function MyTokens({ user }) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [myToken, setMyToken] = useState(null);
    const [holdings, setHoldings] = useState([]);
    const [sellOrders, setSellOrders] = useState([]);

    const getAuthHeaders = () => ({
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') || localStorage.getItem('token')}` }
    });

    useEffect(() => {
        if (!user) { navigate('/login'); return; }
        fetchData();
    }, [user]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_URL}/api/tokens/my-tokens`, getAuthHeaders());
            setMyToken(response.data.my_token);
            setHoldings(response.data.holdings || []);
            setSellOrders(response.data.sell_orders || []);
        } catch (error) {
            console.error('❌ Erreur:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelOrder = async (orderId) => {
        if (!confirm('Annuler cet ordre de vente ?')) return;
        try {
            await axios.delete(`${API_URL}/api/tokens/orders/${orderId}`, getAuthHeaders());
            toast.success('Ordre annulé');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Erreur');
        }
    };

    const totalInvested = holdings.reduce((sum, h) => sum + (h.total_invested || 0), 0);
    const totalParts = holdings.reduce((sum, h) => sum + (h.parts_owned || 0), 0);

    if (!user) return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0a192f] to-[#1e3a5f]">
            {/* HEADER */}
            <div className="bg-gradient-to-r from-[#0a192f] to-[#1e3a5f] border-b border-blue-500/20 shadow-lg">
                <div className="container mx-auto px-4 py-6 flex justify-between items-center">
                    <button onClick={() => navigate('/token-market')} className="flex items-center gap-2 text-white hover:text-blue-300">
                        <FaArrowLeft /> Marché
                    </button>
                    <h1 className="text-xl font-bold text-white flex items-center gap-2">
                        <FaBox /> Mes Tokens
                    </h1>
                    <div className="w-20"></div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 max-w-6xl">
                {loading ? (
                    <div className="text-center py-12">
                        <FaSpinner className="animate-spin text-4xl text-yellow-500 mx-auto" />
                    </div>
                ) : (
                    <>
                        {/* STATS */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="bg-white rounded-xl p-5 shadow-lg">
                                <p className="text-xs text-gray-500 mb-1">Total investi</p>
                                <p className="text-2xl font-bold text-purple-700">
                                    {totalInvested.toLocaleString()} F
                                </p>
                            </div>
                            <div className="bg-white rounded-xl p-5 shadow-lg">
                                <p className="text-xs text-gray-500 mb-1">Parts détenues</p>
                                <p className="text-2xl font-bold text-green-600">{totalParts}</p>
                            </div>
                            <div className="bg-white rounded-xl p-5 shadow-lg">
                                <p className="text-xs text-gray-500 mb-1">Ordres en vente</p>
                                <p className="text-2xl font-bold text-orange-600">{sellOrders.length}</p>
                            </div>
                        </div>

                        {/* MON TOKEN CRÉÉ */}
                        {myToken && (
                            <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
                                <div className="bg-gradient-to-r from-yellow-500 to-orange-600 p-4 text-white">
                                    <h2 className="font-bold flex items-center gap-2">
                                        <FaCoins /> Mon token créé
                                    </h2>
                                </div>
                                <div
                                    onClick={() => navigate(`/token/${myToken.id}`)}
                                    className="p-5 flex items-center gap-4 cursor-pointer hover:bg-gray-50"
                                >
                                    <span className="text-5xl">{myToken.logo || '🪙'}</span>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-lg text-gray-800">{myToken.name}</h3>
                                        <p className="text-sm text-gray-500">{myToken.symbol}</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {myToken.total_parts} parts • {Number(myToken.price_per_part).toLocaleString()} F/part
                                        </p>
                                    </div>
                                    <FaEye className="text-gray-400 text-xl" />
                                </div>
                            </div>
                        )}

                        {/* MES HOLDINGS */}
                        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
                            <div className="bg-gradient-to-r from-purple-600 to-indigo-700 p-4 text-white">
                                <h2 className="font-bold flex items-center gap-2">
                                    <FaChartLine /> Mes participations ({holdings.length})
                                </h2>
                            </div>
                            {holdings.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    <FaBox className="text-4xl mx-auto mb-2 text-gray-300" />
                                    <p>Aucune participation</p>
                                    <button
                                        onClick={() => navigate('/token-market')}
                                        className="mt-3 text-purple-600 underline"
                                    >
                                        Explorer le marché
                                    </button>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {holdings.map(h => (
                                        <div
                                            key={h.id}
                                            onClick={() => navigate(`/token/${h.token_id}`)}
                                            className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-3xl">{h.logo || '🪙'}</span>
                                                <div>
                                                    <p className="font-semibold text-gray-800">{h.name}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {h.parts_owned} parts • Investi: {Number(h.total_invested).toLocaleString()} F
                                                    </p>
                                                    {h.parts_listed_for_sale > 0 && (
                                                        <p className="text-xs text-orange-600">
                                                            {h.parts_listed_for_sale} en vente
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-purple-700">
                                                    {Number(h.parts_owned * h.price_per_part).toLocaleString()} F
                                                </p>
                                                <p className="text-xs text-gray-400">valeur actuelle</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* MES ORDRES DE VENTE */}
                        {sellOrders.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                                <div className="bg-gradient-to-r from-orange-500 to-red-600 p-4 text-white">
                                    <h2 className="font-bold flex items-center gap-2">
                                        <FaTag /> Mes ordres de vente ({sellOrders.length})
                                    </h2>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {sellOrders.map(order => (
                                        <div key={order.id} className="p-4 flex items-center justify-between">
                                            <div>
                                                <p className="font-semibold text-gray-800">{order.name}</p>
                                                <p className="text-xs text-gray-500">
                                                    {order.parts_remaining}/{order.parts_count} parts à {Number(order.price_per_part).toLocaleString()} F
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleCancelOrder(order.id)}
                                                className="text-red-600 hover:text-red-800 p-2"
                                                title="Annuler"
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default MyTokens;