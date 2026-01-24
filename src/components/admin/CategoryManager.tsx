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
      
      {/* Categories list */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-200">
              <th className="text-left py-4 px-6 font-semibold text-gray-600">
                {language === 'km' ? 'ឈ្មោះ (English)' : 'Name (English)'}
              </th>
              <th className="text-left py-4 px-6 font-semibold text-gray-600">
                {language === 'km' ? 'ឈ្មោះ (ខ្មែរ)' : 'Name (Khmer)'}
              </th>
              <th className="text-left py-4 px-6 font-semibold text-gray-600">
                Slug
              </th>
              <th className="text-center py-4 px-6 font-semibold text-gray-600">
                {language === 'km' ? 'លំដាប់' : 'Order'}
              </th>
              <th className="text-right py-4 px-6 font-semibold text-gray-600">
                {language === 'km' ? 'សកម្មភាព' : 'Actions'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {categories.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-400">
                  {language === 'km' ? 'មិនមានប្រភេទ' : 'No categories found'}
                </td>
              </tr>
            ) : (
              categories.map((category) => (
                <tr key={category.id} className="hover:bg-gray-50/50">
                  <td className="py-4 px-6">
                    <span className="font-medium text-gray-900">{category.nameEn}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="font-medium text-gray-900">{category.nameKm}</span>
                  </td>
                  <td className="py-4 px-6">
                    <code className="px-2 py-1 bg-gray-100 rounded text-sm text-gray-600">
                      {category.slug}
                    </code>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className="text-gray-600">{category.sortOrder}</span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(category)}>
                        {t(language, 'common.edit')}
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => handleDelete(category.id)}>
                        {t(language, 'common.delete')}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
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
