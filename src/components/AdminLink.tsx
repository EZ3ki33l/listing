'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function AdminLink({ children, className }: { children: React.ReactNode; className?: string }) {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Vérifier si l'admin est connecté
    const savedAdmin = localStorage.getItem('adminSession');
    if (savedAdmin) {
      try {
        const admin = JSON.parse(savedAdmin);
        setIsAdminLoggedIn(!!admin);
      } catch (error) {
        console.error('Erreur lors du chargement de la session:', error);
        localStorage.removeItem('adminSession');
      }
    }
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <Link href="/admin" className={className}>
        {children}
      </Link>
    );
  }

  // Si l'admin est connecté, aller directement à la page admin
  // Sinon, aller à la page de connexion
  return (
    <Link href="/admin" className={className}>
      {children}
    </Link>
  );
}
