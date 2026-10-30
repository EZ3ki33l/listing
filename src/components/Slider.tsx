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
    const slider = new Core(el, {
      // La boucle infinie n'a de sens que s'il y a de quoi remplir l'écran
      infinite: el.children.length > 3,
      snap: true,
      lerpFactor: reduceMotion ? 1 : 0.3,
    });
    core.current = slider;
    instances.set(el, slider);

    let frame = requestAnimationFrame(function tick() {
      slider.update();
      frame = requestAnimationFrame(tick);
    });

    return () => {
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
