// src/pages/TokenMarket.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
    FaCoins, FaPlus, FaSearch, FaChartLine, FaSpinner,
    FaArrowLeft, FaHome, FaEye, FaUser, FaBox,
    FaBuilding, FaMapMarkerAlt, FaMoneyBillWave
} from 'react-icons/fa';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function TokenMarket({ user }) {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [tokens, setTokens] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [myToken, setMyToken] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        symbol: '',
        description: '',
        logo: '🪙',
        category: 'autre',
        asset_type: '',
        location: '',
        total_parts: 100,
        price_per_part: 5000,
        initial_valuation: 0
    });
    const [submitting, setSubmitting] = useState(false);

    const getToken = () => localStorage.getItem('accessToken') || localStorage.getItem('token');
    const getAuthHeaders = () => ({ headers: { Authorization: `Bearer ${getToken()}` } });

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }
        fetchTokens();
        fetchMyToken();
    }, [user]);

    useEffect(() => {
        let result = [...tokens];
        if (searchTerm) {
            result = result.filter(t =>
                t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.symbol?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.creator_name?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }
        if (filterCategory !== 'all') {
            result = result.filter(t => t.category === filterCategory);
        }
        setFiltered(result);
    }, [searchTerm, filterCategory, tokens]);

    const fetchTokens = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_URL}/api/tokens`, getAuthHeaders());
            setTokens(response.data.tokens || []);
            setFiltered(response.data.tokens || []);
        } catch (error) {
            console.error('❌ Erreur:', error);
            toast.error('Erreur chargement');
        } finally {
            setLoading(false);
        }
    };

    const fetchMyToken = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/tokens/my-tokens`, getAuthHeaders());
            setMyToken(response.data.my_token || null);
        } catch (error) {
            console.error('❌ Erreur:', error);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.symbol) {
            toast.error('Nom et symbole requis');
            return;
        }
        if (formData.total_parts < 10) {
            toast.error('Minimum 10 parts');
            return;
        }
        if (formData.price_per_part < 100) {
            toast.error('Prix minimum: 100 FCFA');
            return;
        }

        setSubmitting(true);
        try {
            const response = await axios.post(
                `${API_URL}/api/tokens/create`,
                formData,
                getAuthHeaders()
            );
            toast.success('🪙 Token créé avec succès !');
            setShowCreateModal(false);
            fetchTokens();
            fetchMyToken();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Erreur');
        } finally {
            setSubmitting(false);
        }
    };

    const valuation = formData.initial_valuation || (formData.total_parts * formData.price_per_part);
    const creationFee = Math.floor(valuation * 0.05);

    const categories = [
        { value: 'all', label: 'Tous' },
        { value: 'immobilier', label: '🏠 Immobilier' },
        { value: 'entreprise', label: '🏢 Entreprise' },
        { value: 'commerce', label: '🛒 Commerce' },
        { value: 'agriculture', label: '🌾 Agriculture' },
        { value: 'autre', label: '📦 Autre' }
    ];

    if (!user) return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0a192f] to-[#1e3a5f]">
            {/* HEADER */}
            <div className="bg-gradient-to-r from-[#0a192f] to-[#1e3a5f] shadow-lg border-b border-blue-500/20">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-white hover:text-blue-300">
                            <FaArrowLeft /> Retour
                        </button>
                        <div className="text-center">
                            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                                🪙 Marché des Tokens
                            </h1>
                            <p className="text-blue-300 text-sm">Investissez dans des biens tokenisés</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => navigate('/my-tokens')}
                                className="flex items-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 text-white px-4 py-2 rounded-lg"
                            >
                                <FaBox /> Mes tokens
                            </button>
                            {!myToken && (
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="flex items-center gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-2 rounded-lg font-semibold hover:opacity-90"
                                >
                                    <FaPlus /> Créer un token
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 max-w-7xl">
                {/* INFO : 1 token max */}
                {myToken && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
                        <FaCoins className="text-yellow-400 text-xl mt-1" />
                        <div>
                            <p className="text-yellow-300 font-semibold">Vous avez déjà créé un token</p>
                            <p className="text-yellow-400/70 text-sm">
                                Vous ne pouvez créer qu'un seul token. Vous pouvez toujours acheter/vendre des parts d'autres tokens.
                            </p>
                        </div>
                    </div>
                )}

                {/* FILTRES */}
                <div className="bg-blue-950/90 rounded-xl p-4 mb-6 flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-[250px]">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Rechercher un token..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-blue-900 border border-blue-700 text-white rounded-xl focus:ring-2 focus:ring-yellow-500"
                        />
                    </div>
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="px-4 py-2 bg-blue-900 border border-blue-700 text-white rounded-xl"
                    >
                        {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                </div>

                {/* LISTE */}
                {loading ? (
                    <div className="text-center py-12">
                        <FaSpinner className="animate-spin text-4xl text-yellow-500 mx-auto" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <FaCoins className="text-5xl mx-auto mb-3" />
                        <p>Aucun token disponible</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filtered.map(token => (
                            <div
                                key={token.id}
                                onClick={() => navigate(`/token/${token.id}`)}
                                className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition cursor-pointer"
                            >
                                <div className="bg-gradient-to-r from-purple-600 to-indigo-700 p-4 text-white">
                                    <div className="flex items-center gap-3">
                                        <span className="text-4xl">{token.logo || '🪙'}</span>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-lg">{token.name}</h3>
                                            <p className="text-sm opacity-80">{token.symbol}</p>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                                            token.status === 'active' ? 'bg-green-500' : 'bg-gray-500'
                                        }`}>{token.status}</span>
                                    </div>
                                </div>
                                <div className="p-4 space-y-3">
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <p className="text-gray-500">Prix/part</p>
                                            <p className="font-bold text-purple-700">
                                                {Number(token.price_per_part).toLocaleString()} F
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Valuation</p>
                                            <p className="font-bold text-gray-800">
                                                {Number(token.initial_valuation).toLocaleString()} F
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Parts dispo</p>
                                            <p className="font-bold text-green-600">{token.parts_available}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500">Détenteurs</p>
                                            <p className="font-bold text-blue-600">{token.holders_count || 0}</p>
                                        </div>
                                    </div>

                                    {/* Barre de progression */}
                                    <div>
                                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                                            <span>Vendu</span>
                                            <span>{token.percent_sold}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-gradient-to-r from-purple-500 to-indigo-600 h-2 rounded-full"
                                                style={{ width: `${token.percent_sold}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    {token.my_holding?.parts_owned > 0 && (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-xs text-green-800">
                                            ✅ Vous détenez {token.my_holding.parts_owned} parts
                                        </div>
                                    )}

                                    <button className="w-full bg-gradient-to-r from-purple-600 to-indigo-700 text-white py-2 rounded-lg font-semibold hover:opacity-90">
                                        Voir les détails
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* MODAL CRÉATION */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-purple-700 rounded-2xl max-w-2xl w-full my-8">
                        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 p-5 text-white flex justify-between items-center rounded-t-2xl">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <FaCoins /> Créer un token
                            </h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-2xl">×</button>
                        </div>

                        <form onSubmit={handleCreate} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            {/* Alerte 1 seul token */}
                            <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-3 text-sm text-yellow-800">
                                ⚠️ Vous ne pouvez créer qu'<strong>UN SEUL token</strong>. Les frais de création sont de <strong>5%</strong> de la valorisation totale.
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-70 mb-1">Nom du token *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-purple-500"
                                        placeholder="Ex: Villa N'Djamena"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-70 mb-1">Symbole *</label>
                                    <input
                                        type="text"
                                        value={formData.symbol}
                                        onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                                        maxLength={6}
                                        className="w-full px-4 py-2 border rounded-xl uppercase"
                                        placeholder="VIL"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-70 mb-1">Emoji / Logo</label>
                                    <input
                                        type="text"
                                        value={formData.logo}
                                        onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                                        maxLength={2}
                                        className="w-full px-4 py-2 border rounded-xl text-center text-2xl"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-70 mb-1">Catégorie</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="bg-purple-700 w-full px-4 py-2 border rounded-xl"
                                    >
                                        <option value="immobilier">🏠 Immobilier</option>
                                        <option value="entreprise">🏢 Entreprise</option>
                                        <option value="commerce">🛒 Commerce</option>
                                        <option value="agriculture">🌾 Agriculture</option>
                                        <option value="autre">📦 Autre</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-70 mb-1">Localisation</label>
                                    <input
                                        type="text"
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        className="w-full px-4 py-2 border rounded-xl"
                                        placeholder="N'Djamena"
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-white mb-1">Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows="3"
                                        className="w-full px-4 py-2 border rounded-xl"
                                        placeholder="Décrivez votre bien..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-70 mb-1">Nombre de parts *</label>
                                    <input
                                        type="number"
                                        value={formData.total_parts}
                                        onChange={(e) => setFormData({ ...formData, total_parts: parseInt(e.target.value) || 0 })}
                                        min="10"
                                        className="w-full px-4 py-2 border rounded-xl"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-70 mb-1">Prix par part (FCFA) *</label>
                                    <input
                                        type="number"
                                        value={formData.price_per_part}
                                        onChange={(e) => setFormData({ ...formData, price_per_part: parseInt(e.target.value) || 0 })}
                                        min="100"
                                        className="w-full px-4 py-2 border rounded-xl"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Récap */}
                            <div className="bg-purple-500 rounded-xl p-4 border border-purple-200">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-600">Valorisation totale</span>
                                    <span className="font-bold">{valuation.toLocaleString()} FCFA</span>
                                </div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-600">Frais de création (5%)</span>
                                    <span className="font-bold text-orange-600">{creationFee.toLocaleString()} FCFA</span>
                                </div>
                                <div className="border-t border-purple-200 pt-2 flex justify-between">
                                    <span className="font-bold">À payer</span>
                                    <span className="font-bold text-purple-700 text-lg">{creationFee.toLocaleString()} FCFA</span>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-red-500"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-700 text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {submitting ? <><FaSpinner className="animate-spin" /> Création...</> : <><FaCoins /> Créer le token</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TokenMarket;