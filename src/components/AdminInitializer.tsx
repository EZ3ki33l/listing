'use client';

import { useEffect } from 'react';
import { ensureAdminExists } from '@/lib/actions';

export default function AdminInitializer() {
  useEffect(() => {
    // S'assurer qu'un admin existe au démarrage de l'app
    const initializeAdmin = async () => {
      try {
        await ensureAdminExists();
      } catch (error) {
        console.error('Erreur lors de l\'initialisation de l\'admin:', error);
      }
    };

    initializeAdmin();
  }, []);

  // Ce composant ne rend rien visuellement
  return null;
}