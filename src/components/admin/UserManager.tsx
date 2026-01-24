import React, { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { useLanguageStore } from '../../lib/store';
import { t } from '../../i18n';

interface User {
  id: string;
  username: string;
  role: 'admin' | 'cashier';
  createdAt: string;
}

export function UserManager() {
  const { language } = useLanguageStore();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'cashier' as 'admin' | 'cashier'
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  useEffect(() => {
    fetchUsers();
  }, []);
  
  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading users');
    } finally {
      setLoading(false);
    }
  };
  
  const handleAdd = () => {
    setEditingUser(null);
    setFormData({ username: '', password: '', role: 'cashier' });
    setShowModal(true);
  };
  
  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '',
      role: user.role
    });
    setShowModal(true);
  };
  
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete user');
      }
      
      setUsers(users.filter(u => u.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error deleting user');
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    
    try {
      if (editingUser) {
        // Update
        const response = await fetch('/api/admin/users', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingUser.id,
            username: formData.username,
            password: formData.password || undefined,
            role: formData.role
          })
        });
        
        if (!response.ok) throw new Error('Failed to update user');
        
        setUsers(users.map(u => 
          u.id === editingUser.id 
            ? { ...u, username: formData.username, role: formData.role }
            : u
        ));
      } else {
        // Create
        if (!formData.password) {
          throw new Error('Password is required');
        }
        
        const response = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: formData.username,
            password: formData.password,
            role: formData.role
          })
        });
        
        if (!response.ok) throw new Error('Failed to create user');
        
        const data = await response.json();
        setUsers([...users, data.user]);
      }
      
      setShowModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving user');
    } finally {
      setSaving(false);
    }
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
        <h2 className="text-2xl font-bold text-gray-900">{t(language, 'admin.users')}</h2>
        <Button variant="primary" onClick={handleAdd}>
          + {t(language, 'admin.addUser')}
        </Button>
      </div>
      
      {/* Users list - Card layout */}
      <div className="space-y-2 md:space-y-3">
        {users.length === 0 ? (
          <div className="card p-8 text-center text-gray-400">
            {language === 'km' ? 'មិនមានអ្នកប្រើប្រាស់' : 'No users found'}
          </div>
        ) : (
          users.map((user) => (
            <div key={user.id} className="card bg-gray-50/50 rounded-xl border border-gray-100 p-3">
              {/* Row 1: Avatar + Username and Role badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                    {user.username[0].toUpperCase()}
                  </div>
                  <span className="font-medium text-gray-900 truncate">{user.username}</span>
                </div>
                <Badge variant={user.role === 'admin' ? 'info' : 'gray'}>
                  {user.role === 'admin' ? t(language, 'admin.roleAdmin') : t(language, 'admin.roleCashier')}
                </Badge>
              </div>
              {/* Row 2: Created date and Actions */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString(language === 'km' ? 'km-KH' : 'en-US')}
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(user)}
                    className="p-1.5 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
                    title={t(language, 'common.edit')}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
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
        title={editingUser ? t(language, 'admin.editUser') : t(language, 'admin.addUser')}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={t(language, 'auth.username')}
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            required
          />
          
          <Input
            label={t(language, 'auth.password') + (editingUser ? ' (leave blank to keep current)' : '')}
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required={!editingUser}
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              {t(language, 'admin.role')}
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'cashier' })}
              className="input"
              required
            >
              <option value="cashier">{t(language, 'admin.roleCashier')}</option>
              <option value="admin">{t(language, 'admin.roleAdmin')}</option>
            </select>
          </div>
          
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
