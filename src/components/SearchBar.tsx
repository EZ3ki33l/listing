'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface SearchResult {
  id: string;
  name: string;
  description?: string;
  category?: {
    name: string;
    color: string;
  };
  shoppingListName: string;
}

interface SearchBarProps {
  items: SearchResult[];
  onItemSelect: (itemId: string) => void;
  placeholder?: string;
}

export default function SearchBar({ items, onItemSelect, placeholder = "Rechercher un article..." }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fermer les résultats quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Recherche en temps réel
  useEffect(() => {
    if (query.trim().length === 0) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const searchResults = items.filter(item => {
      const queryLower = query.toLowerCase();
      
      // Recherche au début du nom
      if (item.name.toLowerCase().startsWith(queryLower)) {
        return true;
      }
      
      // Recherche dans les mots du nom (commence par ou contient)
      const nameWords = item.name.toLowerCase().split(' ');
      if (nameWords.some(word => word.startsWith(queryLower) || word.includes(queryLower))) {
        return true;
      }
      
      // Recherche au début de la description
      if (item.description && item.description.toLowerCase().startsWith(queryLower)) {
        return true;
      }
      
      // Recherche dans les mots de la description
      if (item.description) {
        const descWords = item.description.toLowerCase().split(' ');
        if (descWords.some(word => word.startsWith(queryLower) || word.includes(queryLower))) {
          return true;
        }
      }
      
      // Recherche au début du nom de catégorie
      if (item.category && item.category.name.toLowerCase().startsWith(queryLower)) {
        return true;
      }
      
      // Recherche dans les mots du nom de catégorie
      if (item.category) {
        const catWords = item.category.name.toLowerCase().split(' ');
        if (catWords.some(word => word.startsWith(queryLower) || word.includes(queryLower))) {
          return true;
        }
      }
      
      return false;
    }).slice(0, 8); // Limiter à 8 résultats

    setResults(searchResults);
    setIsOpen(searchResults.length > 0);
    setSelectedIndex(-1);
  }, [query, items]);

  // Navigation au clavier
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleItemSelect(results[selectedIndex].id);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleItemSelect = (itemId: string) => {
    onItemSelect(itemId);
    setQuery('');
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const clearSearch = () => {
    setQuery('');
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-full max-w-2xl" ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.trim().length > 0 && results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-600"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Résultats de recherche */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {results.map((item, index) => (
            <div
              key={item.id}
              onClick={() => handleItemSelect(item.id)}
              className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                index === selectedIndex ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">{item.name}</h4>
                    {item.category && (
                      <span
                        className="px-2 py-1 text-xs font-medium rounded-full text-white"
                        style={{ backgroundColor: item.category.color }}
                      >
                        {item.category.name}
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Liste: {item.shoppingListName}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
