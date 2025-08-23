'use client';

import { useState, useEffect } from 'react';
import { getActiveEvent, createEvent } from '@/lib/actions';
import { Plus } from 'lucide-react';

interface Event {
  id: string;
  name: string;
  eventType: string;
  targetDate: Date | null;
  isActive: boolean;
}

const EVENT_TYPES = [
  { value: 'anniversaire', label: 'Anniversaire', emoji: '🎂', color: 'from-pink-500 to-rose-500' },
  { value: 'noel', label: 'Noël', emoji: '🎄', color: 'from-red-500 to-green-500' },
  { value: 'saint-valentin', label: 'Saint-Valentin', emoji: '💝', color: 'from-red-500 to-pink-500' },
  { value: 'anniversaire-rencontre', label: 'Anniversaire de rencontre', emoji: '💕', color: 'from-blue-500 to-purple-500' }
];

export default function EventManager() {
  const [events, setEvents] = useState<Event[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    eventType: 'anniversaire',
    targetDate: ''
  });

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const result = await getActiveEvent();
      if (result.success && result.event) {
        setEvents([result.event]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des événements:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const result = await createEvent({
        name: formData.name,
        eventType: formData.eventType,
        targetDate: new Date(formData.targetDate),
      });

      if (result.success) {
        setMessage('✅ Événement créé avec succès !');
        setFormData({
          name: '',
          eventType: 'anniversaire',
          targetDate: '',
        });
        
        // L'événement a été créé avec succès
        
        // Recharger les événements
        await loadEvents();
        
        // Fermer le formulaire
        setShowForm(false);
      } else {
        setMessage(`❌ Erreur: ${result.error}`);
      }
    } catch {
      setMessage('❌ Erreur lors de la création de l&apos;événement');
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Gestion des événements</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {showForm ? 'Annuler' : 'Nouvel événement'}
        </button>
      </div>

      {message && (
        <div className={`p-3 rounded-lg mb-4 ${
          message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <input
              type="text"
              placeholder="Nom de l&apos;événement"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <select
              value={formData.eventType}
              onChange={(e) => setFormData(prev => ({ ...prev, eventType: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {EVENT_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.emoji} {type.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-4">
            <input
              type="datetime-local"
              value={formData.targetDate}
              onChange={(e) => setFormData(prev => ({ ...prev, targetDate: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium"
          >
            {isLoading ? 'Création...' : 'Créer l&apos;événement'}
          </button>
        </form>
      )}

      <div className="space-y-4">
        {events.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Aucun événement personnalisé créé pour le moment.</p>
            <p className="text-sm mt-2">Utilisez le formulaire ci-dessus pour créer un nouvel événement.</p>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-600">
            <p>{events.length} événement(s) créé(s) avec succès !</p>
            <p className="text-sm mt-1">Vos événements sont maintenant visibles sur la page d&apos;accueil.</p>
          </div>
        )}
      </div>
    </div>
  );
}
