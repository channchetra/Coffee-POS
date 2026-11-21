import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useLanguageStore } from '../../lib/store';
import { formatUSD } from '../../lib/utils/currency';
import { t } from '../../i18n';
import type { Product, Category, ProductFormData } from './product-types';

interface ProductFormModalProps {
  isOpen: boolean;
  product: Product | null;
  categories: Category[];
  formData: ProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  onToggleCategory: (slug: string, checked: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  uploading: boolean;
  saving: boolean;
  error: string;
  displayExchangeRate: number;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
}

export function ProductFormModal({
  isOpen,
  product,
  categories,
  formData,
  setFormData,
  onToggleCategory,
  fileInputRef,
  onImageUpload,
  uploading,
  saving,
  error,
  displayExchangeRate,
  onClose,
  onSubmit,
}: ProductFormModalProps) {
  const { language } = useLanguageStore();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={product ? t(language, 'admin.editProduct') : t(language, 'admin.addProduct')}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          label={language === 'km' ? 'ឈ្មោះផលិតផល (English)' : 'Product Name (English)'}
          value={formData.nameEn}
          onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
          required
          placeholder="e.g. Espresso"
        />

        <Input
          label={language === 'km' ? 'ឈ្មោះផលិតផល (ខ្មែរ)' : 'Product Name (Khmer)'}
          value={formData.nameKm}
          onChange={(e) => setFormData({ ...formData, nameKm: e.target.value })}
          required
          placeholder="ឧ. អេស្ប្រេសូ"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {language === 'km' ? 'ប្រភេទ (ជ្រើសរើសបានច្រើន)' : 'Categories (select multiple)'}
          </label>
          {categories.length === 0 ? (
            <div className="input text-gray-400">
              {language === 'km' ? 'មិនមានប្រភេទ' : 'No categories available'}
            </div>
          ) : (
            <div className="border border-gray-300 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2">
              {categories.map((cat) => (
                <label key={cat.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.categories.includes(cat.slug)}
                    onChange={(e) => onToggleCategory(cat.slug, e.target.checked)}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">
                    {language === 'km' ? cat.nameKm : cat.nameEn}
                  </span>
                </label>
              ))}
            </div>
          )}
          {categories.length === 0 && (
            <p className="mt-1 text-sm text-amber-600">
              <a href="/admin/categories" className="underline hover:text-amber-700">
                {language === 'km' ? 'បន្ថែមប្រភេទមុន' : 'Add categories first'}
              </a>
            </p>
          )}
          {formData.categories.length === 0 && categories.length > 0 && (
            <p className="mt-1 text-sm text-amber-600">
              {language === 'km' ? 'សូមជ្រើសរើសយ៉ាងហោចណាស់មួយប្រភេទ' : 'Please select at least one category'}
            </p>
          )}
        </div>

        <div>
          <Input
            label={language === 'km' ? 'តម្លៃ (រៀល)' : 'Price (KHR)'}
            type="number"
            step="100"
            min="0"
            value={formData.priceKHR}
            onChange={(e) => setFormData({ ...formData, priceKHR: e.target.value })}
            required
            placeholder="e.g. 10000"
          />
          {formData.priceKHR && (
            <p className="mt-1 text-sm text-gray-500">
              ≈ {formatUSD(Math.round((parseInt(formData.priceKHR) / displayExchangeRate) * 100))}
            </p>
          )}
        </div>

        {/* Image Upload Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {language === 'km' ? 'រូបភាពផលិតផល' : 'Product Image'}
          </label>

          {/* Current image preview */}
          {formData.imageUrl && (
            <div className="mb-3 relative">
              <img 
                src={formData.imageUrl} 
                alt="Preview" 
                className="w-full h-40 object-cover rounded-xl border border-gray-200"
              />
              <button
                type="button"
                onClick={() => setFormData({ ...formData, imageUrl: '' })}
                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Upload button */}
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onImageUpload}
              className="hidden"
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-primary-50/50 transition-all ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {uploading ? (
                <>
                  <div className="animate-spin w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full"></div>
                  <span className="text-gray-600">{language === 'km' ? 'កំពុងផ្ទុកឡើង...' : 'Uploading...'}</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-gray-600">{language === 'km' ? 'ផ្ទុករូបភាពឡើង' : 'Upload Image'}</span>
                </>
              )}
            </label>
          </div>

          {/* Or enter URL */}
          <div className="mt-3">
            <Input
              label={language === 'km' ? 'ឬបញ្ចូល URL រូបភាព' : 'Or enter image URL'}
              type="text"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              placeholder="/images/products/example.svg"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            {t(language, 'common.cancel')}
          </Button>
          <Button type="submit" variant="primary" loading={saving} className="flex-1">
            {t(language, 'common.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
