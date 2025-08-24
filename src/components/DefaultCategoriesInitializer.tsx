'use client';

import { useState } from 'react';
import { initializeDefaultCategories } from '@/lib/actions';

interface DefaultCategoriesInitializerProps {
  onCategoriesCreated: () => void;
  hasExistingCategories: boolean;
}

export default function DefaultCategoriesInitializer({ 
  onCategoriesCreated, 
  hasExistingCategories 
}: DefaultCategoriesInitializerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleInitialize = async () => {
    if (!confirm('Voulez-vous créer les catégories par défaut ? Cette action ne peut être effectuée qu\'une seule fois sur une base vide.')) return;

    setIsLoading(true);
    setMessage('');
    
    try {
      const result = await initializeDefaultCategories();
      if (result.success) {
        setMessage(result.message || '✅ Catégories par défaut créées avec succès !');
        onCategoriesCreated();
        // Effacer le message après 5 secondes
        setTimeout(() => setMessage(''), 5000);
      } else {
        setMessage(`❌ Erreur: ${result.error}`);
      }
    } catch (error) {
      setMessage(`❌ Erreur lors de l'initialisation des catégories: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (hasExistingCategories) {
    return null; // Ne pas afficher si des catégories existent déjà
  }

  return (
    <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
      <div className="flex items-start gap-3">
        <div className="text-purple-600 text-xl">🎯</div>
        <div className="flex-1">
          <h4 className="font-medium text-purple-800 mb-2">Initialiser les catégories par défaut</h4>
          <p className="text-purple-700 text-sm mb-3">
            Créez automatiquement 15 catégories prédéfinies pour organiser vos listes de courses : 
            vêtements & chaussures, électronique & tech, livres & médias, beauté & soins, cuisine & maison, 
            gaming & loisirs, sport & fitness, bijoux & accessoires, santé & bien-être, bricolage & jardinage, 
            alimentation & boissons, décoration & art, outils & équipements, mode & accessoires et loisirs & hobbies.
          </p>
          
          {message && (
            <div className={`px-3 py-2 rounded-lg text-sm mb-3 ${
              message.includes('✅') 
                ? 'bg-green-100 border border-green-200 text-green-700' 
                : 'bg-red-100 border border-red-200 text-red-700'
            }`}>
              {message}
            </div>
          )}
          
          <button
            onClick={handleInitialize}
            disabled={isLoading}
            className="inline-block bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-2 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-medium disabled:transform-none disabled:cursor-not-allowed"
          >
            {isLoading ? '⏳ Création en cours...' : '🚀 Créer les catégories par défaut'}
          </button>
        </div>
      </div>
    </div>
  );
}
