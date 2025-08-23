'use client';

import { useState, useEffect } from 'react';
import { Calendar, X } from 'lucide-react';
import { createEvent, clearDatabase, getAllActiveEvents, deleteEvent } from '@/lib/actions';

interface Event {
  id: string;
  name: string;
  eventType: string;
  targetDate: Date | null;
  hasTargetDate: boolean;
  isPrivate: boolean;
  isActive: boolean;
}

const PERSONAL_EVENTS = [
  {
    name: 'Anniversaire de Mimoutte',
    eventType: 'anniversaire',
    date: '28 septembre',
    emoji: '🎂',
    color: 'from-pink-500 to-rose-500',
    description: 'Célébration de l\'anniversaire de Mimoutte'
  },
  {
    name: 'Saint-Valentin',
    eventType: 'saint-valentin',
    date: '14 février',
    emoji: '💝',
    color: 'from-red-500 to-pink-500',
    description: 'Jour de l\'amour et de la romance'
  },
  {
    name: 'Noël',
    eventType: 'noel',
    date: '25 décembre',
    emoji: '🎄',
    color: 'from-red-500 to-green-500',
    description: 'Fête de Noël en famille'
  },
  {
    name: 'Anniversaire de notre rencontre',
    eventType: 'anniversaire-rencontre',
    date: '4 novembre',
    emoji: '💕',
    color: 'from-blue-500 to-purple-500',
    description: 'Célébration de notre rencontre'
  }
];

