'use client';

import { ChevronDown } from 'lucide-react';

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
          className={`px-4 py-2 rounded-none text-sm font-bold uppercase tracking-wide transition-all ${
            selectedCategories.length === 0
              ? 'bg-ink text-white border-[3px] border-ink shadow-[4px_4px_0_#31ec56]'
              : 'bg-paper text-ink border-[3px] border-ink shadow-[4px_4px_0_#0a0a0a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0a0a0a]'
          }`}
        >
          Toutes ({totalItems})
        </button>
      )}
      
      {/* Menu déroulant des catégories */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`px-4 py-2 rounded-none text-sm font-bold uppercase tracking-wide transition-all flex items-center gap-2 ${
            selectedCategories.length > 0 
              ? 'bg-heliotrope text-ink border-[3px] border-ink shadow-[4px_4px_0_#0a0a0a]'
              : 'bg-paper text-ink border-[3px] border-ink shadow-[4px_4px_0_#0a0a0a] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0a0a0a]'
          }`}
        >
          {getDisplayText()}
          <ChevronDown size={16} aria-hidden="true" />
        </button>

        {/* Menu déroulant */}
        {isOpen && (
          <div className="absolute top-full left-0 mt-2 bg-white border-ink rounded-none border-[3px] shadow-[5px_5px_0_#0a0a0a] z-50 min-w-56 max-h-80 overflow-y-auto">
            <div className="p-3">
              {/* En-tête du menu */}
              <div className="mb-3 pb-2 border-b border-ink">
                <h4 className="font-medium text-ink text-sm">Sélectionner les catégories</h4>
                <p className="text-xs text-ink/60 mt-1">
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
                      className={`w-full text-left px-3 py-2 rounded-none transition-colors flex items-center gap-3 ${
                        isSelected 
                          ? 'bg-purple-100 border border-purple-200' 
                          : 'hover:bg-heliotrope/20 border border-transparent'
                      }`}
                    >
                      {/* Checkbox visuelle */}
                      <div className={`w-4 h-4 rounded-none border-2 flex items-center justify-center ${
                        isSelected 
                          ? 'bg-purple-600 border-purple-600' 
                          : 'border-ink'
                      }`}>
                        {isSelected && (
                          <span className="text-white text-xs">✓</span>
                        )}
                      </div>

                      {/* Icône et nom de la catégorie */}
                      <span className="text-lg">{category.icon}</span>
                      <span className={`flex-1 font-medium ${
                        isSelected ? 'text-razzmatazz' : 'text-ink'
                      }`}>
                        {category.name}
                      </span>

                      {/* Compteur d'articles */}
                      <span className={`text-xs px-2 py-1 rounded-none ${
                        isSelected 
                          ? 'bg-purple-200 text-razzmatazz' 
                          : 'bg-heliotrope/20 text-ink'
                      }`}>
                        {category.itemCount}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Actions du menu */}
              <div className="mt-3 pt-2 border-t border-ink flex gap-2">
                <button
                  onClick={() => onCategorySelect([])}
                  className="flex-1 px-3 py-2 text-sm text-ink hover:text-ink hover:bg-heliotrope/20 rounded-none transition-colors"
                >
                  Sélectionner tout
                </button>
                <button
                  onClick={() => onCategorySelect([])}
                  className="flex-1 px-3 py-2 text-sm text-ink hover:text-ink hover:bg-heliotrope/20 rounded-none transition-colors"
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
