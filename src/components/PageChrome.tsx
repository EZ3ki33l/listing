import Link from 'next/link';
import type { ReactNode } from 'react';

// Écran de chargement commun à toutes les pages
export function PageLoader({ message }: { message: string }) {
  return (
    <div className="min-h-dvh bg-stripes flex items-center justify-center p-5">
      <p role="status" className="brut px-6 py-4 font-mono font-bold uppercase tracking-widest">
        {message}
      </p>
    </div>
  );
}

// Barre du haut : logo + actions (retour, menu utilisateur…)
export function SiteHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="border-b-[6px] border-ink bg-paper">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-5 py-4">
        <Link href="/" className="display uppercase text-xl">
          Listes d&apos;achats
        </Link>
        <div className="flex items-center gap-3">{children}</div>
      </div>
    </header>
  );
}

// Bandeau titre malachite, repris de l'accueil
export function PageHero({ kicker, title, children }: { kicker: string; title: ReactNode; children?: ReactNode }) {
  return (
    <section className="bg-stripes px-5 py-8 sm:py-10">
      <div className="max-w-7xl mx-auto">
        <p className="label !text-sm !block w-fit">{kicker}</p>
        <h1 className="brut mt-4 block w-fit max-w-full px-6 py-4 text-3xl sm:text-5xl uppercase leading-[1] break-words">
          {title}
        </h1>
        {children && <div className="mt-4">{children}</div>}
      </div>
    </section>
  );
}

// Titre de section avec compteur
export function SectionTitle({ children, count }: { children: ReactNode; count?: number }) {
  return (
    <div className="flex items-center gap-3 mb-6 border-b-[3px] border-ink pb-3">
      <h2 className="text-2xl sm:text-3xl uppercase">{children}</h2>
      {count !== undefined && <span className="label !bg-razzmatazz">{String(count).padStart(2, '0')}</span>}
    </div>
  );
}
