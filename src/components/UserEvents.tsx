'use client';

import { useState, useEffect, useCallback } from 'react';
import { getUserEvents, shareEvent, createEvent, updateEvent, hideEvent, reactivateEvent } from '@/lib/actions';
import Link from 'next/link';
import Modal from './Modal';
import { useFeedback } from './Feedback';



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
  hidePurchasesFromOwner: boolean;
  isActive: boolean;
  isHidden: boolean;
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
  const { notify } = useFeedback();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
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
    isPrivate: false,
    hidePurchasesFromOwner: true
  });
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editEventData, setEditEventData] = useState({
    name: '',
    eventType: 'anniversaire',
    hasTargetDate: true,
    targetDate: '',
    isPrivate: false,
    hidePurchasesFromOwner: true
  });

  const loadEvents = useCallback(async () => {
    try {
      const result = await getUserEvents();
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
      notify('error', 'Champ requis', "Veuillez entrer un nom d'utilisateur");
      return;
    }

    try {
      const result = await shareEvent(selectedEvent.id, shareData.targetUsername, shareData.canEdit);
      if (result.success) {
        notify('success', 'Événement partagé', result.message);
        setShowShareForm(false);
        setSelectedEvent(null);
        setShareData({ targetUsername: '', canEdit: false });
      } else {
        notify('error', 'Erreur', result.error);
      }
    } catch (error) {
      console.error("Erreur lors du partage:", error);
      notify('error', 'Erreur', "Erreur lors du partage");
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createEventData.name.trim()) {
      notify('error', 'Champ requis', "Veuillez entrer un nom pour l'événement");
      return;
    }

    try {
      const eventData = {
        name: createEventData.name,
        eventType: createEventData.eventType,
        targetDate: createEventData.hasTargetDate && createEventData.targetDate ? new Date(createEventData.targetDate) : undefined,
        hasTargetDate: createEventData.hasTargetDate,
        isPrivate: createEventData.isPrivate,
        hidePurchasesFromOwner: createEventData.hidePurchasesFromOwner
      };

      const result = await createEvent(eventData);
      if (result.success) {
        notify('success', 'Événement créé', "L'événement a été créé avec succès.");
        setShowCreateForm(false);
        setCreateEventData({
          name: '',
          eventType: 'anniversaire',
          hasTargetDate: true,
          targetDate: '',
          isPrivate: false,
          hidePurchasesFromOwner: true
        });
        // Recharger les événements
        await loadEvents();
      } else {
        notify('error', 'Erreur', result.error);
      }
    } catch (error) {
      console.error("Erreur lors de la création de l'événement:", error);
      notify('error', 'Erreur', "Erreur lors de la création de l'événement");
    }
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setEditEventData({
      name: event.name,
      eventType: event.eventType,
      hasTargetDate: event.hasTargetDate,
      targetDate: event.targetDate ? new Date(event.targetDate).toISOString().split('T')[0] : '',
      isPrivate: event.isPrivate,
      hidePurchasesFromOwner: event.hidePurchasesFromOwner
    });
    setShowEditForm(true);
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent || !editEventData.name.trim()) {
      notify('error', 'Champ requis', "Veuillez entrer un nom d'événement");
      return;
    }

    try {
      const result = await updateEvent(editingEvent.id, {
        name: editEventData.name,
        eventType: editEventData.eventType,
        targetDate: editEventData.hasTargetDate && editEventData.targetDate ? new Date(editEventData.targetDate) : null,
        hasTargetDate: editEventData.hasTargetDate,
        isPrivate: editEventData.isPrivate,
        hidePurchasesFromOwner: editEventData.hidePurchasesFromOwner
      });

      if (result.success) {
        notify('success', 'Événement modifié', "L'événement a été modifié avec succès.");
        setShowEditForm(false);
        setEditingEvent(null);
        await loadEvents();
      } else {
        notify('error', 'Erreur', result.error);
      }
    } catch (error) {
      console.error("Erreur lors de la modification de l'événement:", error);
      notify('error', 'Erreur', "Erreur lors de la modification de l'événement");
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
      isPrivate: false,
      hidePurchasesFromOwner: true
    });
  };

  const handleHideEvent = async (eventId: string) => {
    try {
      const result = await hideEvent(eventId);
      if (result.success) {
        notify('success', 'Événement masqué', "L'événement a été masqué avec succès.");
        await loadEvents();
      } else {
        notify('error', 'Erreur', result.error);
      }
    } catch (error) {
      console.error("Erreur lors du masquage de l'événement:", error);
      notify('error', 'Erreur', "Erreur lors du masquage de l'événement");
    }
  };

  const handleReactivateEvent = async (eventId: string) => {
    try {
      const result = await reactivateEvent(eventId);
      if (result.success) {
        notify('success', 'Événement réactivé', "L'événement a été réactivé avec succès.");
        await loadEvents();
      } else {
        notify('error', 'Erreur', result.error);
      }
    } catch (error) {
      console.error("Erreur lors de la réactivation de l'événement:", error);
      notify('error', 'Erreur', "Erreur lors de la réactivation de l'événement");
    }
  };

  // Afficher un loader pendant l'initialisation pour éviter le clipping
  if (isInitializing) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ink mx-auto"></div>
        <p className="mt-4 text-ink">Initialisation...</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ink mx-auto"></div>
        <p className="mt-4 text-ink">Chargement de vos événements...</p>
      </div>
    );
  }

  const ownedEvents = events.filter(event => event.isOwned);
  const sharedEvents = events.filter(event => !event.isOwned);
  
  // Séparer les événements visibles et masqués
  const visibleOwnedEvents = ownedEvents.filter(event => !event.isHidden);
  const hiddenOwnedEvents = ownedEvents.filter(event => event.isHidden);

  return (
    <div className="space-y-8">
      {/* Événements personnels */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl sm:text-3xl uppercase flex items-center gap-3">
            🏠 Mes événements
            <span className="label !bg-razzmatazz">
              {visibleOwnedEvents.length}
            </span>
            {hiddenOwnedEvents.length > 0 && (
              <span className="label">
                {hiddenOwnedEvents.length} masqué(s)
              </span>
            )}
          </h3>
          
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-block text-white px-4 py-2 rounded-none transition-all border-[3px] border-ink  font-medium bg-razzmatazz hover:bg-ink shadow-[4px_4px_0_#0a0a0a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0a0a0a]"
          >
            ➕ Nouvel événement
          </button>
        </div>
        
        {ownedEvents.length === 0 ? (
          <div className="text-center py-8 bg-paper border-[3px] border-dashed border-ink min-h-[200px] flex items-center justify-center">
            <div>
              <p className="text-ink">Vous n&apos;avez pas encore créé d&apos;événements.</p>
              <div className="mt-4">
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="inline-block text-white px-6 py-3 rounded-none transition-all border-[3px] border-ink  font-medium bg-razzmatazz hover:bg-ink shadow-[4px_4px_0_#0a0a0a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0a0a0a]"
                >
                  ➕ Créer mon premier événement
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Événements visibles */}
            {visibleOwnedEvents.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {visibleOwnedEvents.map((event) => (
                  <div key={event.id} className="bg-white rounded-none border-[3px] border-ink shadow-[5px_5px_0_#0a0a0a] p-6 transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="text-lg font-semibold text-ink">{event.name}</h4>
                      <span className="label !bg-heliotrope !text-ink">
                        Personnel
                      </span>
                    </div>
                    
                    <p className="text-sm text-ink mb-4">
                      Type: {event.eventType} • {event.hasTargetDate && event.targetDate ? 'Avec date' : 'Sans date'}
                    </p>
                    
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/liste?event=${event.id}`}
                        className="flex-1 text-white px-4 py-2 rounded-none text-center text-sm font-medium transition-all bg-razzmatazz hover:bg-ink border-[3px] border-ink shadow-[4px_4px_0_#0a0a0a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0a0a0a]"
                      >
                        🛍️ Voir la liste
                      </Link>
                      
                      <button
                        onClick={() => handleEditEvent(event)}
                        className="text-white px-3 py-2 rounded-none text-sm font-medium transition-all bg-razzmatazz hover:bg-ink border-[3px] border-ink shadow-[4px_4px_0_#0a0a0a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0a0a0a]"
                        title="Modifier cet événement"
                      >
                        ✏️
                      </button>
                      
                      <button
                        onClick={() => {
                          setSelectedEvent(event);
                          setShowShareForm(true);
                        }}
                        className="text-white px-3 py-2 rounded-none text-sm font-medium transition-all bg-razzmatazz hover:bg-ink border-[3px] border-ink shadow-[4px_4px_0_#0a0a0a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0a0a0a]"
                        title="Partager cet événement"
                      >
                        📤
                      </button>
                      
                      <button
                        onClick={() => handleHideEvent(event.id)}
                        className="text-white px-3 py-2 rounded-none text-sm font-medium transition-all bg-razzmatazz hover:bg-ink border-[3px] border-ink shadow-[4px_4px_0_#0a0a0a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0a0a0a]"
                        title="Masquer cet événement"
                      >
                        👁️‍🗨️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Événements masqués */}
            {hiddenOwnedEvents.length > 0 && (
              <div className="mt-8">
                <h4 className="text-xl font-semibold text-ink mb-4 flex items-center gap-2">
                  👁️‍🗨️ Événements masqués
                  <span className="label">
                    {hiddenOwnedEvents.length}
                  </span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {hiddenOwnedEvents.map((event) => (
                    <div key={event.id} className="bg-heliotrope/20 rounded-none border-[3px] border-ink shadow-[5px_5px_0_#0a0a0a] p-6 transition-all opacity-75">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="text-lg font-semibold text-ink">{event.name}</h4>
                        <span className="text-xs bg-gray-300 text-ink px-2 py-1 rounded-none">
                          Masqué
                        </span>
                      </div>
                      
                      <p className="text-sm text-ink/60 mb-4">
                        Type: {event.eventType} • {event.hasTargetDate && event.targetDate ? 'Avec date' : 'Sans date'}
                      </p>
                      
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/liste?event=${event.id}`}
                          className="flex-1 text-white px-4 py-2 rounded-none text-center text-sm font-medium transition-all bg-razzmatazz hover:bg-ink border-[3px] border-ink shadow-[4px_4px_0_#0a0a0a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0a0a0a]"
                        >
                          🛍️ Voir la liste
                        </Link>
                        
                        <button
                          onClick={() => handleReactivateEvent(event.id)}
                          className="text-white px-4 py-2 rounded-none text-sm font-medium transition-all bg-razzmatazz hover:bg-ink border-[3px] border-ink shadow-[4px_4px_0_#0a0a0a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0a0a0a]"
                          title="Réactiver cet événement"
                        >
                          {(event.eventType === 'anniversaire' || event.eventType === 'noel') ? '🔄 Réactiver (+1 an)' : '🔄 Réactiver'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Événements partagés */}
      <div>
        <h3 className="text-2xl sm:text-3xl uppercase mb-6 flex items-center gap-3">
          🤝 Événements partagés avec moi
          <span className="label !bg-razzmatazz">
            {sharedEvents.length}
          </span>
        </h3>
        
        {sharedEvents.length === 0 ? (
          <div className="text-center py-8 bg-paper border-[3px] border-dashed border-ink min-h-[200px] flex items-center justify-center">
            <p className="text-ink">Aucun événement partagé avec vous pour le moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sharedEvents.map((event) => (
              <div key={event.id} className="bg-white rounded-none border-[3px] border-ink shadow-[5px_5px_0_#0a0a0a] p-6 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-lg font-semibold text-ink">{event.name}</h4>
                  <span className="label !bg-malachite !text-ink">
                    Partagé par {event.sharedBy}
                  </span>
                </div>
                
                <p className="text-sm text-ink mb-4">
                  Type: {event.eventType} • {event.hasTargetDate && event.targetDate ? 'Avec date' : 'Sans date'}
                  {event.canEdit && ' • Vous pouvez modifier'}
                </p>
                
                <Link
                  href={`/liste?event=${event.id}`}
                  className="block w-full text-white px-4 py-2 rounded-none text-center text-sm font-medium transition-all bg-razzmatazz hover:bg-ink border-[3px] border-ink shadow-[4px_4px_0_#0a0a0a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0a0a0a]"
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
        <Modal open onClose={() => { setShowShareForm(false); setSelectedEvent(null); }} labelledBy="share-title">
          <div className="bg-white rounded-none border-[3px] border-ink shadow-[5px_5px_0_#0a0a0a] max-w-md w-full mx-4">
            <div className="p-6">
              <h3 id="share-title" className="text-xl font-bold text-ink mb-4">
                📤 Partager &quot;{selectedEvent.name}&quot;
              </h3>
              
              <form onSubmit={handleShare} className="space-y-4">
                <div>
                  <label htmlFor="targetUsername" className="block text-sm font-medium text-ink mb-2">
                    Nom d&apos;utilisateur
                  </label>
                  <input
                    id="targetUsername"
                    type="text"
                    required
                    className="w-full px-4 py-3 border border-ink rounded-none focus:outline-none focus:ring-2 focus:ring-razzmatazz focus:border-ink text-ink"
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
                    className="w-4 h-4 text-razzmatazz border-ink rounded-none focus:ring-razzmatazz"
                  />
                  <label htmlFor="canEdit" className="text-sm text-ink">
                    L&apos;utilisateur peut modifier la liste
                  </label>
                </div>
                
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 text-white px-4 py-2 rounded-none font-medium transition-all bg-razzmatazz hover:bg-ink border-[3px] border-ink shadow-[4px_4px_0_#0a0a0a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0a0a0a]"
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
                    className="btn flex-1"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal de création d'événement */}
      {showCreateForm && (
        <Modal open onClose={() => setShowCreateForm(false)} labelledBy="create-title">
          <div className="bg-white rounded-none border-[3px] border-ink shadow-[5px_5px_0_#0a0a0a] max-w-md w-full mx-4">
            <div className="p-6">
              <h3 id="create-title" className="text-xl font-bold text-ink mb-4">
                ➕ Créer un nouvel événement
              </h3>
              
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div>
                  <label htmlFor="eventName" className="block text-sm font-medium text-ink mb-2">
                    Nom de l&apos;événement
                  </label>
                  <input
                    id="eventName"
                    type="text"
                    required
                    className="w-full px-4 py-3 border border-ink rounded-none focus:outline-none focus:ring-2 focus:ring-razzmatazz focus:border-ink text-ink"
                    placeholder="Ex: Anniversaire de Mimoutte"
                    value={createEventData.name}
                    onChange={(e) => setCreateEventData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                <div>
                  <label htmlFor="eventType" className="block text-sm font-medium text-ink mb-2">
                    Type d&apos;événement
                  </label>
                  <select
                    id="eventType"
                    className="w-full px-4 py-3 border border-ink rounded-none focus:outline-none focus:ring-2 focus:ring-razzmatazz focus:border-ink text-ink"
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
                    className="w-4 h-4 text-razzmatazz border-ink rounded-none focus:ring-razzmatazz"
                  />
                  <label htmlFor="hasTargetDate" className="text-sm text-ink">
                    Cet événement a une date cible
                  </label>
                </div>
                
                {createEventData.hasTargetDate && (
                  <div>
                    <label htmlFor="targetDate" className="block text-sm font-medium text-ink mb-2">
                      Date cible
                    </label>
                    <input
                      id="targetDate"
                      type="date"
                      className="w-full px-4 py-3 border border-ink rounded-none focus:outline-none focus:ring-2 focus:ring-razzmatazz focus:border-ink text-ink"
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
                    className="w-4 h-4 text-razzmatazz border-ink rounded-none focus:ring-razzmatazz"
                  />
                  <label htmlFor="isPrivate" className="text-sm text-ink">
                    Événement privé (nécessite mot de passe)
                  </label>
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="createHidePurchases"
                    checked={createEventData.hidePurchasesFromOwner}
                    onChange={(e) => setCreateEventData(prev => ({ ...prev, hidePurchasesFromOwner: e.target.checked }))}
                    className="w-4 h-4 text-razzmatazz border-ink rounded-none focus:ring-razzmatazz"
                  />
                  <label htmlFor="createHidePurchases" className="text-sm text-ink">
                    Cacher les achats au propriétaire (garde la surprise)
                  </label>
                </div>
                
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 text-white px-4 py-2 rounded-none font-medium transition-all bg-razzmatazz hover:bg-ink border-[3px] border-ink shadow-[4px_4px_0_#0a0a0a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0a0a0a]"
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
                        isPrivate: false,
                        hidePurchasesFromOwner: true
                      });
                    }}
                    className="btn flex-1"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Modal>
      )}

      {/* Formulaire d'édition d'événement */}
      {showEditForm && editingEvent && (
        <Modal open onClose={cancelEdit} labelledBy="edit-title">
          <div className="bg-white rounded-none border-[3px] border-ink shadow-[5px_5px_0_#0a0a0a] max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 id="edit-title" className="text-xl font-semibold text-ink mb-4">✏️ Modifier l&apos;événement</h3>
              
              <form onSubmit={handleUpdateEvent} className="space-y-4">
                <div>
                  <label htmlFor="editEventName" className="block text-sm font-medium text-ink mb-2">
                    Nom de l&apos;événement
                  </label>
                  <input
                    id="editEventName"
                    type="text"
                    required
                    className="w-full px-4 py-3 border border-ink rounded-none focus:outline-none focus:ring-2 focus:ring-razzmatazz focus:border-ink text-ink"
                    placeholder="Ex: Anniversaire de Mimoutte"
                    value={editEventData.name}
                    onChange={(e) => setEditEventData(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                
                <div>
                  <label htmlFor="editEventType" className="block text-sm font-medium text-ink mb-2">
                    Type d&apos;événement
                  </label>
                  <select
                    id="editEventType"
                    className="w-full px-4 py-3 border border-ink rounded-none focus:outline-none focus:ring-2 focus:ring-razzmatazz focus:border-ink text-ink"
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
                    className="w-4 h-4 text-razzmatazz border-ink rounded-none focus:ring-razzmatazz"
                  />
                  <label htmlFor="editHasTargetDate" className="text-sm text-ink">
                    Cet événement a une date cible
                  </label>
                </div>
                
                {editEventData.hasTargetDate && (
                  <div>
                    <label htmlFor="editTargetDate" className="block text-sm font-medium text-ink mb-2">
                      Date cible
                    </label>
                    <input
                      id="editTargetDate"
                      type="date"
                      className="w-full px-4 py-3 border border-ink rounded-none focus:outline-none focus:ring-2 focus:ring-razzmatazz focus:border-ink text-ink"
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
                    className="w-4 h-4 text-razzmatazz border-ink rounded-none focus:ring-razzmatazz"
                  />
                  <label htmlFor="editIsPrivate" className="text-sm text-ink">
                    Événement privé (nécessite mot de passe)
                  </label>
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="editHidePurchases"
                    checked={editEventData.hidePurchasesFromOwner}
                    onChange={(e) => setEditEventData(prev => ({ ...prev, hidePurchasesFromOwner: e.target.checked }))}
                    className="w-4 h-4 text-razzmatazz border-ink rounded-none focus:ring-razzmatazz"
                  />
                  <label htmlFor="editHidePurchases" className="text-sm text-ink">
                    Cacher les achats au propriétaire (garde la surprise)
                  </label>
                </div>
                
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 text-white px-4 py-2 rounded-none font-medium transition-all bg-razzmatazz hover:bg-ink border-[3px] border-ink shadow-[4px_4px_0_#0a0a0a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0a0a0a]"
                  >
                    ✏️ Modifier l&apos;événement
                  </button>
                  
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="btn flex-1"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
