'use client';

import { useState } from 'react';
import { initializeDefaultCategories } from '@/lib/actions';
import { useFeedback } from './Feedback';

interface DefaultCategoriesInitializerProps {
  onCategoriesCreated: () => void;
  hasExistingCategories: boolean;
}

export default function DefaultCategoriesInitializer({ 
  onCategoriesCreated, 
  hasExistingCategories 
}: DefaultCategoriesInitializerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { notify, confirm } = useFeedback();

  const handleInitialize = async () => {
    const ok = await confirm({
      title: 'Créer les catégories par défaut',
      message: "Voulez-vous créer les catégories par défaut ? Cette action ne peut être effectuée qu'une seule fois sur une base vide.",
      confirmText: 'Créer',
      type: 'info'
    });
    if (!ok) return;

    setIsLoading(true);

    try {
      const result = await initializeDefaultCategories();
      if (result.success) {
        notify('success', 'Catégories créées', result.message || 'Catégories par défaut créées avec succès !');
        onCategoriesCreated();
      } else {
        notify('error', 'Erreur', result.error);
      }
    } catch (error) {
      console.error("Erreur lors de l'initialisation des catégories:", error);
      notify('error', 'Erreur', "Erreur lors de l'initialisation des catégories");
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
