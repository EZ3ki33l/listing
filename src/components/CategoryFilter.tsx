'use client';

import { useState } from 'react';

interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string;
  itemCount: number;
}

interface CategoryFilterProps {
  categories: Category[];
  selectedCategories: string[]; // Changé pour supporter la sélection multiple
  onCategorySelect: (categoryIds: string[]) => void; // Changé pour accepter un tableau
  showAll?: boolean;
}

export default function CategoryFilter({ 
  categories, 
  selectedCategories, 
  onCategorySelect, 
  showAll = true 
}: CategoryFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const totalItems = categories.reduce((sum, cat) => sum + cat.itemCount, 0);

  const handleCategoryToggle = (categoryId: string) => {
    const newSelection = selectedCategories.includes(categoryId)
      ? selectedCategories.filter(id => id !== categoryId)
      : [...selectedCategories, categoryId];
    
    onCategorySelect(newSelection);
  };

  const handleSelectAll = () => {
    onCategorySelect([]); // Tableau vide = toutes les catégories
  };

  const getDisplayText = () => {
    if (selectedCategories.length === 0) {
      return `🏷️ Toutes les catégories (${categories.length})`;
    }
    
    if (selectedCategories.length === 1) {
      const category = categories.find(cat => cat.id === selectedCategories[0]);
      return `${category?.icon} ${category?.name} (${category?.itemCount})`;
    }
    
    return `🏷️ ${selectedCategories.length} catégories sélectionnées`;
  };

  return (
    <div className="flex items-center gap-3">
      {/* Bouton "Toutes" */}
      {showAll && (
        <button
          onClick={handleSelectAll}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            selectedCategories.length === 0
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Toutes ({totalItems})
        </button>
      )}
      
      {/* Menu déroulant des catégories */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
            selectedCategories.length > 0 
              ? 'text-white shadow-lg'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
          style={{
            backgroundColor: selectedCategories.length > 0 ? '#8B5CF6' : undefined, // Couleur violette pour la sélection multiple
            border: selectedCategories.length > 0 ? 'none' : undefined
          }}
        >
          {getDisplayText()}
          <span className="text-xs">▼</span>
        </button>

        {/* Menu déroulant */}
        {isOpen && (
          <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-56 max-h-80 overflow-y-auto">
            <div className="p-3">
              {/* En-tête du menu */}
              <div className="mb-3 pb-2 border-b border-gray-200">
                <h4 className="font-medium text-gray-800 text-sm">Sélectionner les catégories</h4>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedCategories.length === 0 
                    ? 'Toutes les catégories sont sélectionnées' 
                    : `${selectedCategories.length} catégorie(s) sélectionnée(s)`
                  }
                </p>
              </div>

              {/* Liste des catégories */}
              <div className="space-y-1">
                {categories.map((category) => {
                  const isSelected = selectedCategories.includes(category.id);
                  return (
                    <button
                      key={category.id}
                      onClick={() => handleCategoryToggle(category.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-3 ${
                        isSelected 
                          ? 'bg-purple-100 border border-purple-200' 
                          : 'hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      {/* Checkbox visuelle */}
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                        isSelected 
                          ? 'bg-purple-600 border-purple-600' 
                          : 'border-gray-300'
                      }`}>
                        {isSelected && (
                          <span className="text-white text-xs">✓</span>
                        )}
                      </div>

                      {/* Icône et nom de la catégorie */}
                      <span className="text-lg">{category.icon}</span>
                      <span className={`flex-1 font-medium ${
                        isSelected ? 'text-purple-800' : 'text-gray-800'
                      }`}>
                        {category.name}
                      </span>

                      {/* Compteur d'articles */}
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        isSelected 
                          ? 'bg-purple-200 text-purple-700' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {category.itemCount}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Actions du menu */}
              <div className="mt-3 pt-2 border-t border-gray-200 flex gap-2">
                <button
                  onClick={() => onCategorySelect([])}
                  className="flex-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Sélectionner tout
                </button>
                <button
                  onClick={() => onCategorySelect([])}
                  className="flex-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Effacer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fermer le menu quand on clique ailleurs */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
