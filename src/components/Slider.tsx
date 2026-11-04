'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import Core from 'smooothy';

interface SliderProps {
  children: ReactNode;
  label: string;
  // Affiche jusqu'à 3 slides à la fois (1 sur mobile, 2 sur tablette)
  threeUp?: boolean;
}

const instances = new WeakMap<HTMLElement, Core>();

// Fait glisser le slider qui contient `el` jusqu'à sa slide ; renvoie true si c'était nécessaire
export function revealSlide(el: HTMLElement): boolean {
  const slide = el.closest('.slider > *');
  const wrapper = slide?.parentElement;
  const slider = wrapper && instances.get(wrapper);
  if (!slide || !wrapper || !slider) return false;
  slider.goToIndex(Array.from(wrapper.children).indexOf(slide));
  return true;
}

// smooothy ne boucle qu'avec au moins 2 × 3 colonnes de slides : avec 4 ou 5 articles, on les présente deux fois.
// Les copies sont de vraies cartes (boutons actifs) : à l'appelant de ne pas dupliquer leur id.
// shortcut: un lecteur d'écran lit chaque copie ; marquer les copies aria-hidden laisserait leurs boutons focalisables
export function loopSlides<T>(items: T[]): { item: T; copy: boolean }[] {
  const slides = items.map(item => ({ item, copy: false }));
  return items.length > 3 && items.length < 6 ? [...slides, ...slides.map(s => ({ ...s, copy: true }))] : slides;
}

// Un clic qui termine un glissement ne doit pas ouvrir le lien sous le curseur
const DRAG_CLICK_THRESHOLD = 6;

export default function Slider({ children, label, threeUp = false }: SliderProps) {
  const ref = useRef<HTMLDivElement>(null);
  const core = useRef<Core | null>(null);
  const downX = useRef(0);
  const moved = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // smooothy replie les slides dans [-N/2, N/2] colonnes : sous 2 × colonnes visibles, une colonne se vide
    // (slide repliée hors écran, ses boutons dépassent). Le nombre de colonnes change avec la largeur d'écran.
    const canLoop = () => {
      const slide = el.firstElementChild as HTMLElement | null;
      if (!slide?.offsetWidth) return false;
      const columns = Math.ceil(el.clientWidth / slide.offsetWidth - 0.01);
      return el.children.length >= 2 * columns;
    };

    // Effet « gluant » : la carte s'étire et se penche selon la vitesse réelle, avec un léger retard
    let last = 0;
    let jelly = 0;
    const slider = new Core(el, {
      infinite: canLoop(),
      snap: true,
      bounceLimit: 0.2, // rebond élastique en fin de course, en slides (1 par défaut : une colonne entière vide)
      lerpFactor: reduceMotion ? 1 : 0.3,
      // Fin de course au bord droit du conteneur (par défaut : dernière carte au bord gauche, colonnes vides à droite).
      // Le min borne maxScroll à 0 quand il y a moins de cartes que de colonnes : positif, il recale tous les sliders de la
      // page à chaque mouseup (smooothy écoute la window sans vérifier isDragging) et les décale d'une colonne.
      setOffset: ({ wrapperWidth, totalWidth }) => Math.min(wrapperWidth, totalWidth),
      onUpdate: (s) => {
        if (reduceMotion) return;
        jelly += (s.current - last - jelly) * 0.2; // vitesse en slides par image, lissée
        last = s.current;
        const k = Math.max(-1, Math.min(1, jelly * 12));
        const transform = Math.abs(k) < 0.01
          ? ''
          : `skewX(${-k * 7}deg) scale(${1 + Math.abs(k) * 0.05}, ${1 - Math.abs(k) * 0.02})`;
        for (const slide of s.items) {
          const card = slide.firstElementChild as HTMLElement | null;
          if (card) card.style.transform = transform;
        }
      },
    });
    core.current = slider;
    instances.set(el, slider);

    // Pas de reconstruction du slider : destroy() de smooothy ne retire pas ses écouteurs, ils s'empileraient
    const observer = new ResizeObserver(() => {
      const loop = canLoop();
      if (loop === slider.config.infinite) return;
      slider.config.infinite = loop;
      slider.current = slider.target = 0; // les positions bouclées n'ont plus de sens en mode fini, et inversement
    });
    observer.observe(el);

    // Un mouseup perdu (relâché hors fenêtre, glisser-déposer natif…) laisserait le slider collé à la souris
    const releaseIfLost = (e: MouseEvent) => {
      if (slider.isDragging && e.buttons === 0) window.dispatchEvent(new MouseEvent('mouseup'));
    };
    window.addEventListener('mousemove', releaseIfLost);

    let frame = requestAnimationFrame(function tick() {
      slider.update();
      frame = requestAnimationFrame(tick);
    });

    return () => {
      window.removeEventListener('mousemove', releaseIfLost);
      observer.disconnect();
      cancelAnimationFrame(frame);
      slider.destroy();
      core.current = null;
      instances.delete(el);
    };
  }, []);

  const count = Array.isArray(children) ? children.length : 1;

  return (
    <>
    <div
      ref={ref}
      className={threeUp ? 'slider slider-3' : 'slider'}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      // Le glisser-déposer natif d'une photo ou d'un lien avale le mouseup : le slider resterait « enclenché »
      onDragStart={(e) => e.preventDefault()}
      onPointerDown={(e) => {
        downX.current = e.clientX;
        moved.current = false;
      }}
      onPointerMove={(e) => {
        if (Math.abs(e.clientX - downX.current) > DRAG_CLICK_THRESHOLD && e.buttons) {
          moved.current = true;
        }
      }}
      onClickCapture={(e) => {
        if (moved.current) {
          e.preventDefault();
          e.stopPropagation();
          moved.current = false;
        }
      }}
    >
      {children}
    </div>
    {threeUp && count > 1 && (
      <div className={`mt-2 flex justify-center gap-3 ${count <= 3 ? 'lg:hidden' : ''}`}>
        <button type="button" className="btn" aria-label="Précédent" onClick={() => core.current?.goToPrev()}>←</button>
        <button type="button" className="btn" aria-label="Suivant" onClick={() => core.current?.goToNext()}>→</button>
      </div>
    )}
    </>
  );
}