export default function PersonalEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [newEvent, setNewEvent] = useState({
    name: '',
    eventType: 'anniversaire',
    targetDate: '',
    description: '',
    hasTargetDate: true,
    isPrivate: false
  });

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const result = await getAllActiveEvents();
      if (result.success && result.events) {
        setEvents(result.events);
      } else {
        // Si aucun événement n'est trouvé, on garde un tableau vide
        setEvents([]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des événements:', error);
      setEvents([]);
    }
  };

  const handleClearDatabase = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const result = await clearDatabase();
      if (result.success) {
        setMessage('✅ Base de données nettoyée avec succès !');
        setEvents([]);
      } else {
        setMessage(`❌ Erreur: ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ Erreur lors du nettoyage de la base: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePersonalEvents = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const currentYear = new Date().getFullYear();
      
      // Créer les 4 événements personnels
      const events = await Promise.all([
        createEvent({
          name: 'Anniversaire de Mimoutte',
          eventType: 'anniversaire',
          targetDate: new Date(`${currentYear}-09-28T00:00:00`)
        }),
        createEvent({
          name: 'Saint-Valentin',
          eventType: 'saint-valentin',
          targetDate: new Date(`${currentYear}-02-14T00:00:00`)
        }),
        createEvent({
          name: 'Noël',
          eventType: 'noel',
          targetDate: new Date(`${currentYear}-12-25T00:00:00`)
        }),
        createEvent({
          name: 'Anniversaire de notre rencontre',
          eventType: 'anniversaire-rencontre',
          targetDate: new Date(`${currentYear}-11-04T00:00:00`)
        })
      ]);
      
      if (events.every(e => e.success)) {
        setMessage('✅ Tous vos 4 événements personnels ont été créés avec succès !');
        await loadEvents();
      } else {
        setMessage('❌ Erreur lors de la création de certains événements');
      }
    } catch (error) {
      console.error('Erreur complète:', error);
      setMessage('❌ Erreur lors de la création des événements');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCustomEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.name.trim() || (newEvent.hasTargetDate && !newEvent.targetDate)) {
      setMessage('❌ Veuillez remplir le nom et la date si elle est requise');
      return;
    }
    setIsLoading(true);
    setMessage('');
    try {
      let targetDate: Date | undefined;
      if (newEvent.hasTargetDate && newEvent.targetDate) {
        targetDate = new Date(newEvent.targetDate + 'T00:00:00');
      }
      const result = await createEvent({
        name: newEvent.name,
        eventType: newEvent.eventType,
        targetDate: targetDate,
        hasTargetDate: newEvent.hasTargetDate,
        isPrivate: newEvent.isPrivate
      });
      if (result.success) {
        setMessage('✅ Événement personnalisé créé avec succès !');
        setNewEvent({ name: '', eventType: 'anniversaire', targetDate: '', description: '', hasTargetDate: true, isPrivate: false });
        setShowCreateForm(false);
        await loadEvents();
      } else {
        setMessage(`❌ Erreur: ${result.error}`);
      }
    } catch (error) {
      console.error('Erreur complète:', error);
      setMessage('❌ Erreur lors de la création de l\'événement');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEvent = async (event: Event) => {
    setEventToDelete(event);
    setShowDeleteModal(true);
  };

  const confirmDeleteEvent = async () => {
    if (!eventToDelete) return;
    
    try {
      const result = await deleteEvent(eventToDelete.id);
      if (result.success) {
        setMessage('✅ Événement supprimé avec succès !');
        setShowDeleteModal(false);
        setEventToDelete(null);
        await loadEvents();
      } else {
        setMessage(`❌ Erreur: ${result.error}`);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      setMessage('❌ Erreur lors de la suppression de l\'événement');
    }
  };

  const getEventTypeInfo = (eventType: string) => {
    return PERSONAL_EVENTS.find(type => type.eventType === eventType);
  };

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200 p-6 mb-6 shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-indigo-600" />
        <h3 className="text-lg font-semibold text-indigo-800">🌟 Vos événements personnels</h3>
      </div>
      
      <p className="text-indigo-700 mb-4">
        Vos événements spéciaux avec leurs dates et designs personnalisés.
      </p>

      {message && (
        <div className={`p-3 rounded-lg mb-4 ${
          message.includes('✅') ? 'bg-green-100 text-green-800' : 
          message.includes('ℹ️') ? 'bg-blue-100 text-blue-800' : 
          'bg-red-100 text-red-800'
        }`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {events.length > 0 ? (
          // Afficher les événements créés dans la base
          events.map((event) => (
            <div key={event.id} className="bg-white rounded-2xl p-4 border border-indigo-200 shadow-sm hover:shadow-md transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getEventTypeInfo(event.eventType)?.color || 'from-blue-500 to-indigo-500'} flex items-center justify-center text-white text-xl`}>
                    {getEventTypeInfo(event.eventType)?.emoji || '🎉'}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800">{event.name}</h4>
                    <p className="text-sm text-gray-600">{getEventTypeInfo(event.eventType)?.description || 'Événement personnalisé'}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                      <Calendar className="w-4 h-4" />
                      {event.targetDate ? new Date(event.targetDate).toLocaleDateString('fr-FR', {
                        month: 'long',
                        day: 'numeric'
                      }) : 'Date non spécifiée'}
                      {event.isPrivate && (
                        <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
                          🔒 Privé
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteEvent(event)}
                  className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors duration-200"
                  title="Supprimer l'événement"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        ) : (
          // Afficher les événements par défaut (pas encore créés)
          PERSONAL_EVENTS.map((event, index) => (
            <div key={index} className="bg-white rounded-2xl p-4 border border-indigo-200 shadow-sm opacity-60">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${event.color} flex items-center justify-center text-white text-xl`}>
                  {event.emoji}
                </div>
                <div>
                  <h4 className="font-medium text-gray-800">{event.name}</h4>
                  <p className="text-sm text-gray-600">{event.description}</p>
                  <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                    <Calendar className="w-4 h-4" />
                    {event.date}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex justify-center gap-4 flex-wrap">
        <button
          onClick={handleClearDatabase}
          disabled={isLoading}
          className="inline-block bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium disabled:transform-none flex items-center gap-2"
        >
          🗑️ Nettoyer la base
        </button>
        <button
          onClick={handleCreatePersonalEvents}
          disabled={isLoading}
          className="inline-block bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium disabled:transform-none flex items-center gap-2"
        >
          ➕ Créer événements personnels
        </button>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          disabled={isLoading}
          className="inline-block bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium disabled:transform-none flex items-center gap-2"
        >
          ✨ Créer un événement personnalisé
        </button>
      </div>

      {/* Formulaire de création d'événement personnalisé */}
      {showCreateForm && (
        <div className="mt-6 p-4 bg-white rounded-2xl border border-indigo-200 shadow-lg">
          <h4 className="text-lg font-medium text-indigo-800 mb-4">✨ Créer un nouvel événement</h4>
          <form onSubmit={handleCreateCustomEvent} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Nom de l'événement"
                value={newEvent.name}
                onChange={(e) => setNewEvent(prev => ({ ...prev, name: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                required
              />
              <select
                value={newEvent.eventType}
                onChange={(e) => setNewEvent(prev => ({ ...prev, eventType: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
              >
                <option value="anniversaire">🎂 Anniversaire</option>
                <option value="noel">🎄 Noël</option>
                <option value="saint-valentin">💝 Saint-Valentin</option>
                <option value="anniversaire-rencontre">💕 Anniversaire de rencontre</option>
                <option value="autre">🎉 Autre</option>
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="date"
                value={newEvent.targetDate}
                onChange={(e) => setNewEvent(prev => ({ ...prev, targetDate: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                required={newEvent.hasTargetDate}
                disabled={!newEvent.hasTargetDate}
              />
              <input
                type="text"
                placeholder="Description (optionnel)"
                value={newEvent.description}
                onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hasTargetDate"
                checked={newEvent.hasTargetDate}
                onChange={(e) => setNewEvent(prev => ({ ...prev, hasTargetDate: e.target.checked }))}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="hasTargetDate" className="text-sm text-gray-700">
                Cet événement a une date spécifique (compte à rebours)
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPrivate"
                checked={newEvent.isPrivate}
                onChange={(e) => setNewEvent(prev => ({ ...prev, isPrivate: e.target.checked }))}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor="isPrivate" className="text-sm text-gray-700">
                Liste privée (nécessite le mot de passe administrateur pour y accéder)
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isLoading}
                className="inline-block bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-4 py-2 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium disabled:transform-none flex items-center gap-2"
              >
                {isLoading ? '⏳ Création...' : '✨ Créer l\'événement'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="inline-block bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white px-4 py-2 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium"
              >
                ❌ Annuler
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Modal de confirmation de suppression */}
      {showDeleteModal && eventToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md mx-auto border border-gray-100 shadow-xl">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🗑️</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Confirmer la suppression
              </h2>
              <p className="text-gray-600">
                Êtes-vous sûr de vouloir supprimer l&apos;événement « {eventToDelete.name} » ?
                <br />
                <strong>Cette action est irréversible et supprimera tous les articles associés.</strong>
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={confirmDeleteEvent}
                className="flex-1 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-4 py-2 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium"
              >
                ✅ Oui, supprimer
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium"
              >
                ❌ Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
