'use client';

import { useMemo, useSyncExternalStore } from 'react';

export interface StoredUser {
  id: string;
  username: string;
  email?: string;
  isAdmin?: boolean;
}

// 'storage' couvre les autres onglets, 'userLogout' ce même onglet (voir UserMenu)
function subscribe(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener('userLogout', onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener('userLogout', onChange);
  };
}

// Utilisateur gardé en localStorage pour l'affichage ; null côté serveur et avant l'hydratation
export function useStoredUser(): StoredUser | null {
  const raw = useSyncExternalStore(subscribe, () => localStorage.getItem('user'), () => null);
  return useMemo(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredUser;
    } catch (error) {
      console.error('Erreur lors de la lecture des données utilisateur:', error);
      return null;
    }
  }, [raw]);
}
