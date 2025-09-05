'use client';

import { useState, useEffect } from 'react';

interface AdvancedVideoIncrustationProps {
  videoSrc: string;
  className?: string;
}

export default function AdvancedVideoIncrustation({ videoSrc, className = '' }: AdvancedVideoIncrustationProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Conteneur principal */}
      <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl">
        
        {/* Fond de base avec dégradé animé */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
          <div className="absolute inset-0 bg-gradient-to-tr from-cyan-400 via-blue-500 to-purple-600 opacity-70 animate-pulse"></div>
          <div className="absolute inset-0 bg-gradient-to-bl from-pink-400 via-red-500 to-yellow-500 opacity-50 animate-bounce"></div>
        </div>

        {/* Couche de suppression du fond vert */}
        <div 
          className="absolute inset-0 z-10"
          style={{
            background: `
              linear-gradient(135deg, 
                rgba(99, 102, 241, 0.9) 0%, 
                rgba(168, 85, 247, 0.9) 25%, 
                rgba(236, 72, 153, 0.9) 50%, 
                rgba(251, 146, 60, 0.9) 75%, 
                rgba(34, 197, 94, 0.9) 100%
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
                ellipse 75% 85% at center, 
                black 30%, 
                rgba(0,0,0,0.8) 50%, 
                transparent 70%
              )
            `,
            WebkitMask: `
              radial-gradient(
                ellipse 75% 85% at center, 
                black 30%, 
                rgba(0,0,0,0.8) 50%, 
                transparent 70%
              )
            `
          }}
        >
          <div className="relative w-full h-full scale-105">
            <video
              src={videoSrc}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full rounded-xl object-cover"
              onLoadedData={() => setIsLoaded(true)}
              onCanPlay={() => setIsLoaded(true)}
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
                  ellipse 80% 90% at center, 
                  transparent 25%, 
                  rgba(0,0,0,0.3) 60%, 
                  rgba(0,0,0,0.7) 85%, 
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
                  transparent 35%, 
                  rgba(0,0,0,0.1) 70%, 
                  rgba(0,0,0,0.3) 100%
                )
              `
            }}
          ></div>

          {/* Particules flottantes animées */}
          <div className="absolute inset-0">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full opacity-40"
                style={{
                  left: `${15 + i * 12}%`,
                  top: `${25 + (i % 4) * 15}%`,
                  animation: `float ${2 + i * 0.3}s ease-in-out infinite`,
                  animationDelay: `${i * 0.2}s`
                }}
              ></div>
            ))}
          </div>

          {/* Effet de lueur */}
          <div 
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(
                  ellipse 60% 70% at center, 
                  rgba(255,255,255,0.1) 0%, 
                  transparent 50%
                )
              `,
              animation: 'pulse 3s ease-in-out infinite'
            }}
          ></div>
        </div>

        {/* Indicateur de chargement amélioré */}
        {!isLoaded && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black bg-opacity-60 rounded-2xl">
            <div className="text-white text-center">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-white border-r-white mx-auto mb-4"></div>
                <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-2 border-white opacity-20"></div>
              </div>
              <p className="text-sm font-medium">Ça arrive, patience ! 😄</p>
              <div className="mt-2 w-32 h-1 bg-white bg-opacity-30 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>
        )}

        {/* Effet de brillance */}
        <div 
          className="absolute inset-0 z-35 pointer-events-none"
          style={{
            background: `
              linear-gradient(
                45deg, 
                transparent 30%, 
                rgba(255,255,255,0.1) 50%, 
                transparent 70%
              )
            `,
            animation: 'shimmer 2s ease-in-out infinite'
          }}
        ></div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(180deg); }
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
