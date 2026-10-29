import { useState, useEffect, useMemo } from 'react';
import {
  getProviders,
  getSpecializations,
  getLinkableUsers,
  createProvider,
  updateProvider,
  linkProviderUser,
  deleteProvider
} from '../api/providers';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import {
  UserPlus, Edit, Trash2, Search, Stethoscope, CheckCircle2,
  AlertCircle, X, RefreshCw, UserCheck, Shield, Filter, Award, Activity,
  ToggleLeft, ToggleRight, Link2, Unlink, User, AtSign, Check
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
  const [linkableUsers, setLinkableUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecFilter, setSelectedSpecFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'
  const [linkedFilter, setLinkedFilter] = useState('all'); // 'all', 'linked', 'unlinked'

  // Add / Edit Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);
  const [formName, setFormName] = useState('');
  const [formTitle, setFormTitle] = useState('Dr.');
  const [formSpecId, setFormSpecId] = useState('');
  const [formCustomSpec, setFormCustomSpec] = useState('');
  const [formUserId, setFormUserId] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Quick Link Modal States
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [providerToLink, setProviderToLink] = useState(null);
  const [selectedLinkUserId, setSelectedLinkUserId] = useState('');
  const [linkSearchQuery, setLinkSearchQuery] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  // Delete Modal States
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [provRes, specRes, usersRes] = await Promise.all([
        getProviders(),
        getSpecializations(),
        getLinkableUsers().catch(() => ({ data: { data: [] } }))
      ]);
      setProviders(provRes.data?.data || []);
      setSpecializations(specRes.data?.data || []);
      setLinkableUsers(usersRes.data?.data || []);
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
    setFormUserId('');
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (provider) => {
    setEditingProvider(provider);
    setFormName(provider.name || '');
    setFormTitle(provider.title || 'Dr.');
    setFormSpecId(provider.specialization_id ? String(provider.specialization_id) : '');
    setFormCustomSpec(provider.specialization || '');
    setFormUserId(provider.user_id ? String(provider.user_id) : '');
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
        isActive: formIsActive ? 1 : 0,
        userId: formUserId ? parseInt(formUserId, 10) : null
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

  // Quick Link Modal Handlers
  const handleOpenQuickLinkModal = (provider) => {
    setProviderToLink(provider);
    setSelectedLinkUserId(provider.user_id ? String(provider.user_id) : '');
    setLinkSearchQuery('');
    setIsLinkModalOpen(true);
  };

  const handleQuickLinkSubmit = async (e) => {
    e.preventDefault();
    if (!providerToLink) return;

    setIsLinking(true);
    try {
      const targetUserId = selectedLinkUserId ? parseInt(selectedLinkUserId, 10) : null;
      const res = await linkProviderUser(providerToLink.id, targetUserId);
      const updatedProvider = res.data?.data;

      toast.success(
        targetUserId
          ? `Provider "${providerToLink.name}" linked to system user.`
          : `Provider "${providerToLink.name}" unlinked from system user.`
      );

      // Update provider in state
      setProviders(prev => prev.map(p => {
        if (p.id === providerToLink.id) {
          return {
            ...p,
            user_id: updatedProvider?.user_id ?? targetUserId,
            user_username: updatedProvider?.user_username,
            user_full_name: updatedProvider?.user_full_name,
            user_email: updatedProvider?.user_email,
            user_role_name: updatedProvider?.user_role_name,
            user_role_key: updatedProvider?.user_role_key
          };
        }
        return p;
      }));

      // Update linkableUsers cache
      setLinkableUsers(prev => prev.map(u => {
        if (targetUserId && u.id === targetUserId) {
          return { ...u, linked_provider_id: providerToLink.id, linked_provider_name: providerToLink.name };
        }
        if (u.linked_provider_id === providerToLink.id) {
          return { ...u, linked_provider_id: null, linked_provider_name: null };
        }
        return u;
      }));

      setIsLinkModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update user link.');
    } finally {
      setIsLinking(false);
    }
  };

  const handleOpenDeleteModal = (provider) => {
    setProviderToDelete(provider);
    setAdminPassword('');
    setDeleteError('');
    setIsDeleteModalOpen(true);
  };

  const handleDeleteProvider = async (e) => {
    e.preventDefault();
    setDeleteError('');
    if (!adminPassword) {
      const msg = 'Please enter your admin password.';
      setDeleteError(msg);
      toast.error(msg);
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
      const msg = err.response?.data?.message || 'Deletion failed. Check administrative password.';
      setDeleteError(msg);
      toast.error(msg);
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
        const matchesUser = (p.user_username || '').toLowerCase().includes(q) || (p.user_full_name || '').toLowerCase().includes(q);
        if (!matchesName && !matchesTitle && !matchesSpec && !matchesUser) return false;
      }

      // Specialization filter
      if (selectedSpecFilter !== 'all') {
        const specName = (p.specialization_name || p.specialization || '').toLowerCase();
        if (specName !== selectedSpecFilter.toLowerCase()) return false;
      }

      // Status filter
      if (statusFilter === 'active' && !p.is_active) return false;
      if (statusFilter === 'inactive' && p.is_active) return false;

      // Linked filter
      if (linkedFilter === 'linked' && !p.user_id) return false;
      if (linkedFilter === 'unlinked' && p.user_id) return false;

      return true;
    });
  }, [providers, searchQuery, selectedSpecFilter, statusFilter, linkedFilter]);

  // Derived metrics
  const totalCount = providers.length;
  const activeCount = providers.filter(p => p.is_active).length;
  const linkedCount = providers.filter(p => p.user_id).length;
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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Provider Directory &amp; User Accounts</h1>
          <p className="text-sm text-slate-500 mt-1">Manage clinical providers, specialists, titles, and link them to system user accounts for seamless access.</p>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <div className="w-12 h-12 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Linked to Users</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{linkedCount}</span>
              <span className="text-xs text-slate-400 font-medium">of {totalCount}</span>
            </div>
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
            placeholder="Search by name, title, specialization, or linked user..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
          />
        </div>

        {/* Dropdowns & Filter Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Linked Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Link2 className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={linkedFilter}
              onChange={(e) => setLinkedFilter(e.target.value)}
              className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-700"
            >
              <option value="all">All Accounts (Linked &amp; Unlinked)</option>
              <option value="linked">Linked to Users Only</option>
              <option value="unlinked">Unlinked Only</option>
            </select>
          </div>

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

      {/* Providers Table */}
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
                  <th className="py-3.5 px-4">Linked System User</th>
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

                      {/* Linked System User Column */}
                      <td className="py-3.5 px-4">
                        {p.user_id ? (
                          <div className="inline-flex items-center gap-1.5 group">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <UserCheck size={13} className="text-emerald-600" />
                              <span>{p.user_full_name || p.user_username}</span>
                              <span className="text-emerald-600 font-mono text-[10px]">(@{p.user_username})</span>
                            </span>
                            <button
                              onClick={() => handleOpenQuickLinkModal(p)}
                              title="Edit linked user account"
                              className="p-1 text-slate-400 hover:text-sky-700 hover:bg-sky-50 rounded transition-colors"
                            >
                              <Link2 size={13} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenQuickLinkModal(p)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-slate-500 hover:text-sky-700 bg-slate-50 hover:bg-sky-50 border border-dashed border-slate-300 hover:border-sky-300 transition-colors"
                            title="Click to link this provider to a system user"
                          >
                            <Link2 size={12} className="text-slate-400" />
                            <span>Link User</span>
                          </button>
                        )}
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
                            onClick={() => handleOpenQuickLinkModal(p)}
                            title={p.user_id ? 'Change linked user' : 'Link to system user'}
                            className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                          >
                            <Link2 className="w-4 h-4" />
                          </button>
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

            {/* Linked System User Account */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck size={14} className="text-sky-700" />
                  <span>Link to System User Account</span>
                </label>
                {formUserId && (
                  <button
                    type="button"
                    onClick={() => setFormUserId('')}
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-800"
                  >
                    Unlink
                  </button>
                )}
              </div>
              <select
                value={formUserId}
                onChange={(e) => setFormUserId(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800"
              >
                <option value="">— None (Unlinked) —</option>
                {linkableUsers.map(u => {
                  const isAlreadyLinkedOther = u.linked_provider_id && editingProvider?.id !== u.linked_provider_id;
                  return (
                    <option key={u.id} value={u.id}>
                      {u.full_name || u.username} (@{u.username}) • {u.role_name || u.role_key}
                      {isAlreadyLinkedOther ? ` [Linked to ${u.linked_provider_name}]` : ''}
                    </option>
                  );
                })}
              </select>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Associates this clinical provider with their portal login account for automated shift rosters, clinical observations, and personal imaging shares.
              </p>
            </div>

            {/* Active Status */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-slate-800 block">Active Status</span>
                <span className="text-xs text-slate-400">Allow this provider to appear in daily logs &amp; reports</span>
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

      {/* Quick Link Provider to User Modal */}
      {isLinkModalOpen && providerToLink && (
        <Modal
          isOpen={isLinkModalOpen}
          onClose={() => setIsLinkModalOpen(false)}
          title={`Link System User Account`}
        >
          <form onSubmit={handleQuickLinkSubmit} className="space-y-4">
            <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-xl flex items-start gap-3 text-sky-900 text-xs">
              <UserCheck className="w-5 h-5 text-sky-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-sky-950">
                  {providerToLink.title ? `${providerToLink.title} ` : ''}{providerToLink.name}
                </p>
                <p className="text-sky-800 mt-0.5">
                  Specialization: {providerToLink.specialization_name || providerToLink.specialization || 'General Practice'}
                </p>
                <p className="text-sky-700 mt-1 leading-relaxed">
                  Linking this provider allows Lumina to automatically associate referred imaging studies, diagnostic notes, and shift rosters with their portal login.
                </p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Select System User Account
                </label>
                <span className="text-[11px] text-slate-400">
                  {linkableUsers.length} available users
                </span>
              </div>

              <input
                type="text"
                placeholder="Type to filter users by name, username, or role..."
                value={linkSearchQuery}
                onChange={(e) => setLinkSearchQuery(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />

              <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white shadow-inner">
                {/* None / Unlink option */}
                <label
                  className={`flex items-center gap-3 p-3 text-xs cursor-pointer transition-colors ${
                    !selectedLinkUserId ? 'bg-sky-50/70 text-sky-900 font-bold' : 'hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="linkedUserOption"
                    value=""
                    checked={!selectedLinkUserId}
                    onChange={() => setSelectedLinkUserId('')}
                    className="text-sky-700 focus:ring-sky-500"
                  />
                  <div className="flex-1">
                    <span className="block font-semibold">None / Unlinked</span>
                    <span className="text-[11px] text-slate-400">Leave provider without an associated user login</span>
                  </div>
                </label>

                {linkableUsers
                  .filter(u => {
                    if (!linkSearchQuery.trim()) return true;
                    const q = linkSearchQuery.toLowerCase();
                    return (
                      (u.full_name || '').toLowerCase().includes(q) ||
                      (u.username || '').toLowerCase().includes(q) ||
                      (u.role_name || '').toLowerCase().includes(q) ||
                      (u.email || '').toLowerCase().includes(q)
                    );
                  })
                  .map(u => {
                    const isSelected = String(selectedLinkUserId) === String(u.id);
                    const isOtherLinked = u.linked_provider_id && u.linked_provider_id !== providerToLink.id;
                    return (
                      <label
                        key={u.id}
                        className={`flex items-center gap-3 p-3 text-xs cursor-pointer transition-colors ${
                          isSelected ? 'bg-sky-50 text-sky-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <input
                          type="radio"
                          name="linkedUserOption"
                          value={u.id}
                          checked={isSelected}
                          onChange={() => setSelectedLinkUserId(String(u.id))}
                          className="text-sky-700 focus:ring-sky-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-900">{u.full_name || u.username}</span>
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                              {u.role_name || u.role_key}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-slate-600">@{u.username}</span>
                            {u.email && <span>&bull; {u.email}</span>}
                            {isOtherLinked && (
                              <span className="text-amber-600 font-semibold">(Linked to {u.linked_provider_name})</span>
                            )}
                          </div>
                        </div>
                      </label>
                    );
                  })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLinking}
                className="px-4 py-2 text-sm font-medium bg-sky-700 hover:bg-sky-800 text-white rounded-lg disabled:opacity-50 transition-colors shadow-sm flex items-center gap-1.5"
              >
                <UserCheck size={16} />
                <span>{isLinking ? 'Saving Link...' : selectedLinkUserId ? 'Save User Link' : 'Unlink Account'}</span>
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

            {deleteError && (
              <div className="p-3 bg-red-100 border border-red-300 rounded-lg flex items-center gap-2.5 text-red-800 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Admin Password
              </label>
              <input
                type="password"
                required
                value={adminPassword}
                onChange={(e) => {
                  setAdminPassword(e.target.value);
                  if (deleteError) setDeleteError('');
                }}
                placeholder="Enter your password to verify"
                className={`w-full px-3.5 py-2 text-sm bg-slate-50 border ${
                  deleteError ? 'border-red-400 focus:ring-red-500' : 'border-slate-200 focus:ring-rose-500'
                } rounded-lg focus:outline-none focus:ring-2 text-slate-800`}
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
