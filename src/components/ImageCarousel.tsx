'use client';

import Image from 'next/image';
import { useState } from 'react';

interface Photo {
  id: string;
  imageUrl: string;
  altText?: string;
  order: number;
}

interface ImageCarouselProps {
  photos: Photo[];
  className?: string;
}

export default function ImageCarousel({ photos, className = '' }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageError, setImageError] = useState(false);

  if (!photos || photos.length === 0) {
    return (
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center h-48 ${className}`}>
        <p className="text-gray-500 text-sm">Aucune photo</p>
      </div>
    );
  }

  const nextPhoto = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
    setImageError(false); // Reset l'erreur lors du changement de photo
  };

  const prevPhoto = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
    setImageError(false); // Reset l'erreur lors du changement de photo
  };

  const goToPhoto = (index: number) => {
    setCurrentIndex(index);
    setImageError(false); // Reset l'erreur lors du changement de photo
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const currentPhoto = photos[currentIndex];

  return (
    <div className={`relative ${className}`}>
      {/* Image principale */}
      <div className="relative overflow-hidden rounded-lg">
        {!imageError ? (
          <Image
            src={currentPhoto.imageUrl}
            alt={currentPhoto.altText || `Photo ${currentIndex + 1}`}
            className="w-full h-48 object-cover"
            width={400}
            height={192}
            onError={handleImageError}
            unoptimized={true} // Désactive l'optimisation pour les images externes
          />
        ) : (
          // Fallback avec balise img standard
          <Image
            src={currentPhoto.imageUrl}
            alt={currentPhoto.altText || `Photo ${currentIndex + 1}`}
            className="w-full h-48 object-cover"
            onError={handleImageError}
          />
        )}
        
        {/* Boutons de navigation */}
        {photos.length > 1 && (
          <>
            <button
              onClick={prevPhoto}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
              aria-label="Photo précédente"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <button
              onClick={nextPhoto}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
              aria-label="Photo suivante"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Indicateurs de navigation */}
      {photos.length > 1 && (
        <div className="flex justify-center mt-2 space-x-1">
          {photos.map((_, index) => (
            <button
              key={index}
              onClick={() => goToPhoto(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'bg-blue-500'
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`Aller à la photo ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Compteur de photos */}
      {photos.length > 1 && (
        <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
          {currentIndex + 1} / {photos.length}
        </div>
      )}

      {/* Message d'erreur si l'image ne peut pas être chargée */}
      {imageError && (
        <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500 text-sm mb-2">❌ Erreur de chargement</p>
            <p className="text-gray-400 text-xs">URL: {currentPhoto.imageUrl}</p>
          </div>
        </div>
      )}
    </div>
  );
}
