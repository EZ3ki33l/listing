'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

interface Photo {
  id: string;
  imageUrl: string;
  altText?: string;
  order: number;
}

interface PhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  photos: Photo[];
  initialIndex?: number;
}

export default function PhotoModal({ isOpen, onClose, photos, initialIndex = 0 }: PhotoModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [imageError, setImageError] = useState(false);

  // Réinitialiser l'index quand la modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setImageError(false);
    }
  }, [isOpen, initialIndex]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
    setImageError(false);
  }, [photos.length]);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
    setImageError(false);
  }, [photos.length]);

  // Gérer les touches du clavier
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (event.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, goToPrevious, goToNext]);

  const handleImageError = () => {
    setImageError(true);
  };

  if (!isOpen || photos.length === 0) return null;

  const currentPhoto = photos[currentIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay invisible pour fermer en cliquant */}
      <div 
        className="absolute inset-0"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative z-10 max-w-5xl max-h-[90vh] w-full bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 bg-gray-50 border-b">
          <div className="text-gray-800">
            <span className="text-lg font-medium">
              {currentIndex + 1} / {photos.length}
            </span>
            {currentPhoto.altText && (
              <p className="text-sm text-gray-600 mt-1">{currentPhoto.altText}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-800 hover:text-gray-600 transition-colors p-2 hover:bg-gray-200 rounded-full"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Image Container */}
        <div className="relative bg-gray-100 flex items-center justify-center p-4 flex-1">
          {!imageError ? (
            <Image
              src={currentPhoto.imageUrl}
              alt={currentPhoto.altText || `Photo ${currentIndex + 1}`}
              width={1000}
              height={800}
              className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
              onError={handleImageError}
              unoptimized={true}
            />
          ) : (
            <div className="w-96 h-96 flex items-center justify-center bg-gray-200 rounded-lg">
              <div className="text-center text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p>Impossible de charger l&apos;image</p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          {photos.length > 1 && (
            <>
              {/* Previous Button */}
              <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Next Button */}
              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Thumbnails */}
        {photos.length > 1 && (
          <div className="flex justify-center p-2 bg-gray-50 border-t space-x-1 overflow-x-auto">
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                onClick={() => {
                  setCurrentIndex(index);
                  setImageError(false);
                }}
                className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                  index === currentIndex 
                    ? 'border-blue-500' 
                    : 'border-transparent hover:border-gray-400'
                }`}
              >
                <Image
                  src={photo.imageUrl}
                  alt={photo.altText || `Miniature ${index + 1}`}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                  unoptimized={true}
                />
              </button>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
