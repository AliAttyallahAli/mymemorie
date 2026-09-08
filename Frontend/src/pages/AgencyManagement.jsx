// src/pages/AgencyManagement.jsx - Version corrigée
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Layout from '../components/Layout';
import {
  FaBuilding, FaBus, FaPlus, FaEdit, FaTrashAlt, FaEye,
  FaCheckCircle, FaTimes, FaClock, FaUser, FaPhone,
  FaEnvelope, FaMapMarkerAlt, FaCalendarAlt, FaMoneyBillWave,
  FaTicketAlt, FaUsers, FaArrowLeft, FaPrint, FaDownload,
  FaWhatsapp, FaShare, FaSearch, FaFilter, FaBell,
  FaCheck, FaBan, FaUndo, FaInfoCircle
} from 'react-icons/fa';

const AgencyManagement = ({ user, socket }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [agency, setAgency] = useState(null);
  const [trips, setTrips] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showTripForm, setShowTripForm] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingDetail, setShowBookingDetail] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [tripForm, setTripForm] = useState({
    departure_city: '',
    destination_city: '',
    departure_date: '',
    departure_time: '',
    arrival_time: '',
    price: '',
    total_seats: '',
    description: ''
  });

  useEffect(() => {
    if (user) {
      fetchAgencyData();
      fetchTrips();
      fetchBookings();
      fetchNotifications();
    }
  }, [user]);

  // S'assurer que notifications est toujours un tableau
  const getNotificationsCount = () => {
    if (!Array.isArray(notifications)) return 0;
    return notifications.filter(n => !n.is_read).length;
  };

  const getPendingBookingsCount = () => {
    if (!Array.isArray(bookings)) return 0;
    return bookings.filter(b => b.booking_status === 'pending').length;
  };

  const fetchAgencyData = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get('/api/agency/info', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAgency(response.data);
    } catch (error) {
      console.error('Erreur chargement agence:', error);
      // Si l'agence n'existe pas, créer des données par défaut
      setAgency({
        id: null,
        name: 'Mon agence',
        type: 'travel_agency',
        phone: user?.phone || '',
        email: user?.email || '',
        address: ''
      });
    }
  };

  const fetchTrips = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get('/api/agency/trips', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // S'assurer que trips est un tableau
      setTrips(Array.isArray(response.data) ? response.data : response.data?.trips || []);
    } catch (error) {
      console.error('Erreur chargement trajets:', error);
      setTrips([]);
    }
  };

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`/api/agency/bookings?status=${filterStatus}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // S'assurer que bookings est un tableau
      const data = response.data;
      setBookings(Array.isArray(data) ? data : data?.bookings || []);
    } catch (error) {
      console.error('Erreur chargement réservations:', error);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get('/api/agency/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      // S'assurer que notifications est un tableau
      const data = response.data;
      setNotifications(Array.isArray(data) ? data : data?.notifications || []);
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
      setNotifications([]);
    }
  };

  const handleCreateTrip = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      await axios.post('/api/agency/trips', tripForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Trajet créé avec succès');
      setShowTripForm(false);
      setTripForm({
        departure_city: '',
        destination_city: '',
        departure_date: '',
        departure_time: '',
        arrival_time: '',
        price: '',
        total_seats: '',
        description: ''
      });
      fetchTrips();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTrip = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      await axios.put(`/api/agency/trips/${editingTrip.id}`, tripForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Trajet modifié avec succès');
      setShowTripForm(false);
      setEditingTrip(null);
      setTripForm({
        departure_city: '',
        destination_city: '',
        departure_date: '',
        departure_time: '',
        arrival_time: '',
        price: '',
        total_seats: '',
        description: ''
      });
      fetchTrips();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la modification');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTrip = async (id) => {
    if (!window.confirm('Supprimer ce trajet ?')) return;
    try {
      const token = localStorage.getItem('accessToken');
      await axios.delete(`/api/agency/trips/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Trajet supprimé');
      fetchTrips();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleValidateBooking = async (id) => {
    try {
      const token = localStorage.getItem('accessToken');
      await axios.post(`/api/agency/bookings/${id}/validate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Réservation validée');
      fetchBookings();
      fetchNotifications();
      setShowBookingDetail(false);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de la validation');
    }
  };

  const handleRejectBooking = async (id) => {
    const reason = prompt('Motif du rejet:');
    if (!reason) return;
    
    try {
      const token = localStorage.getItem('accessToken');
      await axios.post(`/api/agency/bookings/${id}/reject`, { rejection_reason: reason }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Réservation rejetée et remboursement effectué');
      fetchBookings();
      fetchNotifications();
      setShowBookingDetail(false);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors du rejet');
    }
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
      default:
        return { color: 'bg-gray-500/20 text-gray-400', label: '📋 En cours' };
    }
  };

  if (!user || user.role !== 'agent') {
    navigate('/dashboard');
    return null;
  }

  // Calculer les statistiques en toute sécurité
  const totalTrips = Array.isArray(trips) ? trips.length : 0;
  const totalBookings = Array.isArray(bookings) ? bookings.length : 0;
  const pendingBookings = Array.isArray(bookings) ? bookings.filter(b => b.booking_status === 'pending').length : 0;
  const unreadNotifications = Array.isArray(notifications) ? notifications.filter(n => !n.is_read).length : 0;

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
          {/* En-tête */}
          <div className="bg-gradient-to-r from-blue-800 via-blue-700 to-indigo-800 rounded-2xl p-6 mb-8 shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">🏢 Gestion de l'agence</h1>
                <p className="text-blue-200">{agency?.name || 'Agence de voyage'}</p>
              </div>
              <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
                <p className="text-blue-200 text-xs">Notifications</p>
                <p className="text-white font-bold text-xl">{unreadNotifications}</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <FaBuilding /> Dashboard
            </button>
            <button
              onClick={() => { setActiveTab('trips'); fetchTrips(); }}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'trips' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <FaBus /> Trajets
            </button>
            <button
              onClick={() => { setActiveTab('bookings'); fetchBookings(); }}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'bookings' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <FaTicketAlt /> Réservations
              {pendingBookings > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {pendingBookings}
                </span>
              )}
            </button>
            <button
              onClick={() => { setActiveTab('notifications'); fetchNotifications(); }}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
                activeTab === 'notifications' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <FaBell /> Notifications
              {unreadNotifications > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {unreadNotifications}
                </span>
              )}
            </button>
          </div>

          {/* Dashboard */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Trajets</p>
                    <p className="text-2xl font-bold text-blue-600">{totalTrips}</p>
                  </div>
                  <FaBus className="text-blue-500 text-3xl opacity-50" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Réservations</p>
                    <p className="text-2xl font-bold text-green-600">{totalBookings}</p>
                  </div>
                  <FaTicketAlt className="text-green-500 text-3xl opacity-50" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">En attente</p>
                    <p className="text-2xl font-bold text-yellow-600">{pendingBookings}</p>
                  </div>
                  <FaClock className="text-yellow-500 text-3xl opacity-50" />
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 text-sm">Notifications</p>
                    <p className="text-2xl font-bold text-purple-600">{unreadNotifications}</p>
                  </div>
                  <FaBell className="text-purple-500 text-3xl opacity-50" />
                </div>
              </div>
            </div>
          )}

          {/* Trajets */}
          {activeTab === 'trips' && (
            <div>
              <button
                onClick={() => { setShowTripForm(true); setEditingTrip(null); setTripForm({ departure_city: '', destination_city: '', departure_date: '', departure_time: '', arrival_time: '', price: '', total_seats: '', description: '' }); }}
                className="bg-yellow-500 text-black px-4 py-2 rounded-lg mb-4 hover:bg-yellow-400 transition-colors flex items-center gap-2"
              >
                <FaPlus /> Créer un trajet
              </button>

              {totalTrips === 0 ? (
                <div className="text-center py-12 bg-white/5 rounded-xl">
                  <FaBus className="text-white/20 text-5xl mx-auto mb-3" />
                  <p className="text-white/50">Aucun trajet créé</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {trips.map(trip => (
                    <div key={trip.id} className="bg-blue-950 rounded-xl shadow-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-lg">
                            {trip.departure_city} → {trip.destination_city}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {formatDateTime(trip.departure_date, trip.departure_time)}
                          </p>
                          <p className="text-sm text-gray-500">
                            <FaUsers className="inline mr-1" /> {trip.available_seats || trip.total_seats} / {trip.total_seats} places disponibles
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">{formatAmount(trip.price)}</p>
                          <p className="text-xs text-gray-400">par place</p>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => {
                            setEditingTrip(trip);
                            setTripForm({
                              departure_city: trip.departure_city,
                              destination_city: trip.destination_city,
                              departure_date: trip.departure_date,
                              departure_time: trip.departure_time,
                              arrival_time: trip.arrival_time || '',
                              price: trip.price,
                              total_seats: trip.total_seats,
                              description: trip.description || ''
                            });
                            setShowTripForm(true);
                          }}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
                        >
                          <FaEdit /> Modifier
                        </button>
                        <button
                          onClick={() => handleDeleteTrip(trip.id)}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
                        >
                          <FaTrashAlt /> Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Réservations */}
          {activeTab === 'bookings' && (
            <div>
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => { setFilterStatus('all'); fetchBookings(); }}
                  className={`px-3 py-1 rounded-lg text-sm ${filterStatus === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}
                >
                  Toutes
                </button>
                <button
                  onClick={() => { setFilterStatus('pending'); fetchBookings(); }}
                  className={`px-3 py-1 rounded-lg text-sm ${filterStatus === 'pending' ? 'bg-yellow-600 text-white' : 'bg-gray-200 text-gray-600'}`}
                >
                  En attente
                </button>
                <button
                  onClick={() => { setFilterStatus('confirmed'); fetchBookings(); }}
                  className={`px-3 py-1 rounded-lg text-sm ${filterStatus === 'confirmed' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'}`}
                >
                  Confirmées
                </button>
                <button
                  onClick={() => { setFilterStatus('rejected'); fetchBookings(); }}
                  className={`px-3 py-1 rounded-lg text-sm ${filterStatus === 'rejected' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-600'}`}
                >
                  Rejetées
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : totalBookings === 0 ? (
                <div className="text-center py-12 bg-white/5 rounded-xl">
                  <FaTicketAlt className="text-white/20 text-5xl mx-auto mb-3" />
                  <p className="text-white/50">Aucune réservation</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings.map(booking => {
                    const status = getStatusBadge(booking.booking_status);
                    return (
                      <div key={booking.id} className="bg-blue-950 rounded-xl shadow-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-bold">{booking.passenger_name}</p>
                            <p className="text-sm text-gray-500">
                              {booking.departure_city} → {booking.destination_city}
                            </p>
                            <p className="text-xs text-gray-400">
                              {formatDateTime(booking.departure_date, booking.departure_time)}
                            </p>
                            <p className="text-xs text-gray-400">
                              <FaUser className="inline mr-1" /> {booking.user_name || booking.passenger_name} ({booking.user_phone || booking.passenger_phone})
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">{formatAmount(booking.total_amount)}</p>
                            <p className="text-xs text-gray-400">{booking.seat_count || 1} place(s)</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${status.color}`}>
                              {status.label}
                            </span>
                            <p className="text-xs text-gray-400">{booking.booking_number}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedBooking(booking);
                              setShowBookingDetail(true);
                            }}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm"
                          >
                            <FaEye /> Détails
                          </button>
                          {booking.booking_status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleValidateBooking(booking.id)}
                                className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm"
                              >
                                <FaCheck /> Valider
                              </button>
                              <button
                                onClick={() => handleRejectBooking(booking.id)}
                                className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm"
                              >
                                <FaBan /> Rejeter
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <div>
              {!Array.isArray(notifications) || notifications.length === 0 ? (
                <div className="text-center py-12 bg-white/5 rounded-xl">
                  <FaBell className="text-white/20 text-5xl mx-auto mb-3" />
                  <p className="text-white/50">Aucune notification</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map(notif => (
                    <div key={notif.id} className={`bg-blue-950 rounded-xl shadow-lg p-4 ${!notif.is_read ? 'border-l-4 border-blue-500' : ''}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{notif.message || notif.title || 'Notification'}</p>
                          <p className="text-xs text-gray-400">{formatDate(notif.created_at)}</p>
                        </div>
                        {!notif.is_read && (
                          <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">Nouveau</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal création/modification trajet */}
      {showTripForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
          <div className="relative max-w-lg w-full bg-blue-600 rounded-2xl shadow-2xl">
            <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center rounded-t-2xl">
              <h3 className="text-xl font-bold text-gray-800">
                {editingTrip ? 'Modifier le trajet' : 'Créer un trajet'}
              </h3>
              <button onClick={() => { setShowTripForm(false); setEditingTrip(null); }} className="text-gray-400 hover:text-gray-600">
                <FaTimes size={20} />
              </button>
            </div>
            <form onSubmit={editingTrip ? handleUpdateTrip : handleCreateTrip} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ville de départ *</label>
                  <input
                    type="text"
                    value={tripForm.departure_city}
                    onChange={(e) => setTripForm({...tripForm, departure_city: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ville de destination *</label>
                  <input
                    type="text"
                    value={tripForm.destination_city}
                    onChange={(e) => setTripForm({...tripForm, destination_city: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de départ *</label>
                  <input
                    type="date"
                    value={tripForm.departure_date}
                    onChange={(e) => setTripForm({...tripForm, departure_date: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Heure de départ *</label>
                  <input
                    type="time"
                    value={tripForm.departure_time}
                    onChange={(e) => setTripForm({...tripForm, departure_time: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Heure d'arrivée</label>
                <input
                  type="time"
                  value={tripForm.arrival_time}
                  onChange={(e) => setTripForm({...tripForm, arrival_time: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prix (FCFA) *</label>
                  <input
                    type="number"
                    value={tripForm.price}
                    onChange={(e) => setTripForm({...tripForm, price: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                    min="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de places *</label>
                  <input
                    type="number"
                    value={tripForm.total_seats}
                    onChange={(e) => setTripForm({...tripForm, total_seats: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                    min="1"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={tripForm.description}
                  onChange={(e) => setTripForm({...tripForm, description: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="2"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-yellow-500 text-black py-2 rounded-lg hover:bg-yellow-400 disabled:opacity-50"
              >
                {loading ? 'Enregistrement...' : (editingTrip ? 'Modifier' : 'Créer')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Détail réservation */}
      {showBookingDetail && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
          <div className="relative max-w-md w-full bg-blue-400 rounded-2xl shadow-2xl">
            <div className="sticky top-0 bg- p-4 border-b flex justify-between items-center rounded-t-2xl">
              <h3 className="text-xl font-bold text-gray-800">Détails de la réservation</h3>
              <button onClick={() => setShowBookingDetail(false)} className="text-red-700 hover:text-gray-600">
                <FaTimes size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-950 rounded-lg p-4">
                <p className="font-bold">{selectedBooking.passenger_name}</p>
                <p className="text-sm text-white-600"><FaPhone className="inline mr-1" /> {selectedBooking.passenger_phone}</p>
                {selectedBooking.passenger_email && (
                  <p className="text-sm text-gray-600"><FaEnvelope className="inline mr-1" /> {selectedBooking.passenger_email}</p>
                )}
              </div>
              <div className="bg-blue-950 rounded-lg p-4">
                <p className="font-bold">{selectedBooking.departure_city} → {selectedBooking.destination_city}</p>
                <p className="text-sm text-gray-600">
                  <FaCalendarAlt className="inline mr-1" /> {formatDateTime(selectedBooking.departure_date, selectedBooking.departure_time)}
                </p>
                <p className="text-sm text-gray-600">
                  <FaTicketAlt className="inline mr-1" /> {selectedBooking.seat_count || 1} place(s)
                </p>
                <p className="text-sm font-bold text-green-600">
                  <FaMoneyBillWave className="inline mr-1" /> {formatAmount(selectedBooking.total_amount)}
                </p>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-black">N° Réservation</span>
                <span className="font-mono">{selectedBooking.booking_number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-black">Statut</span>
                <span className={selectedBooking.booking_status === 'confirmed' ? 'text-green-600' : 'text-yellow-600'}>
                  {selectedBooking.booking_status === 'confirmed' ? '✅ Confirmée' : '⏳ En attente'}
                </span>
              </div>
              {selectedBooking.rejection_reason && (
                <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                  <p className="text-red-700 text-sm">Motif du rejet: {selectedBooking.rejection_reason}</p>
                </div>
              )}
              {selectedBooking.booking_status === 'pending' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleValidateBooking(selectedBooking.id)}
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
                  >
                    <FaCheck /> Valider
                  </button>
                  <button
                    onClick={() => handleRejectBooking(selectedBooking.id)}
                    className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700"
                  >
                    <FaBan /> Rejeter
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default AgencyManagement;