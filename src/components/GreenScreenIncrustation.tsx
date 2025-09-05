'use client';

import { useState, useEffect, useRef } from 'react';

interface GreenScreenIncrustationProps {
  videoSrc: string;
  className?: string;
}

export default function GreenScreenIncrustation({ videoSrc, className = '' }: GreenScreenIncrustationProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 1200);
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
        
        {/* Fond de base avec dégradé animé complexe */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
          <div className="absolute inset-0 bg-gradient-to-tr from-cyan-400 via-blue-500 to-purple-600 opacity-80 animate-pulse"></div>
          <div className="absolute inset-0 bg-gradient-to-bl from-pink-400 via-red-500 to-yellow-500 opacity-60 animate-bounce"></div>
          <div className="absolute inset-0 bg-gradient-to-tl from-green-400 via-teal-500 to-blue-600 opacity-40 animate-ping"></div>
        </div>

        {/* Couche de suppression du fond vert - technique avancée */}
        <div 
          className="absolute inset-0 z-10"
          style={{
            background: `
              linear-gradient(135deg, 
                rgba(99, 102, 241, 0.9) 0%, 
                rgba(168, 85, 247, 0.9) 20%, 
                rgba(236, 72, 153, 0.9) 40%, 
                rgba(251, 146, 60, 0.9) 60%, 
                rgba(34, 197, 94, 0.9) 80%, 
                rgba(59, 130, 246, 0.9) 100%
              )
            `,
            mixBlendMode: 'multiply'
          }}
        ></div>

        {/* Masque elliptique pour la vidéo */}
        <div 
          className="absolute inset-0 z-20 flex items-center justify-center"
          style={{
            mask: `
              radial-gradient(
                ellipse 75% 85% at center, 
                black 20%, 
                rgba(0,0,0,0.95) 40%, 
                rgba(0,0,0,0.8) 60%, 
                transparent 80%
              )
            `,
            WebkitMask: `
              radial-gradient(
                ellipse 75% 85% at center, 
                black 20%, 
                rgba(0,0,0,0.95) 40%, 
                rgba(0,0,0,0.8) 60%, 
                transparent 80%
              )
            `
          }}
        >
          <div className="relative w-full h-full scale-115">
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
                filter: 'contrast(1.2) saturate(1.3) brightness(1.1) hue-rotate(10deg)',
                transform: 'scale(1.08)'
              }}
            />
          </div>
        </div>

        {/* Effets de bordure et de transition avancés */}
        <div className="absolute inset-0 z-30 pointer-events-none">
          {/* Bordure floue pour masquer les transitions */}
          <div 
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(
                  ellipse 80% 90% at center, 
                  transparent 15%, 
                  rgba(0,0,0,0.1) 35%, 
                  rgba(0,0,0,0.4) 60%, 
                  rgba(0,0,0,0.8) 85%, 
                  rgba(0,0,0,0.95) 100%
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
                  transparent 25%, 
                  rgba(0,0,0,0.05) 50%, 
                  rgba(0,0,0,0.2) 75%, 
                  rgba(0,0,0,0.5) 100%
                )
              `
            }}
          ></div>

          {/* Particules flottantes animées - plus nombreuses */}
          <div className="absolute inset-0">
            {[...Array(16)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full opacity-60"
                style={{
                  left: `${5 + i * 6}%`,
                  top: `${15 + (i % 6) * 10}%`,
                  animation: `float ${3 + i * 0.1}s ease-in-out infinite`,
                  animationDelay: `${i * 0.1}s`
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
                  ellipse 65% 75% at center, 
                  rgba(255,255,255,0.2) 0%, 
                  rgba(255,255,255,0.1) 30%, 
                  transparent 70%
                )
              `,
              animation: isPlaying ? 'pulse 2.5s ease-in-out infinite' : 'none'
            }}
          ></div>

          {/* Effet de brillance qui suit la vidéo */}
          <div 
            className="absolute inset-0"
            style={{
              background: `
                linear-gradient(
                  45deg, 
                  transparent 35%, 
                  rgba(255,255,255,0.3) 50%, 
                  transparent 65%
                )
              `,
              animation: isPlaying ? 'shimmer 4s ease-in-out infinite' : 'none'
            }}
          ></div>

          {/* Effet de halo coloré */}
          <div 
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(
                  ellipse 60% 70% at center, 
                  rgba(147, 51, 234, 0.1) 0%, 
                  rgba(236, 72, 153, 0.1) 50%, 
                  transparent 100%
                )
              `,
              animation: isPlaying ? 'halo 3s ease-in-out infinite' : 'none'
            }}
          ></div>
        </div>

        {/* Indicateur de chargement amélioré */}
        {!isLoaded && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black bg-opacity-80 rounded-2xl">
            <div className="text-white text-center">
              <div className="relative">
                <div className="animate-spin rounded-full h-24 w-24 border-4 border-transparent border-t-white border-r-white mx-auto mb-4"></div>
                <div className="absolute inset-0 animate-ping rounded-full h-24 w-24 border-2 border-white opacity-40"></div>
                <div className="absolute inset-2 animate-pulse rounded-full h-20 w-20 border border-white opacity-20"></div>
              </div>
              <p className="text-sm font-medium">Ça arrive, patience ! 😄</p>
              <div className="mt-3 w-48 h-1 bg-white bg-opacity-30 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        )}

        {/* Overlay de contrôle pour la vidéo */}
        <div className="absolute bottom-3 right-3 z-35">
          <div className="flex items-center space-x-2 bg-black bg-opacity-60 rounded-full px-4 py-2">
            <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
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
            opacity: 0.6;
          }
          25% { 
            transform: translateY(-8px) rotate(90deg) scale(1.1); 
            opacity: 0.8;
          }
          50% { 
            transform: translateY(-20px) rotate(180deg) scale(1.3); 
            opacity: 1;
          }
          75% { 
            transform: translateY(-12px) rotate(270deg) scale(1.1); 
            opacity: 0.8;
          }
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%) rotate(45deg); }
          100% { transform: translateX(100%) rotate(45deg); }
        }

        @keyframes halo {
          0%, 100% { 
            opacity: 0.1;
            transform: scale(1);
          }
          50% { 
            opacity: 0.3;
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>
  );
}
