'use client';

import { useState, useEffect, useRef } from 'react';

interface LocalVideoIncrustationProps {
  videoSrc: string;
  className?: string;
}

export default function LocalVideoIncrustation({ videoSrc, className = '' }: LocalVideoIncrustationProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleVideoLoad = () => {
    setIsLoaded(true);
    setIsPlaying(true);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Conteneur principal */}
      <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl">
        
        {/* Fond de base avec dégradé animé */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
          <div className="absolute inset-0 bg-gradient-to-tr from-cyan-400 via-blue-500 to-purple-600 opacity-70 animate-pulse"></div>
          <div className="absolute inset-0 bg-gradient-to-bl from-pink-400 via-red-500 to-yellow-500 opacity-50 animate-bounce"></div>
        </div>

        {/* Couche de suppression du fond vert - optimisée pour la vidéo locale */}
        <div 
          className="absolute inset-0 z-10"
          style={{
            background: `
              linear-gradient(135deg, 
                rgba(99, 102, 241, 0.8) 0%, 
                rgba(168, 85, 247, 0.8) 25%, 
                rgba(236, 72, 153, 0.8) 50%, 
                rgba(251, 146, 60, 0.8) 75%, 
                rgba(34, 197, 94, 0.8) 100%
              )
            `,
            mixBlendMode: 'multiply'
          }}
        ></div>

        {/* Masque circulaire pour la vidéo */}
        <div 
          className="absolute inset-0 z-20 flex items-center justify-center"
          style={{
            mask: `
              radial-gradient(
                ellipse 80% 90% at center, 
                black 25%, 
                rgba(0,0,0,0.9) 45%, 
                transparent 70%
              )
            `,
            WebkitMask: `
              radial-gradient(
                ellipse 80% 90% at center, 
                black 25%, 
                rgba(0,0,0,0.9) 45%, 
                transparent 70%
              )
            `
          }}
        >
          <div className="relative w-full h-full scale-110">
            <video
              ref={videoRef}
              src={videoSrc}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full rounded-xl object-cover"
              onLoadedData={handleVideoLoad}
              onCanPlay={handleVideoLoad}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              style={{
                filter: 'contrast(1.1) saturate(1.2) brightness(1.05)',
                transform: 'scale(1.05)'
              }}
            />
          </div>
        </div>

        {/* Effets de bordure et de transition */}
        <div className="absolute inset-0 z-30 pointer-events-none">
          {/* Bordure floue pour masquer les transitions */}
          <div 
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(
                  ellipse 85% 95% at center, 
                  transparent 20%, 
                  rgba(0,0,0,0.2) 50%, 
                  rgba(0,0,0,0.6) 80%, 
                  rgba(0,0,0,0.9) 100%
                )
              `
            }}
          ></div>
          
          {/* Effet de vignette douce */}
          <div 
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(
                  ellipse at center, 
                  transparent 30%, 
                  rgba(0,0,0,0.1) 60%, 
                  rgba(0,0,0,0.4) 100%
                )
              `
            }}
          ></div>

          {/* Particules flottantes animées */}
          <div className="absolute inset-0">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full opacity-50"
                style={{
                  left: `${10 + i * 8}%`,
                  top: `${20 + (i % 5) * 12}%`,
                  animation: `float ${2.5 + i * 0.2}s ease-in-out infinite`,
                  animationDelay: `${i * 0.15}s`
                }}
              ></div>
            ))}
          </div>

          {/* Effet de lueur pulsante */}
          <div 
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(
                  ellipse 70% 80% at center, 
                  rgba(255,255,255,0.15) 0%, 
                  transparent 60%
                )
              `,
              animation: isPlaying ? 'pulse 2s ease-in-out infinite' : 'none'
            }}
          ></div>

          {/* Effet de brillance qui suit la vidéo */}
          <div 
            className="absolute inset-0"
            style={{
              background: `
                linear-gradient(
                  45deg, 
                  transparent 40%, 
                  rgba(255,255,255,0.2) 50%, 
                  transparent 60%
                )
              `,
              animation: isPlaying ? 'shimmer 3s ease-in-out infinite' : 'none'
            }}
          ></div>
        </div>

        {/* Indicateur de chargement amélioré */}
        {!isLoaded && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black bg-opacity-70 rounded-2xl">
            <div className="text-white text-center">
              <div className="relative">
                <div className="animate-spin rounded-full h-20 w-20 border-4 border-transparent border-t-white border-r-white mx-auto mb-4"></div>
                <div className="absolute inset-0 animate-ping rounded-full h-20 w-20 border-2 border-white opacity-30"></div>
              </div>
              <p className="text-sm font-medium">Ça arrive, patience ! 😄</p>
              <div className="mt-3 w-40 h-1 bg-white bg-opacity-30 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        )}

        {/* Overlay de contrôle pour la vidéo */}
        <div className="absolute bottom-2 right-2 z-35">
          <div className="flex items-center space-x-2 bg-black bg-opacity-50 rounded-full px-3 py-1">
            <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span className="text-white text-xs font-medium">
              {isPlaying ? 'Ça tourne ! 🎬' : 'En pause ⏸️'}
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { 
            transform: translateY(0px) rotate(0deg) scale(1); 
            opacity: 0.5;
          }
          50% { 
            transform: translateY(-15px) rotate(180deg) scale(1.2); 
            opacity: 0.8;
          }
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%) rotate(45deg); }
          100% { transform: translateX(100%) rotate(45deg); }
        }
      `}</style>
    </div>
  );
}
