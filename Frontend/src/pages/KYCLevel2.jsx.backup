// src/pages/KYCLevel2.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';
import { 
    FaCheckCircle, FaClock, FaTimes, FaBuilding, FaIdCard,
    FaMapMarkerAlt, FaPhone, FaEnvelope, FaUpload, FaSpinner,
    FaShieldAlt, FaArrowLeft, FaCrown, FaStar, FaFileInvoice,
    FaBriefcase, FaUserTie
} from 'react-icons/fa';

const KYCLevel2 = ({ user, socket }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [kycStatus, setKycStatus] = useState(null);
    const [userData, setUserData] = useState(null);
    const [formData, setFormData] = useState({
        companyName: '',
        companyAddress: '',
        companyPhone: '',
        companyEmail: '',
        businessType: '',
        registrationNumber: '',
        taxId: '',
        position: '',
        additionalInfo: ''
    });
    const [files, setFiles] = useState({
        proofOfAddress: null,
        businessLicense: null,
        taxIdentification: null
    });
    const [filePreviews, setFilePreviews] = useState({
        proofOfAddress: null,
        businessLicense: null,
        taxIdentification: null
    });

    useEffect(() => {
        if (user) {
            checkKYCStatus();
            fetchUserData();
        }
    }, [user]);

    const checkKYCStatus = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.get('/api/kyc/status', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setKycStatus(response.data);
            console.log('📋 KYC Status:', response.data);
        } catch (error) {
            console.error('Erreur KYC:', error);
        }
    };

    const fetchUserData = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await axios.get('/api/user/me', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUserData(response.data);
            setFormData(prev => ({
                ...prev,
                companyPhone: response.data.phone || '',
                companyEmail: response.data.email || '',
                companyAddress: response.data.address || ''
            }));
        } catch (error) {
            console.error('Erreur chargement profil:', error);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e, field) => {
        const file = e.target.files[0];
        if (file) {
            setFiles({ ...files, [field]: file });
            // Prévisualisation
            const reader = new FileReader();
            reader.onloadend = () => {
                setFilePreviews({ ...filePreviews, [field]: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Vérifier que l'utilisateur a le niveau 1
        if (!kycStatus || kycStatus.level < 1) {
            toast.error('Vous devez d\'abord compléter le niveau 1 KYC');
            navigate('/kyc');
            return;
        }

        // Vérifier les champs obligatoires
        if (!formData.companyName || !formData.companyAddress) {
            toast.error('Veuillez remplir tous les champs obligatoires');
            return;
        }

        setSubmitting(true);
        try {
            const token = localStorage.getItem('accessToken');
            const formDataToSend = new FormData();
            
            // Ajouter les champs texte
            Object.keys(formData).forEach(key => {
                if (formData[key]) {
                    formDataToSend.append(key, formData[key]);
                }
            });
            
            // Ajouter les fichiers
            if (files.proofOfAddress) formDataToSend.append('proofOfAddress', files.proofOfAddress);
            if (files.businessLicense) formDataToSend.append('businessLicense', files.businessLicense);
            if (files.taxIdentification) formDataToSend.append('taxIdentification', files.taxIdentification);

            const response = await axios.post('/api/kyc/submit-level-2', formDataToSend, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data.success) {
                toast.success('Demande KYC niveau 2 soumise avec succès !');
                navigate('/profile');
            }
        } catch (error) {
            console.error('Erreur soumission:', error);
            toast.error(error.response?.data?.error || 'Erreur lors de la soumission');
        } finally {
            setSubmitting(false);
        }
    };

    // ✅ Si déjà niveau 2+
    if (kycStatus?.level >= 2 && kycStatus?.status === 'verified') {
        return (
            <Layout user={user} socket={socket}>
                <div className="container mx-auto px-4 py-8 max-w-2xl">
                    <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-8 text-center">
                        <FaCheckCircle className="text-white text-6xl mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-white">✅ Niveau KYC 2 atteint</h2>
                        <p className="text-green-100 mt-2">Votre compte est déjà vérifié niveau 2.</p>
                        <p className="text-green-200 text-sm mt-1">Vous pouvez maintenant créer des entreprises et investir.</p>
                        <button
                            onClick={() => navigate('/investments')}
                            className="mt-4 bg-white text-green-700 px-6 py-2 rounded-lg hover:bg-green-50"
                        >
                            Voir les investissements
                        </button>
                    </div>
                </div>
            </Layout>
        );
    }

    // ✅ Si demande niveau 2 en attente
    if (kycStatus?.level === 2 && kycStatus?.status === 'pending') {
        return (
            <Layout user={user} socket={socket}>
                <div className="container mx-auto px-4 py-8 max-w-2xl">
                    <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-2xl p-8 text-center">
                        <FaClock className="text-white text-6xl mx-auto mb-4 animate-pulse" />
                        <h2 className="text-2xl font-bold text-white">⏳ Demande KYC Niveau 2 en attente</h2>
                        <p className="text-yellow-100 mt-2">Votre demande de vérification niveau 2 est en cours de traitement.</p>
                        <p className="text-yellow-200 text-sm mt-1">Soumis le: {new Date(kycStatus.submitted_at).toLocaleDateString('fr-FR')}</p>
                        <p className="text-yellow-200 text-sm">Vous serez notifié une fois la vérification terminée.</p>
                        <button
                            onClick={() => navigate('/profile')}
                            className="mt-4 bg-white text-yellow-700 px-6 py-2 rounded-lg hover:bg-yellow-50"
                        >
                            Retour au profil
                        </button>
                    </div>
                </div>
            </Layout>
        );
    }

    // ✅ Si demande niveau 2 rejetée
    if (kycStatus?.level === 2 && kycStatus?.status === 'rejected') {
        return (
            <Layout user={user} socket={socket}>
                <div className="container mx-auto px-4 py-8 max-w-2xl">
                    <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-2xl p-8 text-center">
                        <FaTimes className="text-white text-6xl mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-white">❌ Demande Niveau 2 rejetée</h2>
                        {kycStatus.rejection_reason && (
                            <p className="text-red-100 mt-2">Raison: {kycStatus.rejection_reason}</p>
                        )}
                        <p className="text-red-200 text-sm mt-1">Veuillez soumettre une nouvelle demande avec des documents valides.</p>
                        <button
                            onClick={() => {
                                // Réinitialiser l'état pour nouvelle soumission
                                setKycStatus(null);
                            }}
                            className="mt-4 bg-white text-red-700 px-6 py-2 rounded-lg hover:bg-red-50"
                        >
                            Nouvelle demande
                        </button>
                    </div>
                </div>
            </Layout>
        );
    }

    // ✅ Vérifier que l'utilisateur a le niveau 1
    if (kycStatus?.level < 1) {
        return (
            <Layout user={user} socket={socket}>
                <div className="container mx-auto px-4 py-8 max-w-2xl">
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-center">
                        <FaShieldAlt className="text-white text-6xl mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-white">📝 KYC Niveau 1 requis</h2>
                        <p className="text-blue-100 mt-2">Vous devez d'abord compléter le niveau 1 KYC.</p>
                        <button
                            onClick={() => navigate('/kyc')}
                            className="mt-4 bg-white text-blue-700 px-6 py-2 rounded-lg hover:bg-blue-50"
                        >
                            Compléter le niveau 1
                        </button>
                    </div>
                </div>
            </Layout>
        );
    }

    // ✅ Formulaire KYC Niveau 2
    return (
        <Layout user={user} socket={socket}>
            <div className="container mx-auto px-4 py-8 max-w-3xl">
                {/* En-tête */}
                <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-2xl p-6 mb-8 shadow-lg">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/profile')}
                            className="text-white/80 hover:text-white"
                        >
                            <FaArrowLeft size={24} />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                                <FaCrown className="text-yellow-400" />
                                KYC Niveau 2
                                <span className="text-sm bg-yellow-500 text-black px-2 py-0.5 rounded-full">Premium</span>
                            </h1>
                            <p className="text-purple-200">Complétez votre profil pour créer des entreprises et investir</p>
                        </div>
                    </div>
                </div>

                <div className="bg-purple-600 rounded-xl shadow-lg p-6">
                    {/* Informations niveau 1 */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center gap-2 text-green-700">
                            <FaCheckCircle className="text-green-500" />
                            <span className="font-medium">✅ Niveau 1 KYC validé</span>
                            <span className="text-sm text-green-600 ml-auto">Niveau {kycStatus?.level || 1}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">Vous pouvez maintenant demander le niveau 2 pour débloquer toutes les fonctionnalités.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Informations de l'entreprise */}
                        <div className="border-b pb-4">
                            <h3 className="font-bold text-gray-700 flex items-center gap-2 mb-3">
                                <FaBuilding className="text-purple-500" />
                                Informations de l'entreprise
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nom de l'entreprise * <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="companyName"
                                        value={formData.companyName}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Secteur d'activité
                                    </label>
                                    <select
                                        name="businessType"
                                        value={formData.businessType}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                    >
                                        <option value="">Sélectionnez</option>
                                        <option value="Technologie">💻 Technologie</option>
                                        <option value="Commerce">🛒 Commerce</option>
                                        <option value="Services">🤝 Services</option>
                                        <option value="Industrie">🏭 Industrie</option>
                                        <option value="Agriculture">🌾 Agriculture</option>
                                        <option value="Santé">🏥 Santé</option>
                                        <option value="Éducation">📚 Éducation</option>
                                        <option value="Finance">💰 Finance</option>
                                        <option value="Immobilier">🏠 Immobilier</option>
                                        <option value="Transport">🚚 Transport</option>
                                        <option value="Énergie">⚡ Énergie</option>
                                        <option value="Autre">🔧 Autre</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Numéro de registre de commerce
                                    </label>
                                    <input
                                        type="text"
                                        name="registrationNumber"
                                        value={formData.registrationNumber}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                        placeholder="Ex: RC-2024-001"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Numéro d'identification fiscale (NIF)
                                    </label>
                                    <input
                                        type="text"
                                        name="taxId"
                                        value={formData.taxId}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                        placeholder="Ex: NIF-123456789"
                                    />
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Adresse de l'entreprise * <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="companyAddress"
                                    value={formData.companyAddress}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                    required
                                    placeholder="Adresse complète de l'entreprise"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Téléphone de l'entreprise
                                    </label>
                                    <input
                                        type="tel"
                                        name="companyPhone"
                                        value={formData.companyPhone}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email de l'entreprise
                                    </label>
                                    <input
                                        type="email"
                                        name="companyEmail"
                                        value={formData.companyEmail}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Poste */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Votre poste dans l'entreprise <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="position"
                                value={formData.position}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                required
                                placeholder="Ex: Directeur, Gérant, Fondateur..."
                            />
                        </div>

                        {/* Informations supplémentaires */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Informations supplémentaires
                            </label>
                            <textarea
                                name="additionalInfo"
                                value={formData.additionalInfo}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                rows="3"
                                placeholder="Toute information complémentaire sur votre entreprise..."
                            />
                        </div>

                        {/* Upload des documents */}
                        <div className="border-t pt-4 mt-4">
                            <h3 className="font-bold text-gray-700 flex items-center gap-2 mb-3">
                                <FaUpload className="text-purple-500" />
                                Documents à fournir
                            </h3>
                            <p className="text-sm text-gray-500 mb-3">Tous les documents doivent être en format PDF ou image (JPEG, PNG)</p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-purple-500 transition-colors">
                                    <input
                                        type="file"
                                        accept="image/*,.pdf"
                                        onChange={(e) => handleFileChange(e, 'proofOfAddress')}
                                        className="hidden"
                                        id="proofOfAddress"
                                    />
                                    <label htmlFor="proofOfAddress" className="cursor-pointer flex flex-col items-center gap-2">
                                        {filePreviews.proofOfAddress ? (
                                            <img src={filePreviews.proofOfAddress} alt="Justificatif" className="max-h-32 rounded" />
                                        ) : (
                                            <>
                                                <FaMapMarkerAlt className="text-purple-500 text-3xl" />
                                                <span className="text-sm text-gray-600">Justificatif de domicile</span>
                                                <span className="text-xs text-gray-400">Facture Eau/Électricité</span>
                                            </>
                                        )}
                                    </label>
                                </div>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-purple-500 transition-colors">
                                    <input
                                        type="file"
                                        accept="image/*,.pdf"
                                        onChange={(e) => handleFileChange(e, 'businessLicense')}
                                        className="hidden"
                                        id="businessLicense"
                                    />
                                    <label htmlFor="businessLicense" className="cursor-pointer flex flex-col items-center gap-2">
                                        {filePreviews.businessLicense ? (
                                            <img src={filePreviews.businessLicense} alt="Licence" className="max-h-32 rounded" />
                                        ) : (
                                            <>
                                                <FaBriefcase className="text-purple-500 text-3xl" />
                                                <span className="text-sm text-gray-600">Licence / Registre</span>
                                                <span className="text-xs text-gray-400">Registre de commerce</span>
                                            </>
                                        )}
                                    </label>
                                </div>
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-purple-500 transition-colors">
                                    <input
                                        type="file"
                                        accept="image/*,.pdf"
                                        onChange={(e) => handleFileChange(e, 'taxIdentification')}
                                        className="hidden"
                                        id="taxIdentification"
                                    />
                                    <label htmlFor="taxIdentification" className="cursor-pointer flex flex-col items-center gap-2">
                                        {filePreviews.taxIdentification ? (
                                            <img src={filePreviews.taxIdentification} alt="Taxe" className="max-h-32 rounded" />
                                        ) : (
                                            <>
                                                <FaFileInvoice className="text-purple-500 text-3xl" />
                                                <span className="text-sm text-gray-600">Attestation fiscale</span>
                                                <span className="text-xs text-gray-400">NIF / Attestation</span>
                                            </>
                                        )}
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Bénéfices niveau 2 */}
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
                            <h4 className="font-bold text-purple-700 flex items-center gap-2">
                                <FaCrown className="text-yellow-500" />
                                Bénéfices du niveau 2 KYC
                            </h4>
                            <ul className="mt-2 space-y-1 text-sm text-gray-700">
                                <li className="flex items-center gap-2">✅ <span>Créer des entreprises d'investissement</span></li>
                                <li className="flex items-center gap-2">✅ <span>Investir dans des projets</span></li>
                                <li className="flex items-center gap-2">✅ <span>Limites de transaction augmentées</span></li>
                                <li className="flex items-center gap-2">✅ <span>Accès à des offres exclusives</span></li>
                            </ul>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={() => navigate('/profile')}
                                className="flex-1 border border-gray-300 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 text-white py-2 rounded-lg hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                            >
                                {submitting ? (
                                    <FaSpinner className="animate-spin" />
                                ) : (
                                    <><FaCheckCircle /> Soumettre la demande niveau 2</>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Layout>
    );
};

export default KYCLevel2;