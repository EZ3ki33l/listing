'use client';

import { useState, useEffect } from 'react';
import { getAllActiveEvents } from '@/lib/actions';
import { ShoppingCart, Plus, Calendar } from 'lucide-react';



interface Event {
  id: string;
  name: string;
  eventType: string;
  targetDate: Date | null;
  items: Array<{
    id: string;
    name: string;
    description: string | null;
    price: number | null;
    purchaseUrl: string | null; // Lien d'achat (ex: Amazon, etc.)
    isPurchased: boolean;
  }>;
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

export default function ShoppingListsManager() {
  const [events, setEvents] = useState<Event[]>([]);

  const [message, setMessage] = useState('');

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const result = await getAllActiveEvents();
      if (result.success && result.events) {
        setEvents(result.events);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des événements:', error);
    }
  };

  const handleCreateLists = async () => {
    setMessage('ℹ️ La création automatique de listes est désactivée. Créez vos listes manuellement via le formulaire d&apos;ajout d&apos;articles.');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">📋 Gestion des listes d&apos;achats</h2>
        <button
          onClick={handleCreateLists}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Information
        </button>
      </div>

      {message && (
        <div className={`p-3 rounded-lg mb-6 ${
          message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message}
        </div>
      )}

      <div className="space-y-6">
        {events.map((event) => {
          const typeInfo = getEventTypeInfo(event.eventType);
          const totalItems = event.items.length;
          const purchasedItems = event.items.filter(item => item.isPurchased).length;
          const progress = totalItems > 0 ? (purchasedItems / totalItems) * 100 : 0;
          
          return (
            <div key={event.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${typeInfo.color} flex items-center justify-center text-white text-xl`}>
                  {typeInfo.emoji}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800">{event.name}</h3>
                  <p className="text-sm text-gray-600">{typeInfo.label}</p>
                  <p className="text-sm text-gray-500">
                    <Calendar className="inline w-4 h-4 mr-1" />
                    {event.targetDate ? new Date(event.targetDate).toLocaleDateString('fr-FR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : 'Date non définie'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-blue-600">
                    {purchasedItems}/{totalItems}
                  </div>
                  <div className="text-sm text-gray-500">articles achetés</div>
                </div>
              </div>

              {/* Barre de progression */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Progression</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Articles de l'événement */}
              <div className="space-y-3">
                {event.items.length > 0 ? (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-gray-800">Articles de {event.name}</span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {event.items.length} article{event.items.length > 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p>Aucun article créé</p>
                    <p className="text-sm">Ajoutez des articles via le formulaire d&apos;ajout</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {events.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg">Aucun événement configuré</p>
          <p className="text-sm">Créez d&apos;abord des événements pour gérer leurs listes d&apos;achats</p>
        </div>
      )}
    </div>
  );
}
