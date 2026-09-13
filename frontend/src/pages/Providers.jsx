import { useState, useEffect, useMemo } from 'react';
import {
  getProviders,
  getSpecializations,
  createProvider,
  updateProvider,
  deleteProvider
} from '../api/providers';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import {
  UserPlus, Edit, Trash2, Search, Stethoscope, CheckCircle2,
  AlertCircle, X, RefreshCw, UserCheck, Shield, Filter, Award, Activity, ToggleLeft, ToggleRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const TITLE_OPTIONS = [
  'Dr.',
  'Mr.',
  'Ms.',
  'Mrs.',
  'Prof.',
  'Assoc. Prof.',
  'Nurse',
  'Tech'
];

const Providers = () => {
  const { user: currentUser, hasPermission } = useAuth();
  const [providers, setProviders] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecFilter, setSelectedSpecFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);
  const [formName, setFormName] = useState('');
  const [formTitle, setFormTitle] = useState('Dr.');
  const [formSpecId, setFormSpecId] = useState('');
  const [formCustomSpec, setFormCustomSpec] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Delete Modal States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [provRes, specRes] = await Promise.all([
        getProviders(),
        getSpecializations()
      ]);
      setProviders(provRes.data?.data || []);
      setSpecializations(specRes.data?.data || []);
    } catch (err) {
      console.error('Failed to load providers:', err);
      toast.error(err.response?.data?.message || 'Failed to load providers list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleOpenAddModal = () => {
    setEditingProvider(null);
    setFormName('');
    setFormTitle('Dr.');
    setFormSpecId('');
    setFormCustomSpec('');
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (provider) => {
    setEditingProvider(provider);
    setFormName(provider.name || '');
    setFormTitle(provider.title || 'Dr.');
    setFormSpecId(provider.specialization_id ? String(provider.specialization_id) : '');
    setFormCustomSpec(provider.specialization || '');
    setFormIsActive(Boolean(provider.is_active));
    setIsModalOpen(true);
  };

  const handleSaveProvider = async (e) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error('Provider name is required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formName.trim(),
        title: formTitle || null,
        specializationId: formSpecId ? parseInt(formSpecId, 10) : null,
        specialization: formSpecId === 'custom' || !formSpecId ? formCustomSpec.trim() : null,
        isActive: formIsActive ? 1 : 0
      };

      if (editingProvider) {
        await updateProvider(editingProvider.id, payload);
        toast.success(`Provider "${formName}" updated successfully.`);
      } else {
        await createProvider(payload);
        toast.success(`Provider "${formName}" created successfully.`);
      }

      setIsModalOpen(false);
      fetchInitialData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save provider.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (provider) => {
    try {
      const newStatus = provider.is_active ? 0 : 1;
      await updateProvider(provider.id, { isActive: newStatus });
      toast.success(`Provider "${provider.name}" ${newStatus ? 'activated' : 'deactivated'}.`);
      setProviders(prev => prev.map(p => p.id === provider.id ? { ...p, is_active: newStatus } : p));
    } catch (err) {
      console.error(err);
      toast.error('Failed to update provider status.');
    }
  };

  const handleOpenDeleteModal = (provider) => {
    setProviderToDelete(provider);
    setAdminPassword('');
    setIsDeleteModalOpen(true);
  };

  const handleDeleteProvider = async (e) => {
    e.preventDefault();
    if (!adminPassword) {
      toast.error('Please enter your admin password.');
      return;
    }

    setIsDeleting(true);
    try {
      await deleteProvider(providerToDelete.id, adminPassword);
      toast.success(`Provider "${providerToDelete.name}" deleted.`);
      setIsDeleteModalOpen(false);
      setProviders(prev => prev.filter(p => p.id !== providerToDelete.id));
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Deletion failed. Check administrative password.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered providers
  const filteredProviders = useMemo(() => {
    return providers.filter(p => {
      // Search term
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (p.name || '').toLowerCase().includes(q);
        const matchesTitle = (p.title || '').toLowerCase().includes(q);
        const matchesSpec = (p.specialization_name || p.specialization || '').toLowerCase().includes(q);
        if (!matchesName && !matchesTitle && !matchesSpec) return false;
      }

      // Specialization filter
      if (selectedSpecFilter !== 'all') {
        const specName = (p.specialization_name || p.specialization || '').toLowerCase();
        if (specName !== selectedSpecFilter.toLowerCase()) return false;
      }

      // Status filter
      if (statusFilter === 'active' && !p.is_active) return false;
      if (statusFilter === 'inactive' && p.is_active) return false;

      return true;
    });
  }, [providers, searchQuery, selectedSpecFilter, statusFilter]);

  // Derived metrics
  const totalCount = providers.length;
  const activeCount = providers.filter(p => p.is_active).length;
  const specCount = new Set(providers.map(p => p.specialization_name || p.specialization).filter(Boolean)).size;

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sky-700 text-sm font-semibold tracking-wide uppercase mb-1">
            <UserCheck className="w-4 h-4" />
            <span>Admin Management</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Provider Directory</h1>
          <p className="text-sm text-slate-500 mt-1">Manage clinical providers, specialists, titles, and active statuses across all departments.</p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-700 text-white font-medium rounded-lg hover:bg-sky-800 transition-colors shadow-sm text-sm"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Provider</span>
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Providers</p>
            <p className="text-2xl font-bold text-slate-900">{totalCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Providers</p>
            <p className="text-2xl font-bold text-slate-900">{activeCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Specializations</p>
            <p className="text-2xl font-bold text-slate-900">{specCount}</p>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-3 md:space-y-0 md:flex md:items-center md:justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search provider by name, title, or specialization..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
          />
        </div>

        {/* Dropdowns & Filter Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Specialization Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedSpecFilter}
              onChange={(e) => setSelectedSpecFilter(e.target.value)}
              className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-700"
            >
              <option value="all">All Specializations</option>
              {specializations.map(spec => (
                <option key={spec.id} value={spec.name}>{spec.name}</option>
              ))}
            </select>
          </div>

          {/* Status Tabs */}
          <div className="inline-flex bg-slate-100 p-1 rounded-lg text-xs font-medium">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-md transition-colors ${statusFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-md transition-colors ${statusFilter === 'active' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1.5 rounded-md transition-colors ${statusFilter === 'inactive' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Inactive
            </button>
          </div>

          <button
            onClick={fetchInitialData}
            title="Refresh List"
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Providers Table / Cards */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {filteredProviders.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Stethoscope className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <p className="text-base font-semibold text-slate-700">No providers found</p>
            <p className="text-xs text-slate-400 mt-1">Try refining your search terms or filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Provider Details</th>
                  <th className="py-3.5 px-4">Title</th>
                  <th className="py-3.5 px-4">Specialization</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProviders.map(p => {
                  const specName = p.specialization_name || p.specialization || 'Unassigned';
                  const initials = p.name ? p.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'PR';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-sky-100 text-sky-800 font-bold text-xs flex items-center justify-center border border-sky-200">
                            {initials}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 block">{p.name}</span>
                            <span className="text-xs text-slate-400">ID: #{p.id}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {p.title || '—'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {specName}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleStatus(p)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                            p.is_active
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-300'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${p.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {p.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            title="Edit Provider"
                            className="p-1.5 text-slate-500 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenDeleteModal(p)}
                            title="Delete Provider"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingProvider ? `Edit Provider: ${editingProvider.name}` : 'Add New Provider'}
        >
          <form onSubmit={handleSaveProvider} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Title
              </label>
              <select
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800"
              >
                {TITLE_OPTIONS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Dr. Jean Paul Habimana"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 placeholder-slate-400"
              />
            </div>

            {/* Specialization */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Specialization / Department
              </label>
              <select
                value={formSpecId}
                onChange={(e) => {
                  setFormSpecId(e.target.value);
                  if (e.target.value !== 'custom') {
                    const found = specializations.find(s => String(s.id) === e.target.value);
                    if (found) setFormCustomSpec(found.name);
                  }
                }}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 mb-2"
              >
                <option value="">Select Specialization...</option>
                {specializations.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
                <option value="custom">+ Add Custom Specialization</option>
              </select>

              {(formSpecId === 'custom' || (!formSpecId && formCustomSpec)) && (
                <input
                  type="text"
                  value={formCustomSpec}
                  onChange={(e) => setFormCustomSpec(e.target.value)}
                  placeholder="Enter specialization name (e.g. CARDIOLOGY)"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800 placeholder-slate-400"
                />
              )}
            </div>

            {/* Active Status */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-slate-800 block">Active Status</span>
                <span className="text-xs text-slate-400">Allow this provider to appear in daily logs & reports</span>
              </div>
              <button
                type="button"
                onClick={() => setFormIsActive(!formIsActive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formIsActive ? 'bg-sky-700' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formIsActive ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium bg-sky-700 text-white rounded-lg hover:bg-sky-800 disabled:opacity-50 transition-colors shadow-sm"
              >
                {submitting ? 'Saving...' : editingProvider ? 'Update Provider' : 'Create Provider'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && providerToDelete && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title={`Confirm Deletion of Provider`}
        >
          <form onSubmit={handleDeleteProvider} className="space-y-4">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-3 text-rose-800 text-sm">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Deleting provider "{providerToDelete.name}"</p>
                <p className="text-xs text-rose-700 mt-1">This action cannot be undone. Enter your administrator password to confirm.</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Admin Password
              </label>
              <input
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter your password to verify"
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 text-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Providers;
