'use client';

import { useState, useEffect } from 'react';
import { getAllActiveEvents } from '@/lib/actions';
import { useStoredUser } from '@/lib/useStoredUser';
import { Calendar, Clock } from 'lucide-react';
import Link from 'next/link';

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
      return { emoji: '🎂', color: ' ', label: 'Anniversaire' };
    case 'noel':
      return { emoji: '🎄', color: ' ', label: 'Noël' };
    case 'saint-valentin':
      return { emoji: '💝', color: ' ', label: 'Saint-Valentin' };
    case 'anniversaire-rencontre':
      return { emoji: '💕', color: ' ', label: 'Anniversaire de rencontre' };
    default:
      return { emoji: '🎉', color: ' ', label: 'Événement' };
  }
};

export default function EventsOverview() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const userId = useStoredUser()?.id ?? null;

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
  }, [userId]);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ink mx-auto"></div>
        <p className="mt-2 text-ink">Chargement des événements...</p>
      </div>
    );
  }

  if (events.length === 0) {
    // Si l'utilisateur n'est pas connecté, afficher un message d'invitation
    if (!userId) {
      return (
        <div className="bg-white rounded-none border-[3px] border-ink shadow-[5px_5px_0_#0a0a0a] p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-razzmatazz" />
            <h2 className="text-xl font-semibold text-ink">📅 Aperçu de vos événements</h2>
          </div>
          <div className="text-center py-8">
            <div className="text-4xl mb-2">🔐</div>
            <p className="text-ink">Connectez-vous pour voir vos événements</p>
            <p className="text-sm text-ink/60 mt-2">Créez un compte ou connectez-vous pour organiser vos événements</p>
            <div className="mt-4 space-x-4">
              <Link
                href="/user"
                className="btn"
              >
                🔑 Se connecter
              </Link>
            </div>
          </div>
        </div>
      );
    }
    
    // Si l'utilisateur est connecté mais n'a pas d'événements
    return (
      <div className="bg-white rounded-none border-[3px] border-ink shadow-[5px_5px_0_#0a0a0a] p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-razzmatazz" />
          <h2 className="text-xl font-semibold text-ink">📅 Aperçu de vos événements</h2>
        </div>
        <div className="text-center py-8">
          <div className="text-4xl mb-2">🎉</div>
          <p className="text-ink">Vous n&apos;avez pas encore d&apos;événements</p>
          <p className="text-sm text-ink/60 mt-2">Créez votre premier événement pour commencer !</p>
        </div>
      </div>
    );
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
    <div className="bg-white rounded-none border-[3px] border-ink shadow-[5px_5px_0_#0a0a0a] p-6 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-razzmatazz" />
        <h2 className="text-xl font-semibold text-ink">📅 Aperçu de vos événements</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedEvents.map((event) => {
          const typeInfo = getEventTypeInfo(event.eventType);
          const isUpcoming = event.daysUntil <= 30 && event.daysUntil > 0;
          
          return (
            <div key={event.id} className="border border-ink rounded-none p-4 transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-none ${typeInfo.color} flex items-center justify-center text-white text-lg bg-razzmatazz hover:bg-ink border-[3px] border-ink shadow-[4px_4px_0_#0a0a0a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0a0a0a] transition-all`}>
                  {typeInfo.emoji}
                </div>
                <div>
                  <h3 className="font-medium text-ink text-sm">{event.name}</h3>
                  <p className="text-xs text-ink">{typeInfo.label}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-xs text-ink/60 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(event.targetDate!).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </p>
                
                <div className={`text-center p-2 rounded-none text-xs font-medium ${
                  isUpcoming 
                    ? 'bg-green-100 text-green-800' 
                    : event.daysUntil <= 0 
                    ? 'bg-blue-100 text-razzmatazz'
                    : 'bg-heliotrope/20 text-ink'
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
        <p className="text-sm text-ink">
          {sortedEvents.filter(e => e.daysUntil <= 30 && e.daysUntil > 0).length > 0 
            ? '🎯 Un événement arrive bientôt ! Consultez la page d\'accueil pour le compte à rebours.'
            : '📋 Aucun événement dans les 30 prochains jours. Consultez vos listes d\'achats !'
          }
        </p>
      </div>
    </div>
  );
}
