'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Heart } from 'lucide-react';

interface ThankYouModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ThankYouModal({ isOpen, onClose }: ThankYouModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playCount, setPlayCount] = useState(0);
  const [videoSrc, setVideoSrc] = useState('/catB.mp4');

  // Détection du thème et choix de la vidéo
  useEffect(() => {
    if (isOpen) {
      // Détecter le thème en analysant uniquement les classes CSS (pas le thème système)
      const isDarkTheme = document.documentElement.classList.contains('dark') || 
                         document.body.classList.contains('dark');
      
      // Détection alternative : analyser la couleur de fond de la modal
      const modalElement = document.querySelector('.bg-white');
      const computedStyle = modalElement ? window.getComputedStyle(modalElement) : null;
      const backgroundColor = computedStyle ? computedStyle.backgroundColor : '';
      
      // Si la modal a un fond sombre, utiliser catN.mp4
      const isModalDark = backgroundColor.includes('rgb(0, 0, 0)') || 
                         backgroundColor.includes('rgb(17, 24, 39)') ||
                         backgroundColor.includes('rgb(31, 41, 55)');
      
      // Debug: afficher les valeurs pour comprendre le problème
      console.log('Debug thème:', {
        isDarkTheme,
        isModalDark,
        backgroundColor,
        selectedVideo: (isDarkTheme || isModalDark) ? '/catN.mp4' : '/catB.mp4'
      });
      
      // Logique simplifiée : si on détecte un thème sombre, utiliser catN.mp4, sinon catB.mp4
      if (isDarkTheme) {
        console.log('Thème sombre détecté, utilisation de catN.mp4');
        setVideoSrc('/catN.mp4');
      } else {
        console.log('Thème clair détecté, utilisation de catB.mp4');
        setVideoSrc('/catB.mp4');
      }
    }
  }, [isOpen]);

  // Gestion de la touche Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-2 text-center">
        {/* Overlay */}
        <div 
          className="fixed inset-0 bg-transparent transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all w-full max-w-none max-h-[calc(100vh-2rem)] m-4 flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4">
            <div className="relative flex items-center justify-center">
              <div className="flex items-center space-x-3">
                <Heart className="w-8 h-8 text-white fill-current" />
                <h3 className="text-2xl font-bold text-white">
                  Merci ! 🎉
                </h3>
              </div>
              <button
                onClick={onClose}
                className="absolute right-0 rounded-full bg-white/20 text-white hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-green-500 transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="bg-white px-6 py-6 flex-1 flex flex-col overflow-y-auto">
            <div className="text-center space-y-4 flex-1 flex flex-col justify-center">
              <div className="space-y-2 text-center">
                <p className="text-lg text-gray-600">
                  T&apos;es trop cool d&apos;avoir acheté ça ! 
                  T&apos;es trop cool d&apos;avoir acheté ça ! 
                </p>
              </div>

              {/* Vidéo locale simple */}
              <div className="relative w-full max-w-md mx-auto flex-1 flex items-center justify-center min-h-0">
                <div className="relative aspect-[9/16] w-full max-h-[40vh] rounded-xl overflow-hidden shadow-lg">
                  <video
                    ref={videoRef}
                    src={videoSrc}
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain rounded-xl"
                    controls
                    onEnded={() => {
                      if (playCount < 1) {
                        setPlayCount(prev => prev + 1);
                        if (videoRef.current) {
                          videoRef.current.currentTime = 0;
                          videoRef.current.play();
                        }
                      }
                    }}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-gray-700 text-lg">
                  Merci encore ! 🙏
                </p>
                <div className="flex justify-center space-x-2">
                  <span className="text-2xl">🌟</span>
                  <span className="text-2xl">✨</span>
                  <span className="text-2xl">🎊</span>
                  <span className="text-2xl">💪</span>
                  <span className="text-2xl">🚀</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-6">
            <button
              type="button"
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 px-8 rounded-xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 text-lg"
              onClick={onClose}
            >
              Allez, on continue ! 💪
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
