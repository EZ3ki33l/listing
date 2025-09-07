'use client';

import Image from 'next/image';
import { useState } from 'react';
import PhotoModal from './PhotoModal';

interface Photo {
  id: string;
  imageUrl: string;
  altText?: string;
  order: number;
}

interface ImageCarouselProps {
  photos: Photo[];
  className?: string;
  priority?: boolean;
  isAboveFold?: boolean;
}

export default function ImageCarousel({ photos, className = '', priority = false, isAboveFold = false }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  const handleImageClick = () => {
    setIsModalOpen(true);
  };

  const currentPhoto = photos[currentIndex];

  return (
    <div className={`relative ${className}`}>
      {/* Image principale */}
      <div className="relative overflow-hidden rounded-lg cursor-pointer group" onClick={handleImageClick}>
        <div className="w-full h-48 overflow-hidden">
          {!imageError ? (
            <Image
              src={currentPhoto.imageUrl}
              alt={currentPhoto.altText || `Photo ${currentIndex + 1}`}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              width={400}
              height={192}
              style={{ width: 'auto', height: 'auto' }}
              priority={priority || isAboveFold}
              onError={handleImageError}
              unoptimized={true} // Désactive l'optimisation pour les images externes
            />
          ) : (
            // Fallback avec balise img standard
            <Image
              src={currentPhoto.imageUrl}
              alt={currentPhoto.altText || `Photo ${currentIndex + 1}`}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              width={400}
              height={192}
              style={{ width: 'auto', height: 'auto' }}
              priority={priority || isAboveFold}
              onError={handleImageError}
              unoptimized={true}
            />
          )}
        </div>
        
        {/* Overlay pour indiquer que l'image est cliquable */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black bg-opacity-50 rounded-full p-2">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
          </div>
        </div>
        
        {/* Boutons de navigation */}
        {photos.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                prevPhoto();
              }}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all z-10"
              aria-label="Photo précédente"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextPhoto();
              }}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all z-10"
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
          <div className="text-center p-4">
            <div className="text-4xl mb-2">🖼️</div>
            <p className="text-gray-500 text-sm mb-2">Image non disponible</p>
            <button 
              onClick={() => setImageError(false)}
              className="text-blue-500 text-xs hover:text-blue-700 underline"
            >
              Réessayer
            </button>
          </div>
        </div>
      )}
      
      {/* Modal pour afficher les photos en grand */}
      <PhotoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        photos={photos}
        initialIndex={currentIndex}
      />
    </div>
  );
}
