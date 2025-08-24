'use client';

import { useState, useEffect, useCallback } from 'react';
import { getUserEvents, shareEvent, createEvent, updateEvent } from '@/lib/actions';
import Link from 'next/link';



interface UserEventsProps {
  userId: string;
}

interface Event {
  id: string;
  name: string;
  eventType: string;
  targetDate: Date | null;
  hasTargetDate: boolean;
  isPrivate: boolean;
  isActive: boolean;
  isOwned: boolean;
  canEdit: boolean;
  sharedBy?: string;
  items: {
    id: string;
    name: string;
    description: string | null;
    price: number | null;
    isPurchased: boolean;
    purchasedAt: Date | null;
    purchasedBy: string | null;
    purchaseUrl: string | null;
    categoryId: string | null;
    category?: {
      id: string;
      name: string;
      color: string;
      icon?: string | null;
    } | null;
    photos: {
      id: string;
      imageUrl: string;
      altText?: string | null;
      order: number;
    }[];
  }[];
}

export default function UserEvents({ userId }: UserEventsProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const [message, setMessage] = useState('');
  const [showShareForm, setShowShareForm] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [shareData, setShareData] = useState({
    targetUsername: '',
    canEdit: false
  });
  const [createEventData, setCreateEventData] = useState({
    name: '',
    eventType: 'anniversaire',
    hasTargetDate: true,
    targetDate: '',
    isPrivate: false
  });
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editEventData, setEditEventData] = useState({
    name: '',
    eventType: 'anniversaire',
    hasTargetDate: true,
    targetDate: '',
    isPrivate: false
  });

  const loadEvents = useCallback(async () => {
    try {
      const result = await getUserEvents(userId);
      if (result.success && result.events) {
        setEvents(result.events);
      } else {
        setEvents([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des événements:', error);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    // Marquer l'initialisation comme terminée quand userId change
    if (userId) {
      setIsInitializing(false);
      loadEvents();
    } else {
      setIsInitializing(false);
    }
  }, [userId, loadEvents]);

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !shareData.targetUsername.trim()) {
      setMessage('❌ Veuillez entrer un nom d\'utilisateur');
      return;
    }

    try {
      const result = await shareEvent(selectedEvent.id, shareData.targetUsername, shareData.canEdit);
      if (result.success) {
        setMessage(`✅ ${result.message}`);
        setShowShareForm(false);
        setSelectedEvent(null);
        setShareData({ targetUsername: '', canEdit: false });
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(`❌ ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ Erreur lors du partage: ${error}`);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createEventData.name.trim()) {
      setMessage('❌ Veuillez entrer un nom pour l\'événement');
      return;
    }

    try {
      const eventData = {
        name: createEventData.name,
        eventType: createEventData.eventType,
        targetDate: createEventData.hasTargetDate && createEventData.targetDate ? new Date(createEventData.targetDate) : undefined,
        hasTargetDate: createEventData.hasTargetDate,
        isPrivate: createEventData.isPrivate,
        ownerId: userId
      };

      const result = await createEvent(eventData);
      if (result.success) {
        setMessage('✅ Événement créé avec succès !');
        setShowCreateForm(false);
        setCreateEventData({
          name: '',
          eventType: 'anniversaire',
          hasTargetDate: true,
          targetDate: '',
          isPrivate: false
        });
        // Recharger les événements
        await loadEvents();
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(`❌ ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ Erreur lors de la création de l'événement: ${error}`);
    }
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setEditEventData({
      name: event.name,
      eventType: event.eventType,
      hasTargetDate: event.hasTargetDate,
      targetDate: event.targetDate ? new Date(event.targetDate).toISOString().split('T')[0] : '',
      isPrivate: event.isPrivate
    });
    setShowEditForm(true);
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent || !editEventData.name.trim()) {
      setMessage('❌ Veuillez entrer un nom d\'événement');
      return;
    }

    try {
      const result = await updateEvent(editingEvent.id, {
        name: editEventData.name,
        eventType: editEventData.eventType,
        targetDate: editEventData.hasTargetDate && editEventData.targetDate ? new Date(editEventData.targetDate) : null,
        hasTargetDate: editEventData.hasTargetDate,
        isPrivate: editEventData.isPrivate
      });

      if (result.success) {
        setMessage('✅ Événement modifié avec succès !');
        setShowEditForm(false);
        setEditingEvent(null);
        await loadEvents();
      } else {
        setMessage(`❌ Erreur: ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ Erreur lors de la modification de l'événement: ${error}`);
    }
  };

  const cancelEdit = () => {
    setShowEditForm(false);
    setEditingEvent(null);
    setEditEventData({
      name: '',
      eventType: 'anniversaire',
      hasTargetDate: true,
      targetDate: '',
      isPrivate: false
    });
  };

  // Afficher un loader pendant l'initialisation pour éviter le clipping
  if (isInitializing) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Initialisation...</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Chargement de vos événements...</p>
      </div>
    );
  }

  const ownedEvents = events.filter(event => event.isOwned);
  const sharedEvents = events.filter(event => !event.isOwned);
  
  // Debug: afficher les événements et leurs flags
  console.log('🔍 [UserEvents] Tous les événements:', events);
  console.log('🔍 [UserEvents] Événements personnels (owned):', ownedEvents);
  console.log('🔍 [UserEvents] Événements partagés (shared):', sharedEvents);

  return (
    <div className="space-y-8">
      {message && (
        <div className={`px-4 py-3 rounded-xl text-center ${
          message.includes('✅') 
            ? 'bg-green-100 border border-green-200 text-green-700' 
            : 'bg-red-100 border border-red-200 text-red-700'
        }`}>
          {message}
        </div>
      )}

      {/* Événements personnels */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            🏠 Mes événements
            <span className="text-sm font-normal text-gray-500 bg-blue-100 px-3 py-1 rounded-full">
              {ownedEvents.length}
            </span>
          </h3>
          
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-block bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-4 py-2 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium"
          >
            ➕ Nouvel événement
          </button>
        </div>
        
        {ownedEvents.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-2xl min-h-[200px] flex items-center justify-center">
            <div>
              <p className="text-gray-600">Vous n&apos;avez pas encore créé d&apos;événements.</p>
              <div className="mt-4">
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="inline-block bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-6 py-3 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium"
                >
                  ➕ Créer mon premier événement
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ownedEvents.map((event) => (
              <div key={event.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-lg font-semibold text-gray-800">{event.name}</h4>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    Personnel
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-4">
                  Type: {event.eventType} • {event.hasTargetDate && event.targetDate ? 'Avec date' : 'Sans date'}
                </p>
                
                <div className="flex gap-2">
                  <Link
                    href={`/liste?event=${event.id}`}
                    className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg text-center text-sm font-medium transition-all duration-300"
                  >
                    🛍️ Voir la liste
                  </Link>
                  
                  <button
                    onClick={() => handleEditEvent(event)}
                    className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300"
                    title="Modifier cet événement"
                  >
                    ✏️
                  </button>
                  
                  <button
                    onClick={() => {
                      setSelectedEvent(event);
                      setShowShareForm(true);
                    }}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-all duration-300"
                    title="Partager cet événement"
                  >
                    📤
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Événements partagés */}
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
          🤝 Événements partagés avec moi
          <span className="text-sm font-normal text-gray-500 bg-green-100 px-3 py-1 rounded-full">
            {sharedEvents.length}
          </span>
        </h3>
        
        {sharedEvents.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-2xl min-h-[200px] flex items-center justify-center">
            <p className="text-gray-600">Aucun événement partagé avec vous pour le moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sharedEvents.map((event) => (
              <div key={event.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-lg font-semibold text-gray-800">{event.name}</h4>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    Partagé par {event.sharedBy}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-4">
                  Type: {event.eventType} • {event.hasTargetDate && event.targetDate ? 'Avec date' : 'Sans date'}
                  {event.canEdit && ' • Vous pouvez modifier'}
                </p>
                
                <Link
                  href={`/liste?event=${event.id}`}
                  className="block w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-4 py-2 rounded-lg text-center text-sm font-medium transition-all duration-300"
                >
                  🛍️ Voir la liste
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de partage */}
      {showShareForm && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                📤 Partager &quot;{selectedEvent.name}&quot;
              </h3>
              
              <form onSubmit={handleShare} className="space-y-4">
                <div>
                  <label htmlFor="targetUsername" className="block text-sm font-medium text-gray-700 mb-2">
                    Nom d&apos;utilisateur
                  </label>
                  <input
                    id="targetUsername"
                    type="text"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                    placeholder="Pseudo de l'utilisateur"
                    value={shareData.targetUsername}
                    onChange={(e) => setShareData(prev => ({ ...prev, targetUsername: e.target.value }))}
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="canEdit"
                    checked={shareData.canEdit}
                    onChange={(e) => setShareData(prev => ({ ...prev, canEdit: e.target.checked }))}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="canEdit" className="text-sm text-gray-700">
                    L&apos;utilisateur peut modifier la liste
                  </label>
                </div>
                
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300"
                  >
                    📤 Partager
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setShowShareForm(false);
                      setSelectedEvent(null);
                      setShareData({ targetUsername: '', canEdit: false });
                    }}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de création d'événement */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                ➕ Créer un nouvel événement
              </h3>
              
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div>
                  <label htmlFor="eventName" className="block text-sm font-medium text-gray-700 mb-2">
                    Nom de l&apos;événement
                  </label>
                  <input
                    id="eventName"
                    type="text"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                    placeholder="Ex: Anniversaire de Mimoutte"
                    value={createEventData.name}
                    onChange={(e) => setCreateEventData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                <div>
                  <label htmlFor="eventType" className="block text-sm font-medium text-gray-700 mb-2">
                    Type d&apos;événement
                  </label>
                  <select
                    id="eventType"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                    value={createEventData.eventType}
                    onChange={(e) => setCreateEventData(prev => ({ ...prev, eventType: e.target.value }))}
                  >
                    <option value="anniversaire">🎂 Anniversaire</option>
                    <option value="noel">🎄 Noël</option>
                    <option value="saint-valentin">💕 Saint-Valentin</option>
                    <option value="anniversaire-rencontre">💑 Anniversaire de rencontre</option>
                    <option value="autre">🎯 Autre</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="hasTargetDate"
                    checked={createEventData.hasTargetDate}
                    onChange={(e) => setCreateEventData(prev => ({ ...prev, hasTargetDate: e.target.checked }))}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="hasTargetDate" className="text-sm text-gray-700">
                    Cet événement a une date cible
                  </label>
                </div>
                
                {createEventData.hasTargetDate && (
                  <div>
                    <label htmlFor="targetDate" className="block text-sm font-medium text-gray-700 mb-2">
                      Date cible
                    </label>
                    <input
                      id="targetDate"
                      type="date"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                      value={createEventData.targetDate}
                      onChange={(e) => setCreateEventData(prev => ({ ...prev, targetDate: e.target.value }))}
                    />
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPrivate"
                    checked={createEventData.isPrivate}
                    onChange={(e) => setCreateEventData(prev => ({ ...prev, isPrivate: e.target.checked }))}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="isPrivate" className="text-sm text-gray-700">
                    Événement privé (nécessite mot de passe)
                  </label>
                </div>
                
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300"
                  >
                    ➕ Créer l&apos;événement
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setCreateEventData({
                        name: '',
                        eventType: 'anniversaire',
                        hasTargetDate: true,
                        targetDate: '',
                        isPrivate: false
                      });
                    }}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Formulaire d'édition d'événement */}
      {showEditForm && editingEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">✏️ Modifier l&apos;événement</h3>
              
              <form onSubmit={handleUpdateEvent} className="space-y-4">
                <div>
                  <label htmlFor="editEventName" className="block text-sm font-medium text-gray-700 mb-2">
                    Nom de l&apos;événement
                  </label>
                  <input
                    id="editEventName"
                    type="text"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                    placeholder="Ex: Anniversaire de Mimoutte"
                    value={editEventData.name}
                    onChange={(e) => setEditEventData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                <div>
                  <label htmlFor="editEventType" className="block text-sm font-medium text-gray-700 mb-2">
                    Type d&apos;événement
                  </label>
                  <select
                    id="editEventType"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                    value={editEventData.eventType}
                    onChange={(e) => setEditEventData(prev => ({ ...prev, eventType: e.target.value }))}
                  >
                    <option value="anniversaire">🎂 Anniversaire</option>
                    <option value="noel">🎄 Noël</option>
                    <option value="saint-valentin">💕 Saint-Valentin</option>
                    <option value="anniversaire-rencontre">💑 Anniversaire de rencontre</option>
                    <option value="autre">🎯 Autre</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="editHasTargetDate"
                    checked={editEventData.hasTargetDate}
                    onChange={(e) => setEditEventData(prev => ({ ...prev, hasTargetDate: e.target.checked }))}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="editHasTargetDate" className="text-sm text-gray-700">
                    Cet événement a une date cible
                  </label>
                </div>
                
                {editEventData.hasTargetDate && (
                  <div>
                    <label htmlFor="editTargetDate" className="block text-sm font-medium text-gray-700 mb-2">
                      Date cible
                    </label>
                    <input
                      id="editTargetDate"
                      type="date"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                      value={editEventData.targetDate}
                      onChange={(e) => setEditEventData(prev => ({ ...prev, targetDate: e.target.value }))}
                    />
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="editIsPrivate"
                    checked={editEventData.isPrivate}
                    onChange={(e) => setEditEventData(prev => ({ ...prev, isPrivate: e.target.checked }))}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="editIsPrivate" className="text-sm text-gray-700">
                    Événement privé (nécessite mot de passe)
                  </label>
                </div>
                
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300"
                  >
                    ✏️ Modifier l&apos;événement
                  </button>
                  
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
