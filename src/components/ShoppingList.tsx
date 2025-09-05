'use client';

import { useState } from 'react';
import ImageCarousel from './ImageCarousel';
import ThankYouModal from './ThankYouModal';

interface Photo {
  id: string;
  imageUrl: string;
  altText?: string;
  order: number;
}

interface ShoppingItem {
  id: string;
  name: string;
  description?: string;
  price?: number;
  purchaseUrl?: string; // Lien d'achat (ex: Amazon, etc.)
  isPurchased: boolean;
  purchasedBy?: string;
  photos: Photo[];
}

interface ShoppingListProps {
  eventName: string;
  eventType: string;
  items: ShoppingItem[];
  isAdmin: boolean;
  onItemToggle?: (itemId: string, isPurchased: boolean, purchaserName?: string) => void;
}

export default function ShoppingList({ eventName, eventType, items, isAdmin, onItemToggle }: ShoppingListProps) {
  const [purchaserName, setPurchaserName] = useState('');
  const [showThankYouModal, setShowThankYouModal] = useState(false);

  const handleItemToggle = (itemId: string, isPurchased: boolean, purchaserName?: string) => {
    if (onItemToggle) {
      onItemToggle(itemId, isPurchased, purchaserName);
      // Afficher la modal de remerciement seulement pour les événements d'anniversaire
      if (isPurchased && eventType === 'anniversaire') {
        setShowThankYouModal(true);
      }
    }
  };

  const handleCancelPurchase = (itemId: string) => {
    if (onItemToggle) {
      onItemToggle(itemId, false);
    }
  };

  const purchasedItems = items.filter(item => item.isPurchased);
  const remainingItems = items.filter(item => !item.isPurchased);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
        Liste des achats - {eventName}
      </h1>

      {isAdmin && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">Mode administrateur</h2>
          <p className="text-blue-600">Vous pouvez modifier la liste et voir qui a acheté quoi.</p>
        </div>
      )}

      {/* Articles restants */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
          À acheter ({remainingItems.length})
        </h2>
        {remainingItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-xl">🎉 Tous les articles ont été achetés !</p>
          </div>
        ) : (
          <div className="space-y-6">
            {remainingItems.map((item) => (
              <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Photos */}
                  <div>
                    <ImageCarousel photos={item.photos} />
                  </div>
                  
                  {/* Informations */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800">{item.name}</h3>
                      {item.description && (
                        <p className="text-gray-600 mt-2">{item.description}</p>
                      )}
                      {item.price && (
                        <p className="text-green-600 font-semibold text-lg mt-2">Prix estimé: {item.price}€</p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {!isAdmin && (
                        <input
                          type="text"
                          placeholder="Votre nom"
                          value={purchaserName}
                          onChange={(e) => setPurchaserName(e.target.value)}
                          className="border border-gray-300 rounded px-3 py-2 text-sm flex-1"
                        />
                      )}
                      <button
                        onClick={() => handleItemToggle(item.id, true, purchaserName)}
                        disabled={!isAdmin && !purchaserName.trim()}
                        className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                      >
                        Marquer comme acheté
                      </button>
                    </div>
                    
                    {/* Bouton Acheter */}
                    {item.purchaseUrl && (
                      <div className="mt-3">
                        <a
                          href={item.purchaseUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          🛒 Acheter
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Articles achetés */}
      {purchasedItems.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">
            Achetés ({purchasedItems.length})
          </h2>
          <div className="space-y-6">
            {purchasedItems.map((item) => (
              <div key={item.id} className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Photos */}
                  <div>
                    <ImageCarousel photos={item.photos} />
                  </div>
                  
                  {/* Informations */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 line-through">{item.name}</h3>
                      {item.description && (
                        <p className="text-gray-600 mt-2 line-through">{item.description}</p>
                      )}
                      {item.price && (
                        <p className="text-green-600 font-semibold text-lg mt-2">Prix: {item.price}€</p>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">
                          Acheté par: <span className="font-medium">{item.purchasedBy || 'Anonyme'}</span>
                        </p>
                      </div>
                      
                      <div className="flex space-x-2">
                        {/* Bouton d'annulation pour l'acheteur ou l'admin */}
                        {(isAdmin || purchaserName === item.purchasedBy) && (
                          <button
                            onClick={() => handleCancelPurchase(item.id)}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            Annuler l&apos;achat
                          </button>
                        )}
                        
                        {/* Bouton d'annulation pour l'admin uniquement */}
                        {isAdmin && (
                          <button
                            onClick={() => handleItemToggle(item.id, false)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            Annuler (Admin)
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Bouton Acheter (pour référence) */}
                    {item.purchaseUrl && (
                      <div className="mt-3">
                        <a
                          href={item.purchaseUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                          🔗 Voir le lien
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de remerciement */}
      <ThankYouModal 
        isOpen={showThankYouModal} 
        onClose={() => setShowThankYouModal(false)} 
      />
    </div>
  );
}
