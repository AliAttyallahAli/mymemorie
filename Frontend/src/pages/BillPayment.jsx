// src/pages/BillPayment.jsx - Version adaptée avec le style existant
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';
import { 
  FaWater, FaBolt, FaReceipt, FaCheckCircle, FaPrint, FaHistory,
  FaSearch, FaUser, FaPhone, FaMapMarkerAlt, FaCreditCard, FaFileInvoice,
  FaCalendarAlt, FaClock, FaMoneyBillWave, FaShieldAlt,
  FaEnvelope, FaArrowLeft, FaBuilding, FaWallet, 
  FaPhoneAlt, FaUserCheck, FaTimesCircle
} from 'react-icons/fa';

const BillPayment = ({ user, socket }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('pay');
  const [selectedType, setSelectedType] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [searchMeter, setSearchMeter] = useState('');
  const [meterInfo, setMeterInfo] = useState(null);
  const [loadingMeter, setLoadingMeter] = useState(false);
  const [generatedReceipt, setGeneratedReceipt] = useState(null);
  const [userBalance, setUserBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState(null);
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    meterNumber: '',
    amount: '',
    period: '',
    invoiceNumber: '',
    accountNumber: ''
  });

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        customerName: user.fullname || user.name || '',
        customerPhone: user.phone || '',
        customerEmail: user.email || '',
        customerAddress: user.address || ''
      }));
      fetchUserBalance();
    }
    fetchCompanies();
    fetchPaymentHistory();
  }, [user]);

  const fetchUserBalance = async () => {
    setLoadingBalance(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get('/api/wallet/balance', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserBalance(response.data.balance || 0);
    } catch (error) {
      console.error('Erreur chargement solde:', error);
    } finally {
      setLoadingBalance(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get('/api/service-companies', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      if (response.data && Array.isArray(response.data)) {
        setCompanies(response.data);
      } else {
        // Données par défaut
        setCompanies([
          { id: 1, name: 'STE', type: 'water', fullName: 'Société Tchadienne des Eaux', description: "Distribution d'eau potable", logo: '💧', agent_phone: '62787301', color: 'blue', is_active: true },
          { id: 2, name: 'ZIZ', type: 'electricity', fullName: 'Électricité du Tchad', description: "Distribution d'électricité", logo: '⚡', agent_phone: '62787302', color: 'yellow', is_active: true }
        ]);
      }
    } catch (error) {
      console.error('Erreur chargement entreprises:', error);
    }
  };

  const fetchPaymentHistory = async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get('/api/bill-payments/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPaymentHistory(response.data?.payments || []);
    } catch (error) {
      console.error('Erreur historique:', error);
    }
  };

  const searchMeterInfo = async () => {
    if (!searchMeter) {
      toast.error('Veuillez entrer un numéro de compteur');
      return;
    }
    if (!selectedCompany) {
      toast.error('Veuillez d\'abord sélectionner un fournisseur');
      return;
    }

    setLoadingMeter(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post('/api/bill-payments/search-meter', {
        meter_number: searchMeter,
        company_id: selectedCompany.id
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (response.data.success) {
        setMeterInfo(response.data.data);
        setFormData(prev => ({
          ...prev,
          meterNumber: searchMeter,
          customerName: response.data.data.customer_name || prev.customerName,
          customerAddress: response.data.data.address || prev.customerAddress,
          amount: response.data.data.outstanding_amount || '',
          period: response.data.data.period || ''
        }));
        toast.success('✅ Informations du compteur trouvées');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Compteur non trouvé');
    } finally {
      setLoadingMeter(false);
    }
  };

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setSelectedCompany(null);
    setMeterInfo(null);
    setSearchMeter('');
    setTransactionStatus(null);
    setFormData(prev => ({ ...prev, meterNumber: '', amount: '', period: '', invoiceNumber: '' }));
  };

  const handleCompanySelect = (company) => {
    setSelectedCompany(company);
    setTransactionStatus(null);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setTransactionStatus(null);
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    
    if (!selectedCompany) {
      toast.error('Veuillez sélectionner une entreprise');
      return;
    }

    const amountValue = parseFloat(formData.amount);
    if (!amountValue || amountValue < 100) {
      toast.error('Montant minimum 100 FCFA');
      return;
    }
    if (!formData.meterNumber) {
      toast.error('Numéro de compteur requis');
      return;
    }

    const fee = Math.floor(amountValue * 0.015);
    const totalAmount = amountValue + fee;

    if (userBalance < totalAmount) {
      toast.error(`Solde insuffisant. Besoin de ${totalAmount.toLocaleString()} FCFA`);
      return;
    }

    setTransactionStatus('processing');
    setLoading(true);
    
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post('/api/bill-payment', {
        company_id: selectedCompany.id,
        customer_name: formData.customerName,
        customer_phone: formData.customerPhone,
        customer_email: formData.customerEmail || '',
        customer_address: formData.customerAddress || '',
        meter_number: formData.meterNumber,
        amount: amountValue,
        period: formData.period || '',
        invoice_number: formData.invoiceNumber || '',
        account_number: formData.accountNumber || ''
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (response.data.success) {
        setTransactionStatus('success');
        setGeneratedReceipt(response.data.receipt);
        toast.success(`✅ Paiement de ${amountValue.toLocaleString()} FCFA à ${selectedCompany.name} effectué avec succès !`);
        fetchUserBalance();
        fetchPaymentHistory();
        
        // Réinitialiser après 2 secondes
        setTimeout(() => {
          setTransactionStatus(null);
          setFormData(prev => ({ ...prev, meterNumber: '', amount: '', period: '', invoiceNumber: '' }));
          setMeterInfo(null);
          setSearchMeter('');
        }, 3000);
      }
    } catch (error) {
      console.error('Erreur paiement:', error);
      setTransactionStatus('error');
      toast.error(error.response?.data?.error || 'Erreur lors du paiement');
      setTimeout(() => setTransactionStatus(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReceipt = (payment) => {
    const data = payment || generatedReceipt;
    if (!data) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head><title>Reçu de paiement - ${data.company_name}</title><meta charset="UTF-8">
      <style>
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'Courier New',monospace;padding:20px;background:#f0f0f0;}
        .receipt{max-width:400px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.1);}
        .header{background:linear-gradient(135deg,#DAA520,#B8860B);color:white;padding:25px 20px;text-align:center;}
        .company-name{font-size:28px;font-weight:bold;}
        .receipt-title{font-size:14px;opacity:0.9;letter-spacing:2px;}
        .content{padding:20px;}
        .info-row{margin:12px 0;padding-bottom:8px;border-bottom:1px dashed #eee;}
        .label{font-weight:bold;display:inline-block;width:120px;font-size:12px;color:#666;}
        .value{display:inline-block;font-size:13px;font-weight:500;}
        .amount-section{background:linear-gradient(135deg,#f8f9fa,#e9ecef);padding:15px;border-radius:12px;margin:15px 0;text-align:center;}
        .amount-label{font-size:12px;color:#666;text-transform:uppercase;}
        .amount-value{font-size:32px;font-weight:bold;color:#DAA520;}
        .footer{background:#f8f9fa;padding:15px;text-align:center;font-size:10px;color:#999;border-top:1px solid #eee;}
        .status{display:inline-block;background:#4CAF50;color:white;padding:4px 12px;border-radius:20px;font-size:11px;}
        .info-box{background:#f0f7ff;padding:12px;border-radius:8px;margin:15px 0;}
        @media print{body{background:white;padding:0;}.receipt{box-shadow:none;margin:0;}button{display:none;}}
      </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header"><div class="company-name">${data.company_name}</div><div class="receipt-title">REÇU DE PAIEMENT OFFICIEL</div></div>
          <div class="content">
            <div class="info-row"><span class="label">N° Transaction:</span><span class="value">${data.receipt_number}</span></div>
            <div class="info-row"><span class="label">Date:</span><span class="value">${new Date(data.payment_date).toLocaleString()}</span></div>
            <div class="info-row"><span class="label">Statut:</span><span class="status">✓ PAYÉ</span></div>
            <div class="info-box"><div style="font-weight:bold;margin-bottom:10px;">👤 INFORMATIONS CLIENT</div>
              <div style="font-size:12px;"><strong>Nom:</strong> ${data.customer_name}</div>
              <div style="font-size:12px;"><strong>Téléphone:</strong> ${data.customer_phone}</div>
              ${data.customer_address ? `<div style="font-size:12px;"><strong>Adresse:</strong> ${data.customer_address}</div>` : ''}
            </div>
            <div class="info-box"><div style="font-weight:bold;margin-bottom:10px;">🔢 DÉTAILS DE LA FACTURE</div>
              <div style="font-size:12px;"><strong>Service:</strong> ${data.service_type === 'water' ? 'EAU' : 'ÉLECTRICITÉ'}</div>
              <div style="font-size:12px;"><strong>N° Compteur:</strong> ${data.meter_number}</div>
              ${data.period ? `<div style="font-size:12px;"><strong>Période:</strong> ${data.period}</div>` : ''}
            </div>
            <div class="amount-section"><div class="amount-label">MONTANT PAYÉ</div><div class="amount-value">${data.amount.toLocaleString()} FCFA</div></div>
          </div>
          <div class="footer"><div>Merci de votre confiance</div><div>AlkherPay - Paiement sécurisé</div></div>
        </div>
        <div style="text-align:center;margin-top:20px;">
          <button onclick="window.print()" style="padding:10px 20px;background:#DAA520;color:white;border:none;border-radius:5px;cursor:pointer;">🖨️ Imprimer</button>
          <button onclick="window.close()" style="padding:10px 20px;background:#666;color:white;border:none;border-radius:5px;cursor:pointer;">Fermer</button>
        </div>
        <script>setTimeout(()=>window.print(),500);</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleNewPayment = () => {
    setSelectedType(null);
    setSelectedCompany(null);
    setGeneratedReceipt(null);
    setMeterInfo(null);
    setSearchMeter('');
    setTransactionStatus(null);
    setFormData(prev => ({ ...prev, meterNumber: '', amount: '', period: '', invoiceNumber: '' }));
  };

  const amountValue = parseFloat(formData.amount) || 0;
  const fee = Math.floor(amountValue * 0.015);
  const totalAmount = amountValue + fee;
  const hasEnoughBalance = userBalance >= totalAmount;

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <Layout user={user} socket={socket}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Bouton de retour */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors bg-white rounded-lg shadow-sm hover:shadow-md"
        >
          <FaArrowLeft className="text-lg" />
          <span>Retour</span>
        </button>

        {/* Header avec dégradé */}
        <div className="bg-gradient-to-r from-blue-800 via-blue-700 to-blue-900 rounded-2xl p-6 mb-8 shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">💧 Paiement de Factures</h1>
              <p className="text-blue-200">Payez vos factures d'eau et d'électricité en ligne simplement et rapidement</p>
            </div>
            <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
              <p className="text-blue-200 text-xs">Votre solde</p>
              <p className="text-white font-bold text-xl">{loadingBalance ? '...' : `${userBalance.toLocaleString()} FCFA`}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200 pb-4">
          <button onClick={() => { setActiveTab('pay'); setGeneratedReceipt(null); }} className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${activeTab === 'pay' ? 'bg-blue-700 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            <FaMoneyBillWave /> Payer une facture
          </button>
          <button onClick={() => { setActiveTab('history'); setGeneratedReceipt(null); }} className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${activeTab === 'history' ? 'bg-blue-700 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            <FaHistory /> Historique
            {paymentHistory.length > 0 && <span className="ml-1 px-2 py-0.5 bg-blue-500 text-white rounded-full text-xs">{paymentHistory.length}</span>}
          </button>
        </div>

        {/* Formulaire de paiement */}
        {activeTab === 'pay' && (
          <div className="bg-blue-900/40 rounded-3xl shadow-xl overflow-hidden">
            {generatedReceipt ? (
              // Affichage du reçu
              <div className="p-8 text-center">
                <div className="inline-flex p-4 bg-green-500/20 rounded-full mb-4">
                  <FaCheckCircle className="text-green-500 text-5xl" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">✅ Paiement réussi !</h2>
                <p className="text-gray-500 mb-6">Votre paiement a été effectué avec succès</p>
                <div className="bg-gray-50 rounded-xl p-6 mb-6 max-w-md mx-auto text-left">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Reçu</span><span className="font-mono font-semibold">{generatedReceipt.receipt_number}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Fournisseur</span><span className="font-semibold">{generatedReceipt.company_name}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Montant</span><span className="font-bold text-blue-700">{generatedReceipt.amount.toLocaleString()} FCFA</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Date</span><span className="text-gray-700">{new Date(generatedReceipt.payment_date).toLocaleString()}</span></div>
                  </div>
                </div>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => handlePrintReceipt(generatedReceipt)} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                    <FaPrint /> Imprimer
                  </button>
                  <button onClick={handleNewPayment} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 flex items-center gap-2">
                    <FaMoneyBillWave /> Nouveau paiement
                  </button>
                </div>
              </div>
            ) : !selectedType ? (
              // Étape 1: Sélection du type de service
              <div className="grid md:grid-cols-2 gap-6 p-8">
                <button onClick={() => handleTypeSelect('water')} className="group bg-gradient-to-br from-blue-50 to-white rounded-2xl p-8 text-center hover:shadow-2xl transition-all border-2 border-blue-200 hover:border-blue-500">
                  <div className="w-24 h-24 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-all">
                    <FaWater className="w-12 h-12 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Facture d'Eau</h2>
                  <p className="text-gray-500">STE - Société des Eaux</p>
                  <div className="mt-4 text-sm text-gray-400">Paiement instantané • Reçu officiel</div>
                </button>
                <button onClick={() => handleTypeSelect('electricity')} className="group bg-gradient-to-br from-yellow-50 to-white rounded-2xl p-8 text-center hover:shadow-2xl transition-all border-2 border-yellow-200 hover:border-yellow-500">
                  <div className="w-24 h-24 mx-auto bg-yellow-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-yellow-200 transition-all">
                    <FaBolt className="w-12 h-12 text-yellow-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Facture d'Électricité</h2>
                  <p className="text-gray-500">ZIZ - Électricité du Tchad</p>
                  <div className="mt-4 text-sm text-gray-400">Paiement instantané • Reçu officiel</div>
                </button>
              </div>
            ) : (
              // Étape 2: Formulaire de paiement
              <div className="grid md:grid-cols-2 gap-6 p-6">
                {/* Colonne gauche - Formulaire */}
                <div>
                  <button onClick={() => handleTypeSelect(null)} className="text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-1 text-sm">
                    <FaArrowLeft size={12} /> Retour au choix du service
                  </button>
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Informations de paiement</h2>
                  
                  <form onSubmit={handleSubmitPayment} className="space-y-4">
                    {/* Sélection du fournisseur */}
                    <div>
                      <label className="block text-sm font-medium text-white mb-1">
                        <FaBuilding className="inline mr-1 text-blue-600" /> Fournisseur *
                      </label>
                      <select 
                        value={selectedCompany?.id || ''} 
                        onChange={(e) => { 
                          const company = companies.find(c => c.id === parseInt(e.target.value)); 
                          handleCompanySelect(company); 
                        }} 
                        className=" bg-blue-800/100 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Sélectionnez un fournisseur</option>
                        {companies.filter(c => c.type === selectedType && c.is_active !== false).map(company => (
                          <option key={company.id} value={company.id}>
                            {company.logo || (company.type === 'water' ? '💧' : '⚡')} {company.name} - {company.fullName}
                          </option>
                        ))}
                      </select>
                      
                      {/* Affichage de l'entreprise sélectionnée */}
                      {selectedCompany && (
                        <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                              {selectedType === 'water' ? <FaWater className="text-blue-600" /> : <FaBolt className="text-yellow-600" />}
                            </div>
                            <div>
                              <p className="font-medium text-gray-800">{selectedCompany.name}</p>
                              <p className="text-xs text-white">{selectedCompany.fullName}</p>
                              <p className="text-xs text-white">📱 {selectedCompany.agent_phone}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Recherche par compteur */}
                    <div className="bg-blue-800 rounded-xl p-4">
                      <label className="block text-sm font-medium mb-2 text-gray-700">Numéro de compteur</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={searchMeter} 
                          onChange={(e) => setSearchMeter(e.target.value)} 
                          placeholder="Entrez votre numéro de compteur" 
                          className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" 
                        />
                        <button 
                          type="button" 
                          onClick={searchMeterInfo} 
                          disabled={loadingMeter || !selectedCompany} 
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                        >
                          {loadingMeter ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <FaSearch />
                          )}
                          Rechercher
                        </button>
                      </div>
                      {meterInfo && (
                        <div className="mt-3 p-3 bg-green-50 rounded-lg text-sm">
                          <p className="font-medium text-green-700">✅ Informations trouvées</p>
                          <div className="grid grid-cols-2 gap-1 mt-1">
                            <span className="text-gray-500">Client:</span>
                            <span className="font-medium">{meterInfo.customer_name}</span>
                            <span className="text-gray-500">Montant dû:</span>
                            <span className="font-bold text-blue-700">{meterInfo.outstanding_amount?.toLocaleString()} FCFA</span>
                            <span className="text-gray-500">Période:</span>
                            <span>{meterInfo.period}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-white mb-1">Nom complet *</label>
                        <input type="text" name="customerName" value={formData.customerName} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-white mb-1">Téléphone *</label>
                        <input type="tel" name="customerPhone" value={formData.customerPhone} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-white mb-1">Email</label>
                        <input type="email" name="customerEmail" value={formData.customerEmail} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-white mb-1">Adresse</label>
                        <input type="text" name="customerAddress" value={formData.customerAddress} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-white mb-1">N° Compteur *</label>
                        <input type="text" name="meterNumber" value={formData.meterNumber} onChange={handleInputChange} placeholder="Ex: 123456789" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-white mb-1">Montant (FCFA) *</label>
                        <input type="number" name="amount" value={formData.amount} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required min="100" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-white mb-1">Période</label>
                        <input type="text" name="period" value={formData.period} onChange={handleInputChange} placeholder="Ex: Janvier 2026" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-white mb-1">N° Facture</label>
                        <input type="text" name="invoiceNumber" value={formData.invoiceNumber} onChange={handleInputChange} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={loading || !hasEnoughBalance || !selectedCompany} 
                      className="w-full bg-gradient-to-r from-blue-700 to-blue-800 text-white py-3 rounded-xl font-semibold hover:from-blue-800 hover:to-blue-900 transition-all disabled:opacity-50 shadow-md"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Traitement en cours...
                        </div>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <FaWallet /> Payer la facture {selectedCompany ? `à ${selectedCompany.name}` : ''}
                        </span>
                      )}
                    </button>
                  </form>
                </div>

                {/* Colonne droite - Récapitulatif */}
                <div className="bg-amber-400 rounded-xl p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">📋 Récapitulatif</h2>
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">Fournisseur</span>
                      <span className="font-medium text-blue-700">{selectedCompany?.name || '-'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">Service</span>
                      <span className="font-medium">{selectedType === 'water' ? '💧 EAU' : '⚡ ÉLECTRICITÉ'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">N° Compteur</span>
                      <span className="font-mono">{formData.meterNumber || '-'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">Client</span>
                      <span className="font-medium">{formData.customerName || '-'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">Montant</span>
                      <span className="font-medium">{amountValue.toLocaleString()} FCFA</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">Frais (1.5%)</span>
                      <span className="font-medium text-orange-600">{fee.toLocaleString()} FCFA</span>
                    </div>
                    <div className="flex justify-between py-3 bg-blue-50 rounded-lg px-3 -mx-3">
                      <span className="font-bold text-gray-800">Total à payer</span>
                      <span className="font-bold text-blue-700 text-xl">{totalAmount.toLocaleString()} FCFA</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600">Votre solde</span>
                      <span className={`font-bold ${userBalance >= totalAmount ? 'text-green-600' : 'text-red-600'}`}>
                        {userBalance.toLocaleString()} FCFA
                      </span>
                    </div>
                  </div>

                  {/* Statut de la transaction */}
                  {transactionStatus === 'processing' && (
                    <div className="bg-yellow-50 rounded-lg p-4 mb-4 border border-yellow-200">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-yellow-800 text-sm">Transaction en cours... Veuillez patienter.</p>
                      </div>
                    </div>
                  )}

                  {transactionStatus === 'success' && (
                    <div className="bg-green-50 rounded-lg p-4 mb-4 border border-green-200">
                      <div className="flex items-center gap-3">
                        <FaCheckCircle className="text-green-600 text-xl" />
                        <div>
                          <p className="text-green-800 font-medium">✓ Paiement réussi !</p>
                          <p className="text-green-600 text-sm">{amountValue.toLocaleString()} FCFA débités de votre compte.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {transactionStatus === 'error' && (
                    <div className="bg-red-50 rounded-lg p-4 mb-4 border border-red-200">
                      <div className="flex items-center gap-3">
                        <FaTimesCircle className="text-red-600 text-xl" />
                        <p className="text-red-800 text-sm">Erreur lors du paiement. Veuillez réessayer.</p>
                      </div>
                    </div>
                  )}

                  {!hasEnoughBalance && (
                    <div className="bg-red-50 rounded-lg p-4 mb-4 border border-red-200">
                      <p className="text-red-700 text-sm flex items-center gap-2">
                        <FaShieldAlt className="text-red-500" /> Solde insuffisant. Besoin de {(totalAmount - userBalance).toLocaleString()} FCFA supplémentaire.
                      </p>
                    </div>
                  )}

                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                    <p className="text-sm text-blue-800 flex items-start gap-2">
                      <FaShieldAlt className="mt-0.5 text-blue-500" />
                      <span>
                        <strong>ℹ️ Information</strong><br />
                        Le paiement sera effectué depuis votre wallet AlkherPay vers le compte de <strong>{selectedCompany?.name || 'l\'entreprise'}</strong>.
                        Un reçu officiel sera généré après paiement.
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Historique des paiements */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">📜 Historique des paiements de factures</h2>
              {paymentHistory.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FaReceipt className="text-5xl mx-auto mb-3 text-gray-300" />
                  <p>Aucun paiement effectué</p>
                  <button onClick={() => setActiveTab('pay')} className="mt-4 text-blue-600 hover:text-blue-800">Effectuer un paiement →</button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr className="text-left text-gray-600">
                        <th className="px-4 py-3">N° Reçu</th>
                        <th className="px-4 py-3">Fournisseur</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Client</th>
                        <th className="px-4 py-3 text-right">Montant</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {paymentHistory.map(payment => (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-mono text-blue-600">{payment.receipt_number}</td>
                          <td className="px-4 py-3 text-sm font-medium">{payment.company_name}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs ${payment.service_type === 'water' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                              {payment.service_type === 'water' ? '💧 EAU' : '⚡ ÉLECTRICITÉ'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">{payment.customer_name}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-blue-700 text-right">{payment.amount.toLocaleString()} FCFA</td>
                          <td className="px-4 py-3 text-sm">{new Date(payment.created_at).toLocaleDateString('fr-FR')}</td>
                          <td className="px-4 py-3">
                            <button 
                              onClick={() => handlePrintReceipt(payment)} 
                              className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                            >
                              <FaPrint size={12} /> Reçu
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan="4" className="px-4 py-3 font-bold text-right">Total:</td>
                        <td className="px-4 py-3 font-bold text-blue-700 text-right">{paymentHistory.reduce((sum, p) => sum + p.amount, 0).toLocaleString()} FCFA</td>
                        <td colSpan="2"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default BillPayment;