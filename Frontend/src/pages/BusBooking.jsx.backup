// src/pages/BusBooking.jsx - Version complète avec vérification de solde et paiement immédiat
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';
import {
  FaBus, FaSearch, FaCalendarAlt, FaMapMarkerAlt, FaClock,
  FaUser, FaPhone, FaEnvelope, FaMoneyBillWave, FaCheckCircle,
  FaTimes, FaArrowLeft, FaTicketAlt, FaUsers, FaInfoCircle,
  FaPrint, FaDownload, FaWhatsapp, FaShare, FaEye,
  FaHistory, FaBuilding, FaStar, FaRegStar, FaWallet
} from 'react-icons/fa';

const BusBooking = ({ user, socket }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checkingBalance, setCheckingBalance] = useState(false);
  const [trips, setTrips] = useState([]);
  const [filteredTrips, setFilteredTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);
  const [userBookings, setUserBookings] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [balanceCheck, setBalanceCheck] = useState(null);
  const [searchFilters, setSearchFilters] = useState({
    departure: '',
    destination: '',
    date: ''
  });
  const [bookingForm, setBookingForm] = useState({
    passenger_name: '',
    passenger_phone: '',
    passenger_email: '',
    seat_count: 1
  });
  const [agencies, setAgencies] = useState([]);

  useEffect(() => {
    if (user) {
      fetchTrips();
      fetchUserBookings();
      fetchAgencies();
      fetchUserBalance();
    }
  }, [user]);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get('/api/trips', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const tripsData = Array.isArray(response.data) ? response.data : 
                       (response.data?.trips ? response.data.trips : []);
      
      setTrips(tripsData);
      setFilteredTrips(tripsData);
    } catch (error) {
      console.error('Erreur chargement trajets:', error);
      toast.error('Erreur lors du chargement des trajets');
      setTrips([]);
      setFilteredTrips([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserBookings = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get('/api/user/bookings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const bookingsData = Array.isArray(response.data) ? response.data : 
                          (response.data?.bookings ? response.data.bookings : []);
      setUserBookings(bookingsData);
    } catch (error) {
      console.error('Erreur chargement réservations:', error);
      setUserBookings([]);
    }
  };

  const fetchAgencies = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get('/api/travel-agencies', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const agenciesData = Array.isArray(response.data) ? response.data : 
                          (response.data?.agencies ? response.data.agencies : []);
      setAgencies(agenciesData);
    } catch (error) {
      console.error('Erreur chargement agences:', error);
      setAgencies([]);
    }
  };

  const fetchUserBalance = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get('/api/wallet/balance', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserBalance(response.data.balance || 0);
    } catch (error) {
      console.error('Erreur chargement solde:', error);
      setUserBalance(0);
    }
  };

  const checkBalanceBeforeBooking = async (tripId, seatCount) => {
    setCheckingBalance(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`/api/bookings/check-balance?trip_id=${tripId}&seat_count=${seatCount}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBalanceCheck(response.data);
      return response.data;
    } catch (error) {
      console.error('Erreur vérification solde:', error);
      return null;
    } finally {
      setCheckingBalance(false);
    }
  };

  const handleSearch = () => {
    const tripsArray = Array.isArray(trips) ? trips : [];
    let filtered = [...tripsArray];
    
    if (searchFilters.departure) {
      filtered = filtered.filter(t => 
        t.departure_city?.toLowerCase().includes(searchFilters.departure.toLowerCase())
      );
    }
    if (searchFilters.destination) {
      filtered = filtered.filter(t => 
        t.destination_city?.toLowerCase().includes(searchFilters.destination.toLowerCase())
      );
    }
    if (searchFilters.date) {
      filtered = filtered.filter(t => t.departure_date === searchFilters.date);
    }
    
    setFilteredTrips(filtered);
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    
    if (!selectedTrip) {
      toast.error('Veuillez sélectionner un trajet');
      return;
    }

    const seatCount = parseInt(bookingForm.seat_count);
    if (seatCount < 1 || seatCount > (selectedTrip.available_seats || 0)) {
      toast.error(`Veuillez choisir entre 1 et ${selectedTrip.available_seats || 0} places`);
      return;
    }

    if (!bookingForm.passenger_name) {
      toast.error('Veuillez entrer votre nom complet');
      return;
    }

    if (!bookingForm.passenger_phone) {
      toast.error('Veuillez entrer votre numéro de téléphone');
      return;
    }

    const totalAmount = selectedTrip.price * seatCount;
    
    // ✅ Vérifier le solde avant la réservation
    if (userBalance < totalAmount) {
      toast.error(`Solde insuffisant. Vous avez ${userBalance.toLocaleString()} FCFA, besoin de ${totalAmount.toLocaleString()} FCFA.`);
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post('/api/bookings', {
        trip_id: selectedTrip.id,
        passenger_name: bookingForm.passenger_name,
        passenger_phone: bookingForm.passenger_phone,
        passenger_email: bookingForm.passenger_email,
        seat_count: seatCount
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setBookingResult(response.data.booking);
        setShowReceipt(true);
        setShowBookingForm(false);
        toast.success('✅ Réservation effectuée avec succès !');
        fetchTrips();
        fetchUserBookings();
        fetchUserBalance(); // Rafraîchir le solde
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Erreur lors de la réservation';
      toast.error(errorMsg);
      
      if (error.response?.data?.balance !== undefined) {
        toast.error(`Solde: ${error.response.data.balance.toLocaleString()} FCFA - Besoin de ${error.response.data.required.toLocaleString()} FCFA`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBookingForm = async (trip) => {
    setSelectedTrip(trip);
    setBookingForm({
      passenger_name: user?.fullname || '',
      passenger_phone: user?.phone || '',
      passenger_email: user?.email || '',
      seat_count: 1
    });
    
    // Vérifier le solde avant d'ouvrir le formulaire
    const check = await checkBalanceBeforeBooking(trip.id, 1);
    if (check) {
      setBalanceCheck(check);
    }
    
    setShowBookingForm(true);
  };

  const handleSeatCountChange = async (e) => {
    const value = parseInt(e.target.value) || 1;
    setBookingForm({...bookingForm, seat_count: value});
    
    // Re-vérifier le solde quand le nombre de places change
    if (selectedTrip && value > 0) {
      const check = await checkBalanceBeforeBooking(selectedTrip.id, value);
      if (check) {
        setBalanceCheck(check);
      }
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const formatDate = (date) => {
    if (!date) return 'Date non définie';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (date, time) => {
    if (!date) return 'Date non définie';
    return `${formatDate(date)} ${time ? `à ${time}` : ''}`;
  };

  const formatAmount = (amount) => {
    return amount?.toLocaleString() + ' FCFA' || '0 FCFA';
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'confirmed':
        return { color: 'bg-green-500/20 text-green-400', label: '✅ Confirmée' };
      case 'pending':
        return { color: 'bg-yellow-500/20 text-yellow-400', label: '⏳ En attente' };
      case 'rejected':
        return { color: 'bg-red-500/20 text-red-400', label: '❌ Rejetée' };
      case 'cancelled':
        return { color: 'bg-gray-500/20 text-gray-400', label: '❌ Annulée' };
      default:
        return { color: 'bg-gray-500/20 text-gray-400', label: '📋 En cours' };
    }
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  const tripsToDisplay = Array.isArray(filteredTrips) ? filteredTrips : [];
  const totalAmount = selectedTrip ? selectedTrip.price * bookingForm.seat_count : 0;
  const isSufficient = balanceCheck ? balanceCheck.is_sufficient : (userBalance >= totalAmount);

  return (
    <Layout user={user} socket={socket}>
      <div className="container mx-auto px-4 py-8">
        {/* Bouton de retour */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors bg-white rounded-lg shadow-sm hover:shadow-md"
        >
          <FaArrowLeft className="text-lg" />
          <span>Retour</span>
        </button>

        <div className="max-w-6xl mx-auto">
          {/* En-tête avec solde */}
          <div className="bg-gradient-to-r from-blue-800 via-blue-700 to-indigo-800 rounded-2xl p-6 mb-8 shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">🚌 Réservation de Bus</h1>
                <p className="text-blue-200">Réservez vos places de voyage en toute sécurité</p>
              </div>
              <div className="flex gap-3 items-center">
                <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
                  <p className="text-blue-200 text-xs">Votre solde</p>
                  <p className="text-white font-bold text-lg flex items-center gap-1">
                    <FaWallet className="text-yellow-300" />
                    {formatAmount(userBalance)}
                  </p>
                </div>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors flex items-center gap-2"
                >
                  <FaHistory /> {showHistory ? 'Masquer' : 'Voir'} historique
                </button>
              </div>
            </div>
          </div>

          {/* Historique des réservations */}
          {showHistory && (
            <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
              <h3 className="font-bold text-lg mb-3">📜 Mes réservations</h3>
              {!Array.isArray(userBookings) || userBookings.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Aucune réservation</p>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {userBookings.map(booking => {
                    const status = getStatusBadge(booking.booking_status);
                    return (
                      <div key={booking.id} className="border rounded-lg p-3 hover:bg-gray-50">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{booking.passenger_name}</p>
                            <p className="text-sm text-gray-500">
                              {booking.departure_city} → {booking.destination_city}
                            </p>
                            <p className="text-xs text-gray-400">
                              {formatDateTime(booking.departure_date, booking.departure_time)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">{formatAmount(booking.total_amount)}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>
                              {status.label}
                            </span>
                            <p className="text-xs text-gray-400">{booking.booking_number}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Recherche */}
          <div className="bg-blue-950 rounded-xl shadow-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-white-700 mb-1">
                  <FaMapMarkerAlt className="inline mr-1 text-blue-500" /> Départ
                </label>
                <input
                  type="text"
                  value={searchFilters.departure}
                  onChange={(e) => setSearchFilters({...searchFilters, departure: e.target.value})}
                  placeholder="Ville de départ"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white-700 mb-1">
                  <FaMapMarkerAlt className="inline mr-1 text-red-500" /> Destination
                </label>
                <input
                  type="text"
                  value={searchFilters.destination}
                  onChange={(e) => setSearchFilters({...searchFilters, destination: e.target.value})}
                  placeholder="Ville de destination"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-date-700 mb-1">
                  <FaCalendarAlt className="inline mr-1 text-green-500" /> Date
                </label>
                <input
                  type="date"
                  value={searchFilters.date}
                  onChange={(e) => setSearchFilters({...searchFilters, date: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleSearch}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <FaSearch /> Rechercher
                </button>
              </div>
            </div>
          </div>

          {/* Liste des trajets */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : tripsToDisplay.length === 0 ? (
            <div className="text-center py-12 bg-white/5 rounded-xl">
              <FaBus className="text-gray-300 text-5xl mx-auto mb-3" />
              <p className="text-gray-500">Aucun trajet disponible</p>
              <p className="text-gray-400 text-sm mt-2">Essayez de modifier vos critères de recherche</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {tripsToDisplay.map(trip => (
                <div key={trip.id} className="bg-blue-950 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all">
                  <div className="p-4 border-b">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg text-white-800 flex items-center gap-2">
                          <FaBus className="text-blue-500" />
                          {trip.departure_city} → {trip.destination_city}
                        </h3>
                        <p className="text-sm text-gray-500">{trip.agency_name || 'Agence de voyage'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">{formatAmount(trip.price)}</p>
                        <p className="text-xs text-gray-400">par place</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Départ</p>
                      <p className="font-medium">{formatDateTime(trip.departure_date, trip.departure_time)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Arrivée</p>
                      <p className="font-medium">{trip.arrival_time || 'À déterminer'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Places disponibles</p>
                      <p className="font-medium text-blue-600">{trip.available_seats || 0} / {trip.total_seats || 0}</p>
                    </div>
                    <div className="flex items-end justify-end gap-2">
                      <button
                        onClick={() => handleOpenBookingForm(trip)}
                        className="bg-yellow-500 text-black px-4 py-2 rounded-lg hover:bg-yellow-400 transition-colors flex items-center gap-1 text-sm"
                        disabled={trip.available_seats === 0}
                      >
                        <FaTicketAlt /> Réserver
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de réservation avec vérification de solde */}
      {showBookingForm && selectedTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
          <div className="relative max-w-lg w-full bg-blue-950 rounded-2xl shadow-2xl">
            <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center rounded-t-2xl">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <FaTicketAlt className="text-yellow-500" />
                Réserver un trajet
              </h3>
              <button 
                onClick={() => {
                  setShowBookingForm(false);
                  setSelectedTrip(null);
                  setBalanceCheck(null);
                }} 
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes size={20} />
              </button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {/* Récapitulatif du trajet */}
              <div className="bg-amber-400 rounded-lg p-4 mb-4">
                <p className="font-bold">{selectedTrip.departure_city} → {selectedTrip.destination_city}</p>
                <p className="text-sm text-gray-600">
                  <FaCalendarAlt className="inline mr-1" /> {formatDate(selectedTrip.departure_date)} à {selectedTrip.departure_time}
                </p>
                <p className="text-sm text-gray-600">
                  <FaBuilding className="inline mr-1" /> {selectedTrip.agency_name || 'Agence de voyage'}
                </p>
                <p className="text-sm font-bold text-green-600 mt-1">
                  {formatAmount(selectedTrip.price)} / place • {selectedTrip.available_seats || 0} places disponibles
                </p>
              </div>

              {/* Affichage du solde */}
              <div className={`rounded-lg p-3 mb-4 ${isSufficient ? 'bg-amber-400 border border-green-200' : 'bg-green-500 border border-red-200'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-white-600">Votre solde</p>
                    <p className="font-bold text-lg">{formatAmount(userBalance)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total à payer</p>
                    <p className="font-bold text-lg">{formatAmount(totalAmount)}</p>
                  </div>
                </div>
                {!isSufficient && (
                  <div className="mt-2 p-2 bg-blue-950 rounded-lg text-red-700 text-sm">
                    ⚠️ Solde insuffisant. Besoin de {(totalAmount - userBalance).toLocaleString()} FCFA supplémentaire.
                  </div>
                )}
                {checkingBalance && (
                  <div className="mt-2 text-sm text-gray-500">Vérification du solde...</div>
                )}
              </div>

              <form onSubmit={handleBooking} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white-700 mb-1">Nom complet *</label>
                  <div className="relative">
                    <FaUser className="absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      value={bookingForm.passenger_name}
                      onChange={(e) => setBookingForm({...bookingForm, passenger_name: e.target.value})}
                      className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white-700 mb-1">Téléphone *</label>
                  <div className="relative">
                    <FaPhone className="absolute left-3 top-3 text-gray-400" />
                    <input
                      type="tel"
                      value={bookingForm.passenger_phone}
                      onChange={(e) => setBookingForm({...bookingForm, passenger_phone: e.target.value})}
                      className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white-700 mb-1">Email</label>
                  <div className="relative">
                    <FaEnvelope className="absolute left-3 top-3 text-gray-400" />
                    <input
                      type="email"
                      value={bookingForm.passenger_email}
                      onChange={(e) => setBookingForm({...bookingForm, passenger_email: e.target.value})}
                      className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white-700 mb-1">Nombre de places *</label>
                  <input
                    type="number"
                    value={bookingForm.seat_count}
                    onChange={handleSeatCountChange}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max={selectedTrip.available_seats || 1}
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">Maximum: {selectedTrip.available_seats || 0} places</p>
                </div>

                <div className="bg-blue-950-50 rounded-lg p-4">
                  <p className="font-bold">Récapitulatif</p>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-white-600">Prix unitaire</span>
                    <span>{formatAmount(selectedTrip.price)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Nombre de places</span>
                    <span>{bookingForm.seat_count}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t mt-2">
                    <span>Total</span>
                    <span className={isSufficient ? 'text-green-600' : 'text-red-600'}>
                      {formatAmount(totalAmount)}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !isSufficient || checkingBalance}
                  className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 font-bold transition-colors ${
                    isSufficient && !loading && !checkingBalance
                      ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                  ) : !isSufficient ? (
                    <><FaMoneyBillWave /> Solde insuffisant</>
                  ) : (
                    <><FaCheckCircle /> Confirmer la réservation</>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal Reçu */}
      {showReceipt && bookingResult && selectedTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
          <div className="relative max-w-md w-full bg-white rounded-2xl shadow-2xl">
            <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center rounded-t-2xl">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <FaCheckCircle className="text-green-500" />
                Réservation confirmée
              </h3>
              <button onClick={() => setShowReceipt(false)} className="text-gray-400 hover:text-gray-600">
                <FaTimes size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FaCheckCircle className="text-green-500 text-3xl" />
                </div>
                <p className="text-gray-500 text-sm">Votre réservation a été confirmée</p>
                <p className="text-xs text-gray-400">Paiement effectué avec succès</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">N° Réservation</span>
                  <span className="font-mono font-bold">{bookingResult.booking_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Passager</span>
                  <span className="font-medium">{bookingResult.passenger_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Trajet</span>
                  <span className="font-medium">{selectedTrip.departure_city} → {selectedTrip.destination_city}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date & Heure</span>
                  <span>{formatDateTime(selectedTrip.departure_date, selectedTrip.departure_time)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Places</span>
                  <span>{bookingResult.seat_count}</span>
                </div>
                <div className="flex justify-between font-bold pt-2 border-t">
                  <span>Total payé</span>
                  <span className="text-green-600">{formatAmount(bookingResult.total_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Statut</span>
                  <span className="text-green-600">✅ Confirmée</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400 border-t pt-2">
                  <span>Nouveau solde</span>
                  <span>{formatAmount(userBalance - bookingResult.total_amount)}</span>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handlePrintReceipt}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  <FaPrint /> Imprimer
                </button>
                <button
                  onClick={() => {
                    setShowReceipt(false);
                    setShowBookingForm(false);
                    setSelectedTrip(null);
                    setBookingResult(null);
                  }}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Terminer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default BusBooking;