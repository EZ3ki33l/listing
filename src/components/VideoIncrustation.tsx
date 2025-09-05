'use client';

import { useState, useEffect } from 'react';

interface VideoIncrustationProps {
  videoId: string;
  className?: string;
}

export default function VideoIncrustation({ videoId, className = '' }: VideoIncrustationProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Conteneur principal avec fond animé */}
      <div className="relative w-full h-full rounded-xl overflow-hidden bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500">
        
        {/* Fond animé avec particules */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 animate-pulse opacity-90"></div>
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-400 via-purple-500 to-pink-500 opacity-60 animate-bounce"></div>
        </div>

        {/* Overlay de masquage pour supprimer le fond vert */}
        <div 
          className="absolute inset-0 z-10"
          style={{
            background: 'linear-gradient(45deg, rgba(147, 51, 234, 0.8) 0%, rgba(236, 72, 153, 0.8) 50%, rgba(251, 146, 60, 0.8) 100%)',
            mixBlendMode: 'screen'
          }}
        ></div>

        {/* Conteneur de la vidéo avec masquage circulaire */}
        <div 
          className="absolute inset-0 z-20 flex items-center justify-center"
          style={{
            mask: 'radial-gradient(ellipse 80% 90% at center, black 35%, transparent 65%)',
            WebkitMask: 'radial-gradient(ellipse 80% 90% at center, black 35%, transparent 65%)'
          }}
        >
          <div className="relative w-full h-full scale-110">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&showinfo=0&rel=0&modestbranding=1&loop=1&playlist=${videoId}`}
              title="Merci pour votre achat"
              className="absolute inset-0 w-full h-full rounded-lg"
              allow="autoplay; encrypted-media"
              allowFullScreen
              onLoad={() => setIsLoaded(true)}
            />
          </div>
        </div>

        {/* Effets de bordure et de flou pour l'incrustation */}
        <div className="absolute inset-0 z-30 pointer-events-none">
          {/* Bordure floue pour masquer les transitions */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse 85% 95% at center, transparent 30%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.8) 100%)'
            }}
          ></div>
          
          {/* Effet de vignette */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.2) 80%)'
            }}
          ></div>

          {/* Particules flottantes */}
          <div className="absolute inset-0">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-white rounded-full opacity-30 animate-ping"
                style={{
                  left: `${20 + i * 15}%`,
                  top: `${30 + (i % 3) * 20}%`,
                  animationDelay: `${i * 0.5}s`,
                  animationDuration: '2s'
                }}
              ></div>
            ))}
          </div>
        </div>

        {/* Indicateur de chargement */}
        {!isLoaded && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50 rounded-xl">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-sm">Chargement de la vidéo...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
