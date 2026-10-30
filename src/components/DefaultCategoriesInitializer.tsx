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
    <div className="mb-6 p-4 rounded-none border border-purple-200 bg-paper">
      <div className="flex items-start gap-3">
        <div className="text-razzmatazz text-xl">🎯</div>
        <div className="flex-1">
          <h4 className="font-medium text-razzmatazz mb-2">Initialiser les catégories par défaut</h4>
          <p className="text-razzmatazz text-sm mb-3">
            Créez automatiquement 15 catégories prédéfinies pour organiser vos listes de courses : 
            vêtements & chaussures, électronique & tech, livres & médias, beauté & soins, cuisine & maison, 
            gaming & loisirs, sport & fitness, bijoux & accessoires, santé & bien-être, bricolage & jardinage, 
            alimentation & boissons, décoration & art, outils & équipements, mode & accessoires et loisirs & hobbies.
          </p>
          
          <button
            onClick={handleInitialize}
            disabled={isLoading}
            className="inline-block text-white px-6 py-2 rounded-none transition-all border-[3px] border-ink shadow-[5px_5px_0_#0a0a0a] font-medium disabled:transform-none disabled:cursor-not-allowed bg-razzmatazz hover:bg-ink shadow-[4px_4px_0_#0a0a0a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0a0a0a] disabled:opacity-50"
          >
            {isLoading ? '⏳ Création en cours...' : '🚀 Créer les catégories par défaut'}
          </button>
        </div>
      </div>
    </div>
  );
}
