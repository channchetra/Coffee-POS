import React, { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useLanguageStore } from '../../lib/store';
import { t } from '../../i18n';

interface Category {
  id: string;
  nameEn: string;
  nameKm: string;
  slug: string;
  sortOrder: number;
}

export function CategoryManager() {
  const { language } = useLanguageStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    nameEn: '',
    nameKm: '',
    slug: '',
    sortOrder: 0
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  useEffect(() => {
    fetchCategories();
  }, []);
  
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/admin/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      setCategories(data.categories);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading categories');
    } finally {
      setLoading(false);
    }
  };
  
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  };
  
  const handleAdd = () => {
    setEditingCategory(null);
    setFormData({ nameEn: '', nameKm: '', slug: '', sortOrder: categories.length });
    setShowModal(true);
  };
  
  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      nameEn: category.nameEn,
      nameKm: category.nameKm,
      slug: category.slug,
      sortOrder: category.sortOrder
    });
    setShowModal(true);
  };
  
  const handleDelete = async (id: string) => {
    if (!confirm(language === 'km' ? 'តើអ្នកប្រាកដថាចង់លុបប្រភេទនេះ?' : 'Are you sure you want to delete this category?')) return;
    
    try {
      const response = await fetch('/api/admin/categories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      
      if (!response.ok) throw new Error('Failed to delete category');
      
      setCategories(categories.filter(c => c.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error deleting category');
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    
    try {
      if (editingCategory) {
        // Update
        const response = await fetch('/api/admin/categories', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingCategory.id,
            nameEn: formData.nameEn,
            nameKm: formData.nameKm,
            slug: formData.slug,
            sortOrder: formData.sortOrder
          })
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to update category');
        }
        
        setCategories(categories.map(c => 
          c.id === editingCategory.id 
            ? { ...c, nameEn: formData.nameEn, nameKm: formData.nameKm, slug: formData.slug, sortOrder: formData.sortOrder }
            : c
        ));
      } else {
        // Create
        const response = await fetch('/api/admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nameEn: formData.nameEn,
            nameKm: formData.nameKm,
            slug: formData.slug,
            sortOrder: formData.sortOrder
          })
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to create category');
        }
        
        const data = await response.json();
        setCategories([...categories, data.category]);
      }
      
      setShowModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving category');
    } finally {
      setSaving(false);
    }
  };
  
  // Get localized category name
  const getCategoryName = (category: Category) => {
    return language === 'km' ? category.nameKm : category.nameEn;
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          {language === 'km' ? 'ប្រភេទផលិតផល' : 'Product Categories'}
        </h2>
        <Button variant="primary" onClick={handleAdd}>
          + {language === 'km' ? 'បន្ថែមប្រភេទ' : 'Add Category'}
        </Button>
      </div>
      
      {/* Categories list - Card layout */}
      <div className="space-y-2 md:space-y-3">
        {categories.length === 0 ? (
          <div className="card p-8 text-center text-gray-400">
            {language === 'km' ? 'មិនមានប្រភេទ' : 'No categories found'}
          </div>
        ) : (
          categories.map((category) => (
            <div key={category.id} className="card bg-gray-50/50 rounded-xl border border-gray-100 p-3">
              {/* Row 1: Names */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {category.sortOrder}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-gray-900 text-sm block truncate">{category.nameEn}</span>
                    <span className="text-xs text-gray-500 block truncate">{category.nameKm}</span>
                  </div>
                </div>
                <code className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600 flex-shrink-0 ml-2">
                  {category.slug}
                </code>
              </div>
              {/* Row 2: Actions */}
              <div className="flex items-center justify-end mt-2 pt-2 border-t border-gray-100">
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(category)}
                    className="p-1.5 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
                    title={t(language, 'common.edit')}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(category.id)}
                    className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    title={t(language, 'common.delete')}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingCategory 
          ? (language === 'km' ? 'កែប្រែប្រភេទ' : 'Edit Category')
          : (language === 'km' ? 'បន្ថែមប្រភេទ' : 'Add Category')
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={language === 'km' ? 'ឈ្មោះ (English)' : 'Name (English)'}
            value={formData.nameEn}
            onChange={(e) => {
              const nameEn = e.target.value;
              setFormData({ 
                ...formData, 
                nameEn,
                // Auto-generate slug if creating new
                slug: !editingCategory ? generateSlug(nameEn) : formData.slug
              });
            }}
            required
            placeholder="e.g. Coffee"
          />
          
          <Input
            label={language === 'km' ? 'ឈ្មោះ (ខ្មែរ)' : 'Name (Khmer)'}
            value={formData.nameKm}
            onChange={(e) => setFormData({ ...formData, nameKm: e.target.value })}
            required
            placeholder="ឧ. កាហ្វេ"
          />
          
          <Input
            label="Slug"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: generateSlug(e.target.value) })}
            required
            placeholder="e.g. coffee"
          />
          
          <Input
            label={language === 'km' ? 'លំដាប់តម្រៀប' : 'Sort Order'}
            type="number"
            min="0"
            value={formData.sortOrder.toString()}
            onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
          />
          
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl">
              {error}
            </div>
          )}
          
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="flex-1">
              {t(language, 'common.cancel')}
            </Button>
            <Button type="submit" variant="primary" loading={saving} className="flex-1">
              {t(language, 'common.save')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
