'use client';

interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string;
  itemCount: number;
}

interface CategoryFilterProps {
  categories: Category[];
  selectedCategory: string | null;
  onCategorySelect: (categoryId: string | null) => void;
  showAll?: boolean;
}

export default function CategoryFilter({ 
  categories, 
  selectedCategory, 
  onCategorySelect, 
  showAll = true 
}: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {showAll && (
        <button
          onClick={() => onCategorySelect(null)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            selectedCategory === null
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Toutes ({categories.reduce((sum, cat) => sum + cat.itemCount, 0)})
        </button>
      )}
      
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onCategorySelect(category.id)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
            selectedCategory === category.id
              ? 'text-white shadow-lg'
              : 'text-gray-700 hover:opacity-80'
          }`}
          style={{
            backgroundColor: selectedCategory === category.id ? category.color : `${category.color}20`,
            border: selectedCategory === category.id ? 'none' : `2px solid ${category.color}`
          }}
        >
          {category.icon && (
            <span className="text-lg">{category.icon}</span>
          )}
          {category.name}
          <span className="text-xs opacity-75">({category.itemCount})</span>
        </button>
      ))}
    </div>
  );
}
