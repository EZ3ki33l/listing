'use client';

import { useState, useEffect } from 'react';
import { getAllActiveEvents } from '@/lib/actions';
import { Calendar, Clock } from 'lucide-react';

interface Event {
  id: string;
  name: string;
  eventType: string;
  targetDate: Date | null;
  isActive: boolean;
}

const getEventTypeInfo = (eventType: string) => {
  switch (eventType) {
    case 'anniversaire':
      return { emoji: '🎂', color: 'from-pink-500 to-rose-500', label: 'Anniversaire' };
    case 'noel':
      return { emoji: '🎄', color: 'from-red-500 to-green-500', label: 'Noël' };
    case 'saint-valentin':
      return { emoji: '💝', color: 'from-red-500 to-pink-500', label: 'Saint-Valentin' };
    case 'anniversaire-rencontre':
      return { emoji: '💕', color: 'from-blue-500 to-purple-500', label: 'Anniversaire de rencontre' };
    default:
      return { emoji: '🎉', color: 'from-blue-500 to-indigo-500', label: 'Événement' };
  }
};

export default function EventsOverview() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const result = await getAllActiveEvents();
        if (result.success && result.events) {
          setEvents(result.events);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des événements:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadEvents();
  }, []);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Chargement des événements...</p>
      </div>
    );
  }

  if (events.length === 0) {
    return null;
  }

  const now = new Date();
  const sortedEvents = events
    .filter(event => event.targetDate) // Filtrer les événements avec une date
    .map(event => ({
      ...event,
      daysUntil: Math.ceil((new Date(event.targetDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    }))
    .sort((a, b) => a.daysUntil - b.daysUntil);

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-800">📅 Aperçu de vos événements</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedEvents.map((event) => {
          const typeInfo = getEventTypeInfo(event.eventType);
          const isUpcoming = event.daysUntil <= 30 && event.daysUntil > 0;
          
          return (
            <div key={event.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${typeInfo.color} flex items-center justify-center text-white text-lg`}>
                  {typeInfo.emoji}
                </div>
                <div>
                  <h3 className="font-medium text-gray-800 text-sm">{event.name}</h3>
                  <p className="text-xs text-gray-600">{typeInfo.label}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(event.targetDate!).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </p>
                
                <div className={`text-center p-2 rounded text-xs font-medium ${
                  isUpcoming 
                    ? 'bg-green-100 text-green-800' 
                    : event.daysUntil <= 0 
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {event.daysUntil > 0 
                    ? `${event.daysUntil} jours` 
                    : event.daysUntil === 0 
                    ? 'Aujourd\'hui' 
                    : 'Passé'
                  }
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          {sortedEvents.filter(e => e.daysUntil <= 30 && e.daysUntil > 0).length > 0 
            ? '🎯 Un événement arrive bientôt ! Consultez la page d\'accueil pour le compte à rebours.'
            : '📋 Aucun événement dans les 30 prochains jours. Consultez vos listes d\'achats !'
          }
        </p>
      </div>
    </div>
  );
}
