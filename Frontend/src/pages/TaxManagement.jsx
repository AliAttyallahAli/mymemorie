// src/pages/TaxPayment.jsx - Version corrigée
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  FaLandmark, FaMoneyBillWave, FaReceipt, FaCheckCircle, 
  FaUser, FaPhone, FaMapMarkerAlt, FaCalendarAlt, FaBuilding,
  FaPrint, FaHistory, FaArrowLeft, FaSpinner, FaFileInvoice,
  FaStore, FaHome, FaIndustry, FaUniversity, FaInfoCircle
} from 'react-icons/fa';

const TaxPayment = ({ user }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [communes, setCommunes] = useState([]);
  const [selectedCommune, setSelectedCommune] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [formData, setFormData] = useState({
    taxpayerName: '',
    taxpayerPhone: '',
    taxpayerAddress: '',
    taxType: 'taxe_commercante',
    taxPeriod: new Date().getFullYear().toString(),
    amount: '',
    businessNumber: '',
    propertyAddress: ''
  });
  const [paymentReceipt, setPaymentReceipt] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Types de taxes par défaut (hardcodés pour éviter l'appel API)
  const taxTypes = [
    { id: 1, name: 'taxe_commercante', label: 'Taxe Commerçante', default_amount: 25000, description: 'Pour les commerçants et boutiques' },
    { id: 2, name: 'taxe_habitation', label: "Taxe d'Habitation", default_amount: 15000, description: 'Pour les résidences' },
    { id: 3, name: 'taxe_fonciere', label: 'Taxe Foncière', default_amount: 30000, description: 'Pour les terrains et propriétés' },
    { id: 4, name: 'patente', label: 'Patente', default_amount: 40000, description: 'Taxe professionnelle' },
    { id: 5, name: 'taxe_sejour', label: 'Taxe de Séjour', default_amount: 5000, description: 'Pour les hôtels et logements touristiques' }
  ];

  useEffect(() => {
    fetchCommunes();
    fetchPaymentHistory();
  }, []);

  const fetchCommunes = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      // Essayer d'abord l'endpoint des communes avec authentification
      const response = await axios.get('/api/communes', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCommunes(response.data || []);
    } catch (error) {
      console.error('Erreur chargement communes:', error);
      // Si l'API n'est pas disponible, utiliser des données par défaut
      setCommunes([
        { id: 1, name: 'Commune de N\'Djaména Centre', address: 'N\'Djaména Centre', phone: '62787301' },
        { id: 2, name: 'Commune de Mongo', address: 'Mongo', phone: '62787302' },
        { id: 3, name: 'Commune de Moundou', address: 'Moundou', phone: '62787303' },
        { id: 4, name: 'Commune de Sarh', address: 'Sarh', phone: '62787304' },
        { id: 5, name: 'Commune d\'Abéché', address: 'Abéché', phone: '62787305' }
      ]);
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get('/api/tax/payments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPaymentHistory(response.data || []);
    } catch (error) {
      console.error('Erreur chargement historique:', error);
      // Ne pas afficher d'erreur, juste un tableau vide
    }
  };

  const handleCommuneSelect = (commune) => {
    setSelectedCommune(commune);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTaxTypeChange = (e) => {
    const taxTypeName = e.target.value;
    const selected = taxTypes.find(t => t.name === taxTypeName);
    setFormData(prev => ({
      ...prev,
      taxType: taxTypeName,
      amount: selected?.default_amount || ''
    }));
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    
    if (!selectedCommune) {
      toast.error('Veuillez sélectionner une commune');
      return;
    }

    const amountNum = parseFloat(formData.amount);
    if (isNaN(amountNum) || amountNum < 100) {
      toast.error('Le montant minimum est de 100 FCFA');
      return;
    }

    if (!formData.taxpayerName) {
      toast.error('Nom du contribuable requis');
      return;
    }

    if (!formData.taxpayerPhone) {
      toast.error('Téléphone requis');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('accessToken');
      
      const paymentData = {
        commune_id: selectedCommune.id,
        taxpayer_name: formData.taxpayerName,
        taxpayer_phone: formData.taxpayerPhone,
        taxpayer_address: formData.taxpayerAddress,
        business_number: formData.businessNumber,
        property_address: formData.propertyAddress,
        tax_type: formData.taxType,
        tax_period: formData.taxPeriod,
        amount: amountNum,
        notes: `Paiement ${getTaxTypeLabel(formData.taxType)} - ${formData.taxPeriod}`
      };

      const response = await axios.post('/api/tax/pay', paymentData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setPaymentReceipt({
          ...response.data.receipt,
          taxpayer_name: formData.taxpayerName,
          taxpayer_phone: formData.taxpayerPhone,
          tax_type: formData.taxType,
          tax_period: formData.taxPeriod,
          amount: amountNum
        });
        toast.success('Paiement effectué avec succès !');
        setStep(3);
        fetchPaymentHistory();
      }
    } catch (error) {
      console.error('Erreur paiement:', error);
      toast.error(error.response?.data?.error || 'Erreur lors du paiement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintReceipt = () => {
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reçu de paiement d'impôt - ${paymentReceipt?.receipt_number || 'Taxe'}</title>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; background: #0a192f; }
          .receipt-container { max-width: 800px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; }
          .receipt-header { background: linear-gradient(135deg, #1e3a5f 0%, #0a192f 100%); color: white; padding: 30px; text-align: center; }
          .receipt-header h1 { font-size: 28px; margin-bottom: 10px; }
          .receipt-body { padding: 30px; }
          .info-section { margin-bottom: 25px; border-bottom: 1px solid #e0e0e0; padding-bottom: 20px; }
          .info-title { font-size: 18px; font-weight: bold; color: #1e3a5f; margin-bottom: 15px; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
          .info-label { font-weight: 600; color: #666; }
          .info-value { color: #333; }
          .amount-row { background: #e8f0fe; padding: 15px; border-radius: 12px; margin-top: 20px; }
          .total-amount { font-size: 24px; font-weight: bold; color: #1e3a5f; text-align: right; }
          .receipt-footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #999; }
          .status-badge { display: inline-block; background: #4CAF50; color: white; padding: 5px 15px; border-radius: 20px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="receipt-header">
            <h1>🏦 CashPays</h1>
            <p>Reçu de paiement d'impôt</p>
          </div>
          <div class="receipt-body">
            <div class="info-section">
              <div class="info-title">📄 INFORMATIONS GÉNÉRALES</div>
              <div class="info-row"><span class="info-label">N° Reçu:</span><span class="info-value">${paymentReceipt?.receipt_number || 'N/A'}</span></div>
              <div class="info-row"><span class="info-label">Date:</span><span class="info-value">${new Date().toLocaleString('fr-FR')}</span></div>
              <div class="info-row"><span class="info-label">Statut:</span><span class="status-badge">PAYÉ</span></div>
            </div>
            <div class="info-section">
              <div class="info-title">🏛️ COMMUNE</div>
              <div class="info-row"><span class="info-label">Commune:</span><span class="info-value">${selectedCommune?.name || 'N/A'}</span></div>
              <div class="info-row"><span class="info-label">Adresse:</span><span class="info-value">${selectedCommune?.address || 'N/A'}</span></div>
            </div>
            <div class="info-section">
              <div class="info-title">👤 CONTRIBUABLE</div>
              <div class="info-row"><span class="info-label">Nom:</span><span class="info-value">${formData.taxpayerName}</span></div>
              <div class="info-row"><span class="info-label">Téléphone:</span><span class="info-value">${formData.taxpayerPhone}</span></div>
            </div>
            <div class="info-section">
              <div class="info-title">💰 DÉTAIL DU PAIEMENT</div>
              <div class="info-row"><span class="info-label">Type:</span><span class="info-value">${getTaxTypeLabel(formData.taxType)}</span></div>
              <div class="info-row"><span class="info-label">Période:</span><span class="info-value">${formData.taxPeriod}</span></div>
              <div class="info-row"><span class="info-label">Montant:</span><span class="info-value">${parseInt(formData.amount).toLocaleString()} FCFA</span></div>
            </div>
            <div class="amount-row">
              <div class="total-amount">Total payé: ${parseInt(formData.amount).toLocaleString()} FCFA</div>
            </div>
          </div>
          <div class="receipt-footer">
            <p>Merci de votre paiement !</p>
            <p>CashPays - Solution de paiement sécurisée</p>
          </div>
        </div>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
  };

  const handleNewPayment = () => {
    setStep(1);
    setSelectedCommune(null);
    setPaymentReceipt(null);
    setFormData({
      taxpayerName: user?.fullname || user?.name || '',
      taxpayerPhone: user?.phone || '',
      taxpayerAddress: user?.address || '',
      taxType: 'taxe_commercante',
      taxPeriod: new Date().getFullYear().toString(),
      amount: '',
      businessNumber: '',
      propertyAddress: ''
    });
  };

  const getTaxTypeLabel = (type) => {
    const tax = taxTypes.find(t => t.name === type);
    return tax?.label || type;
  };

  const getTaxTypeIcon = (type) => {
    const icons = {
      'taxe_commercante': <FaStore />,
      'taxe_habitation': <FaHome />,
      'taxe_fonciere': <FaLandmark />,
      'patente': <FaIndustry />,
      'taxe_sejour': <FaHotelIcon />
    };
    return icons[type] || <FaFileInvoice />;
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a192f] to-[#1e3a5f]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0a192f] to-[#1e3a5f] shadow-lg border-b border-blue-500/20">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-white hover:text-blue-300 transition"
            >
              <FaArrowLeft /> Retour
            </button>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white">Paiement Impôts & Taxes</h1>
              <p className="text-blue-300 text-sm">Paiement sécurisé</p>
            </div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 text-white px-4 py-2 rounded-lg transition"
            >
              <FaHistory /> Historique
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex justify-between">
              {[
                { step: 1, label: 'Commune', icon: <FaBuilding /> },
                { step: 2, label: 'Formulaire', icon: <FaFileInvoice /> },
                { step: 3, label: 'Confirmation', icon: <FaCheckCircle /> }
              ].map((s) => (
                <div key={s.step} className="flex-1 text-center">
                  <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center text-xl transition-all ${
                    step >= s.step 
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg' 
                      : 'bg-gray-300 text-gray-500'
                  }`}>
                    {step > s.step ? '✓' : s.icon}
                  </div>
                  <p className={`text-sm mt-2 font-medium ${step >= s.step ? 'text-blue-400' : 'text-gray-400'}`}>
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
            <div className="relative mt-4">
              <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-300 -translate-y-1/2 rounded-full">
                <div 
                  className="h-full bg-gradient-to-r from-blue-600 to-blue-700 rounded-full transition-all duration-500"
                  style={{ width: `${((step - 1) / 2) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Étape 1: Sélection de la commune */}
          {step === 1 && (
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-[#0a192f] to-[#1e3a5f] p-6">
                <h2 className="text-xl font-bold text-white">Sélectionnez votre commune</h2>
                <p className="text-blue-300 text-sm">Choisissez la commune où vous payez vos impôts</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {communes.map(commune => (
                    <button
                      key={commune.id}
                      onClick={() => {
                        setSelectedCommune(commune);
                        setStep(2);
                      }}
                      className="p-4 border-2 rounded-xl text-left hover:border-blue-500 hover:bg-blue-50 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <FaUniversity className="text-blue-600 text-2xl group-hover:scale-110 transition" />
                        <div>
                          <h3 className="font-bold text-gray-800">{commune.name}</h3>
                          <p className="text-sm text-gray-500">{commune.address}</p>
                          {commune.phone && (
                            <p className="text-xs text-gray-400 mt-1">📞 {commune.phone}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Étape 2: Formulaire */}
          {step === 2 && selectedCommune && (
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-[#0a192f] to-[#1e3a5f] p-6">
                <h2 className="text-xl font-bold text-white">Paiement à {selectedCommune.name}</h2>
                <p className="text-blue-300 text-sm">Remplissez les informations ci-dessous</p>
              </div>
              <div className="p-6">
                <form onSubmit={handleSubmitPayment}>
                  <div className="grid md:grid-cols-2 gap-5">
                    <div className="md:col-span-2">
                      <div className="bg-blue-50 p-4 rounded-xl mb-4 border border-blue-200">
                        <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                          <FaInfoCircle /> Informations du contribuable
                        </h3>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nom complet <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          name="taxpayerName"
                          value={formData.taxpayerName}
                          onChange={handleInputChange}
                          className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                          placeholder="Nom complet"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Téléphone <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="tel"
                          name="taxpayerPhone"
                          value={formData.taxpayerPhone}
                          onChange={handleInputChange}
                          className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                          placeholder="Ex: 62787307"
                          required
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Adresse
                      </label>
                      <div className="relative">
                        <FaMapMarkerAlt className="absolute left-3 top-4 text-gray-400" />
                        <textarea
                          name="taxpayerAddress"
                          value={formData.taxpayerAddress}
                          onChange={handleInputChange}
                          rows="2"
                          className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                          placeholder="Adresse complète"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <div className="bg-blue-50 p-4 rounded-xl mb-4 border border-blue-200">
                        <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                          <FaFileInvoice /> Détails de la taxe
                        </h3>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Type de taxe <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="taxType"
                        value={formData.taxType}
                        onChange={handleTaxTypeChange}
                        className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                      >
                        {taxTypes.map(type => (
                          <option key={type.id} value={type.name}>
                            {type.label} - {type.default_amount.toLocaleString()} FCFA
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        {taxTypes.find(t => t.name === formData.taxType)?.description}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Période <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          name="taxPeriod"
                          value={formData.taxPeriod}
                          onChange={handleInputChange}
                          className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                          placeholder="Ex: 2026"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Montant (FCFA) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <FaMoneyBillWave className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="number"
                          name="amount"
                          value={formData.amount}
                          onChange={handleInputChange}
                          className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                          placeholder="Montant à payer"
                          min="100"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Numéro de commerce
                      </label>
                      <input
                        type="text"
                        name="businessNumber"
                        value={formData.businessNumber}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        placeholder="Optionnel"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Adresse de la propriété
                      </label>
                      <textarea
                        name="propertyAddress"
                        value={formData.propertyAddress}
                        onChange={handleInputChange}
                        rows="2"
                        className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        placeholder="Optionnel"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 mt-8">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="px-6 py-3 border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition font-medium"
                    >
                      Retour
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-gradient-to-r from-blue-700 to-blue-800 text-white py-3 rounded-xl hover:from-blue-800 hover:to-blue-900 transition font-medium flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg"
                    >
                      {isSubmitting ? (
                        <><FaSpinner className="animate-spin" /> Traitement...</>
                      ) : (
                        <><FaMoneyBillWave /> Payer maintenant</>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Étape 3: Confirmation */}
          {step === 3 && paymentReceipt && (
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 text-center">
                <FaCheckCircle className="w-20 h-20 mx-auto text-white mb-4" />
                <h2 className="text-2xl font-bold text-white">Paiement réussi !</h2>
                <p className="text-green-100 mt-2">Votre transaction a été effectuée avec succès</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="text-xs text-gray-500">N° Reçu</p>
                      <p className="font-mono text-sm font-semibold">{paymentReceipt.receipt_number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Date</p>
                      <p className="font-medium">{new Date().toLocaleString('fr-FR')}</p>
                    </div>
                  </div>

                  <div className="border-l-4 border-blue-700 pl-4">
                    <p className="text-sm text-gray-500">Commune</p>
                    <p className="font-bold text-lg">{selectedCommune?.name}</p>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                    <p className="text-sm text-gray-500 mb-2">Contribuable</p>
                    <p className="font-medium">{formData.taxpayerName}</p>
                    <p className="text-sm text-gray-600">{formData.taxpayerPhone}</p>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Type de taxe:</span>
                      <span className="font-medium">{getTaxTypeLabel(formData.taxType)}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Période:</span>
                      <span className="font-medium">{formData.taxPeriod}</span>
                    </div>
                    <div className="border-t border-blue-200 pt-2 mt-2">
                      <div className="flex justify-between font-bold">
                        <span>Montant payé:</span>
                        <span className="text-blue-800 text-xl">{parseInt(formData.amount).toLocaleString()} FCFA</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-gray-50 flex gap-4 border-t">
                <button
                  onClick={handlePrintReceipt}
                  className="flex-1 border-2 border-gray-300 py-3 rounded-xl hover:bg-gray-100 transition font-medium flex items-center justify-center gap-2"
                >
                  <FaPrint /> Imprimer
                </button>
                <button
                  onClick={handleNewPayment}
                  className="flex-1 bg-gradient-to-r from-blue-700 to-blue-800 text-white py-3 rounded-xl hover:from-blue-800 hover:to-blue-900 transition font-medium"
                >
                  Nouveau paiement
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Historique */}
      {showHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-700 to-blue-800 p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FaHistory /> Historique des paiements
              </h2>
              <button onClick={() => setShowHistory(false)} className="text-white hover:text-blue-200 text-2xl">×</button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
              {paymentHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FaReceipt className="w-16 h-16 mx-auto text-gray-300 mb-3" />
                  <p>Aucun paiement effectué</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {paymentHistory.map((payment) => (
                    <div key={payment.id} className="border rounded-xl p-4 hover:shadow-md transition">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{getTaxTypeLabel(payment.tax_type)}</p>
                          <p className="text-xs text-gray-400 mt-1">Reçu: {payment.receipt_number}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-blue-700">{payment.amount?.toLocaleString()} FCFA</p>
                          <p className="text-xs text-gray-500">{new Date(payment.created_at).toLocaleDateString('fr-FR')}</p>
                          <p className="text-xs text-green-600 mt-1">✓ Payé</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Composant d'icône pour l'hôtel (si FaHotelIcon n'existe pas)
const FaHotelIcon = () => <span>🏨</span>;

export default TaxPayment;