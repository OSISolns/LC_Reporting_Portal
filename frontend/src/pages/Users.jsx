import { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser, getRoles, deleteUser, resetPassword, bulkSendCredentials, sendSingleCredentials } from '../api/users';
import { getUserEffectivePermissions, setUserOverride } from '../api/permissions';
import LoadingSpinner from '../components/LoadingSpinner';
import { UserPlus, Edit, X, Shield, Mail, Trash2, Key, CheckCircle2, AlertCircle, Search, RefreshCw, Send, CheckSquare, Square, Eye, Sparkles, Building2, ChevronDown, Layers } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

// Complete department definitions across Legacy Clinics
const DEPARTMENT_CONFIG = [
  {
    id: 'lab',
    name: 'Laboratory',
    icon: '🧪',
    match: (u) => {
      const r = (u.role_key || '').toLowerCase();
      const n = (u.role_name || '').toLowerCase();
      const un = (u.username || '').toLowerCase();
      return r.includes('lab') || n.includes('lab') || r === 'quality_manager' || 
        ['lc_zawadi', 'lc_angelique', 'lc_calixte', 'lc_sylvestre', 'lc_hirwa', 'lc_mchantal', 
         'lc_rafiki', 'lc_claire', 'lc_jeanne_k', 'lc_kabasinga', 'lc_edith', 'lc_clemence', 
         'lc_benjamin', 'lc_uwitonze', 'lc_nzabihimana', 'lc_samantha', 'lc_manizabayo', 
         'lc_honore', 'lc_uwumuremyi', 'lc_egide', 'lc_nerisa', 'lc_assoumpta', 'lc_berchmas', 
         'lc_ishema', 'lc_mpinganzima', 'lc_mugabe'].includes(un);
    }
  },
  {
    id: 'nursing',
    name: 'Nursing',
    icon: '🩺',
    match: (u) => {
      const r = (u.role_key || '').toLowerCase();
      const n = (u.role_name || '').toLowerCase();
      return r.includes('nurse') || n.includes('nurse');
    }
  },
  {
    id: 'customer_care',
    name: 'Customer Care',
    icon: '🎧',
    match: (u) => {
      const r = (u.role_key || '').toLowerCase();
      const n = (u.role_name || '').toLowerCase();
      return r.includes('customer') || n.includes('customer');
    }
  },
  {
    id: 'dental',
    name: 'Dental & Dental Lab',
    icon: '🦷',
    match: (u) => {
      const r = (u.role_key || '').toLowerCase();
      const n = (u.role_name || '').toLowerCase();
      return r.includes('dent') || n.includes('dent');
    }
  },
  {
    id: 'imaging',
    name: 'Imaging / Radiology',
    icon: '🩻',
    match: (u) => {
      const r = (u.role_key || '').toLowerCase();
      const n = (u.role_name || '').toLowerCase();
      return r.includes('imaging') || n.includes('imaging');
    }
  },
  {
    id: 'physio',
    name: 'Physiotherapy',
    icon: '🏃',
    match: (u) => {
      const r = (u.role_key || '').toLowerCase();
      const n = (u.role_name || '').toLowerCase();
      return r.includes('physio') || n.includes('physio');
    }
  },
  {
    id: 'logistics_store',
    name: 'Logistics, Store & Procurement',
    icon: '📦',
    match: (u) => {
      const r = (u.role_key || '').toLowerCase();
      const n = (u.role_name || '').toLowerCase();
      return ['logistics', 'stock', 'procurement'].some(k => r.includes(k) || n.includes(k));
    }
  },
  {
    id: 'cashier',
    name: 'Cashier & Finance',
    icon: '💵',
    match: (u) => {
      const r = (u.role_key || '').toLowerCase();
      const n = (u.role_name || '').toLowerCase();
      return r.includes('cashier') || n.includes('cashier');
    }
  },
  {
    id: 'medical',
    name: 'Medical & Doctors',
    icon: '👨‍⚕️',
    match: (u) => {
      const r = (u.role_key || '').toLowerCase();
      const n = (u.role_name || '').toLowerCase();
      return ['doctor', 'consultant', 'medical_director'].some(k => r.includes(k) || n.includes(k));
    }
  },
  {
    id: 'operations_admin',
    name: 'Operations & Administration',
    icon: '🏢',
    match: (u) => {
      const r = (u.role_key || '').toLowerCase();
      const n = (u.role_name || '').toLowerCase();
      return ['admin', 'coo', 'deputy_coo', 'chairman', 'it_officer', 'sales_manager', 'hsfp', 'pa', 'operations_staff'].includes(r) ||
             n.includes('operations') || n.includes('administrator') || n.includes('coo') || n.includes('chairman');
    }
  }
];

const Users = () => {
  const { user: currentUser, hasPermission } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [newUser, setNewUser] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    roleId: ''
  });
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resettingUser, setResettingUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [toast, setToast] = useState(null); // { message, type: 'success'|'error' }
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [adminPasswordForDelete, setAdminPasswordForDelete] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Bulk email credentials state
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkPasswordMode, setBulkPasswordMode] = useState('fixed'); // 'fixed' | 'random'
  const [bulkPassword, setBulkPassword] = useState('Legacy@2026');
  const [bulkMustChange, setBulkMustChange] = useState(true);
  const [bulkSubject, setBulkSubject] = useState('Your Legacy Clinics Lumina Portal Login Credentials');
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [bulkResults, setBulkResults] = useState(null);

  // Single user email credentials state
  const [singleEmailUser, setSingleEmailUser] = useState(null);
  const [isSingleEmailModalOpen, setIsSingleEmailModalOpen] = useState(false);
  const [singleEmailPassword, setSingleEmailPassword] = useState('Legacy@2026');
  const [singleMustChange, setSingleMustChange] = useState(true);
  const [isSingleSending, setIsSingleSending] = useState(false);

  // User permission overrides state
  const [overrideUser, setOverrideUser] = useState(null);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [effectivePerms, setEffectivePerms] = useState({});
  const [loadingOverrides, setLoadingOverrides] = useState(false);
  const [overrideSelections, setOverrideSelections] = useState({}); // { 'module:action': 'default'|'allow'|'deny' }
  const [overrideReasons, setOverrideReasons] = useState({}); // { 'module:action': 'reason string' }

  const handleOpenOverrides = async (user) => {
    setOverrideUser(user);
    setLoadingOverrides(true);
    setIsOverrideModalOpen(true);
    try {
      const res = await getUserEffectivePermissions(user.id);
      const data = res.data || {};
      setEffectivePerms(data);
      
      const selections = {};
      const reasons = {};
      Object.entries(data).forEach(([modName, actions]) => {
        Object.entries(actions).forEach(([actionName, info]) => {
          const key = `${modName}:${actionName}`;
          if (info.source === 'override') {
            selections[key] = info.granted ? 'allow' : 'deny';
            reasons[key] = info.reason || '';
          } else {
            selections[key] = 'default';
            reasons[key] = '';
          }
        });
      });
      setOverrideSelections(selections);
      setOverrideReasons(reasons);
    } catch (err) {
      console.error(err);
      showToast('Failed to fetch user permissions.', 'error');
      setIsOverrideModalOpen(false);
    } finally {
      setLoadingOverrides(false);
    }
  };

  const handleSaveOverrides = async (e) => {
    e.preventDefault();
    setLoadingOverrides(true);
    try {
      for (const [key, val] of Object.entries(overrideSelections)) {
        const [modName, actionName] = key.split(':');
        const original = effectivePerms[modName][actionName];
        const reason = overrideReasons[key] || '';

        const originalVal = original.source === 'override' ? (original.granted ? 'allow' : 'deny') : 'default';
        const originalReason = original.reason || '';

        if (val !== originalVal || (val !== 'default' && reason !== originalReason)) {
          let grantedVal = null;
          if (val === 'allow') grantedVal = true;
          if (val === 'deny') grantedVal = false;

          await setUserOverride(overrideUser.id, modName, actionName, grantedVal, reason);
        }
      }
      showToast(`Access overrides for "${overrideUser.full_name}" synchronized successfully.`, 'success');
      setIsOverrideModalOpen(false);
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to save permission overrides.', 'error');
    } finally {
      setLoadingOverrides(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Full edit access (admin-level): show all users and all roles
  // Limited access (e.g. IT Officer): show only non-privileged staff
  const canEditAll = currentUser?.role === 'admin';
  const isITOfficer = currentUser?.role === 'it_officer';

  const IT_OFFICER_ROLES_DISPLAY = [
    'Operations Staff',
    'Operations Officer',
    'Cashier',
    'Principal Cashier',
    'Customer Care Officer',
    'Customer Care',
    'Laboratory Technologist',
    'Lab Technologist',
    'Laboratory Scientist',
    'Laboratory Staff',
    'Laboratory Safety Officer',
    'Laboratory Stock Officer',
    'Dental Technologist',
    'Dental Tech',
    'Dental Department Staff',
    'Dental'
  ];
  const IT_OFFICER_ROLES_KEY = [
    'operations_staff',
    'operations',
    'cashier',
    'principal_cashier',
    'customer_care',
    'lab_tech',
    'lab_scientist',
    'lab',
    'lab_safety_officer',
    'lab_stock_officer',
    'dental_tech',
    'dental'
  ];

  const LOW_LEVEL_ROLES_DISPLAY = isITOfficer ? IT_OFFICER_ROLES_DISPLAY : ['Customer Care', 'Principal Cashier', 'Cashier', 'Operations Staff', 'Staff Member', 'Clinical Nurse', 'Chief Nurse Manager', 'Medical Doctor', 'Consultant', 'Medical Director', 'Procurement Manager', 'Physiotherapy Manager', 'Physiotherapist', 'Laboratory Manager', 'Lab Team Lead', 'Lab Lead', 'Lab Technologist', 'Laboratory Staff', 'Quality Manager', 'Quality & Accreditation Officer'];
  const LOW_LEVEL_ROLES_KEY = isITOfficer ? IT_OFFICER_ROLES_KEY : ['customer_care', 'principal_cashier', 'cashier', 'operations_staff', 'staff', 'nurse', 'chef-nurse', 'doctor', 'consultant', 'medical_director', 'procurement-manager', 'physio_manager', 'physio', 'lab_manager', 'lab_team_lead', 'lab_lead', 'lab_tech', 'lab', 'quality_manager', 'qm', 'quality_accreditation_officer'];

  const isAccessibleUser = (u) => {
    if (canEditAll) return true;
    return (
      (u.role_key && LOW_LEVEL_ROLES_KEY.includes(u.role_key)) ||
      (u.role_name && LOW_LEVEL_ROLES_DISPLAY.includes(u.role_name)) ||
      (u.role && (LOW_LEVEL_ROLES_KEY.includes(u.role) || LOW_LEVEL_ROLES_DISPLAY.includes(u.role)))
    );
  };

  const filteredUsers = (canEditAll
    ? users
    : users.filter(isAccessibleUser)
  ).filter(u => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role_name?.toLowerCase().includes(q)
    );
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const filteredRoles = canEditAll
    ? roles
    : roles.filter(r => LOW_LEVEL_ROLES_KEY.includes(r.name) || LOW_LEVEL_ROLES_DISPLAY.includes(r.display_name));

  const fetchData = async () => {
    try {
      const [uRes, rRes] = await Promise.all([
        getUsers().catch(() => ({ data: { data: [] } })),
        getRoles().catch(() => ({ data: { data: [] } }))
      ]);
      setUsers(uRes?.data?.data || []);
      setRoles(rRes?.data?.data || []);
      if (rRes?.data?.data?.length > 0 && !newUser.roleId) {
        setNewUser(prev => ({ ...prev, roleId: rRes.data.data[0].id }));
      }
    } catch (err) {
      console.error('Failed to fetch user data');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser({ ...user });
    setIsModalOpen(true);
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleDeleteClick = (userId, userName) => {
    if (userId === currentUser.id) {
      showToast('Security Protocol Error: You cannot delete your own account.', 'error');
      return;
    }
    setUserToDelete({ id: userId, name: userName });
    setAdminPasswordForDelete('');
    setDeleteError('');
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (e) => {
    e.preventDefault();
    setDeleteError('');
    if (!adminPasswordForDelete) {
      const msg = 'Please enter your administrative password.';
      setDeleteError(msg);
      showToast(msg, 'error');
      return;
    }
    
    setIsDeleting(true);
    try {
      await deleteUser(userToDelete.id, adminPasswordForDelete);
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      setAdminPasswordForDelete('');
      setDeleteError('');
      fetchData();
      showToast(`Staff account "${userToDelete.name}" has been permanently deleted.`, 'success');
    } catch (err) {
      console.error('Delete error:', err);
      const msg = err.response?.data?.message || 'Failed to delete user.';
      setDeleteError(msg);
      showToast(msg, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }
    try {
      await resetPassword(resettingUser.id, newPassword);
      setIsResetModalOpen(false);
      setNewPassword('');
      showToast(`Password for "${resettingUser.full_name}" has been reset successfully.`, 'success');
    } catch (err) {
      showToast('Failed to reset password.', 'error');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const targetRoleId = editingUser.role_id || roles.find(r => r.display_name === editingUser.role_name || r.name === editingUser.role_key)?.id;
    try {
      await updateUser(editingUser.id, {
        fullName: editingUser.full_name,
        username: editingUser.username,
        email: editingUser.email,
        roleId: targetRoleId,
        isActive: Boolean(editingUser.is_active)
      });
      setIsModalOpen(false);
      fetchData();
      showToast(`User record for "${editingUser.full_name}" updated successfully.`, 'success');
      alert(`User record for "${editingUser.full_name}" updated successfully.`);
    } catch (err) {
      console.error('Update error:', err);
      const errMsg = err.response?.data?.message || 'Failed to update user';
      showToast(errMsg, 'error');
      alert(errMsg);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newUser.roleId || isNaN(newUser.roleId)) {
      alert('Please select a valid system role');
      return;
    }
    try {
      await createUser(newUser);
      setIsCreateModalOpen(false);
      const createdName = newUser.fullName;
      setNewUser({ fullName: '', username: '', email: '', password: '', roleId: filteredRoles[0]?.id || roles[0]?.id });
      fetchData();
      showToast(`Staff account "${createdName}" created successfully.`, 'success');
      alert(`Staff account "${createdName}" created successfully.`);
    } catch (err) {
      console.error('Create error:', err);
      const errMsg = err.response?.data?.message || 'Failed to create user';
      showToast(errMsg, 'error');
      alert(errMsg);
    }
  };

  // Selection & bulk credential handlers
  const handleToggleSelectUser = (userId) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const visibleUsersWithEmail = paginatedUsers.filter(u => u.email);
  const isAllPageSelected = visibleUsersWithEmail.length > 0 && 
    visibleUsersWithEmail.every(u => selectedUserIds.includes(u.id));

  const handleToggleSelectAllPage = () => {
    if (isAllPageSelected) {
      const pageIds = new Set(visibleUsersWithEmail.map(u => u.id));
      setSelectedUserIds(prev => prev.filter(id => !pageIds.has(id)));
    } else {
      const pageIds = visibleUsersWithEmail.map(u => u.id);
      setSelectedUserIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleSelectAllWithEmail = () => {
    const allValid = filteredUsers.filter(u => u.email).map(u => u.id);
    setSelectedUserIds(allValid);
    showToast(`Selected ${allValid.length} staff member${allValid.length !== 1 ? 's' : ''} with email addresses.`, 'success');
  };

  const handleSelectDepartment = (deptId, append = false) => {
    setSelectedDeptId(deptId);
    if (!deptId) return;

    const dept = DEPARTMENT_CONFIG.find(d => d.id === deptId);
    if (!dept) return;

    const accessibleUsers = canEditAll ? users : users.filter(isAccessibleUser);
    const targetPool = searchQuery.trim() ? filteredUsers : accessibleUsers;
    const matchedUsers = targetPool.filter(u => u.email && dept.match(u)).map(u => u.id);
    if (matchedUsers.length === 0) {
      showToast(`No staff members with email addresses found in ${dept.name}.`, 'error');
      return;
    }

    if (append) {
      setSelectedUserIds(prev => Array.from(new Set([...prev, ...matchedUsers])));
      showToast(`Added ${matchedUsers.length} staff in ${dept.name} (${dept.icon}) to selection.`, 'success');
    } else {
      setSelectedUserIds(matchedUsers);
      showToast(`Selected all ${matchedUsers.length} staff in ${dept.name} (${dept.icon}) with email addresses.`, 'success');
    }
  };

  const handleSelectPendingInitialPass = () => {
    const pending = filteredUsers.filter(u => u.email && u.must_change_password === 1).map(u => u.id);
    setSelectedUserIds(pending);
    showToast(`Selected ${pending.length} staff with initial/pending passwords.`, 'success');
  };

  const handleOpenBulkModal = () => {
    if (selectedUserIds.length === 0) {
      showToast('Please select staff members from the table or use quick presets below.', 'error');
      return;
    }
    setBulkResults(null);
    setIsBulkModalOpen(true);
  };

  const handleExecuteBulkSend = async () => {
    if (selectedUserIds.length === 0) return;
    setIsBulkSending(true);
    setBulkResults(null);
    try {
      const res = await bulkSendCredentials({
        userIds: selectedUserIds,
        password: bulkPassword,
        passwordMode: bulkPasswordMode,
        mustChangePassword: bulkMustChange,
        emailSubject: bulkSubject
      });
      const data = res.data;
      setBulkResults(data);
      if (data.sent > 0) {
        showToast(`Dispatched credentials to ${data.sent} staff members!`, 'success');
      } else {
        showToast(`Bulk email finished with ${data.failed} delivery failures.`, 'error');
      }
      fetchData();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to dispatch bulk credentials.', 'error');
    } finally {
      setIsBulkSending(false);
    }
  };

  const handleOpenSingleEmail = (user) => {
    setSingleEmailUser(user);
    setSingleEmailPassword('Legacy@2026');
    setSingleMustChange(true);
    setIsSingleEmailModalOpen(true);
  };

  const handleExecuteSingleSend = async (e) => {
    e.preventDefault();
    if (!singleEmailUser) return;
    setIsSingleSending(true);
    try {
      const res = await sendSingleCredentials(singleEmailUser.id, {
        password: singleEmailPassword,
        mustChangePassword: singleMustChange,
        emailSubject: 'Your Legacy Clinics Lumina Portal Credentials'
      });
      setIsSingleEmailModalOpen(false);
      showToast(res.data.message || 'Credentials sent successfully!', res.data.emailSent ? 'success' : 'error');
      fetchData();
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to send credentials email.', 'error');
    } finally {
      setIsSingleSending(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div style={{ position: 'relative' }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px 20px',
          borderRadius: '12px',
          backgroundColor: toast.type === 'success' ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${toast.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
          minWidth: '320px',
          maxWidth: '440px',
          animation: 'slideInRight 0.3s ease',
        }}>
          {toast.type === 'success'
            ? <CheckCircle2 size={22} color='#16a34a' />
            : <AlertCircle size={22} color='#dc2626' />}
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: toast.type === 'success' ? '#15803d' : '#dc2626', flex: 1 }}>
            {toast.message}
          </span>
          <button onClick={() => setToast(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '4px' }}>
            <X size={16} />
          </button>
        </div>
      )}
      <style>{`@keyframes slideInRight { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }`}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '0.25rem' }}>User Management</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Manage clinic staff and their access roles securely.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={handleOpenBulkModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0.75rem 1.25rem',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.25)',
              transition: 'all 0.2s'
            }}
          >
            <Mail size={18} />
            Bulk Email Passwords {selectedUserIds.length > 0 ? `(${selectedUserIds.length})` : ''}
          </button>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '0.75rem 1.5rem',
              backgroundColor: '#003b44',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 6px -1px rgba(0, 59, 68, 0.2)'
            }}
          >
            <UserPlus size={20} />
            Create New User
          </button>
        </div>
      </div>

      {/* Search Bar & Quick Presets */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{
          position: 'relative',
          maxWidth: '420px',
          marginBottom: '1rem'
        }}>
          <Search size={18} style={{
            position: 'absolute',
            left: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-secondary)',
            pointerEvents: 'none'
          }} />
          <input
            type="text"
            placeholder="Search by name, username, email or role…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '11px 14px 11px 42px',
              border: '1.5px solid var(--border-color)',
              borderRadius: '10px',
              fontSize: '0.95rem',
              color: 'var(--text-primary)',
              backgroundColor: '#ffffff',
              outline: 'none',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => e.target.style.borderColor = '#003b44'}
            onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center' }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Quick Selection Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick Select:</span>
            
            {/* Department Dropdown Selector */}
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <Building2 size={14} style={{ position: 'absolute', left: '10px', color: '#0284c7', pointerEvents: 'none' }} />
              <select
                value={selectedDeptId}
                onChange={(e) => handleSelectDepartment(e.target.value)}
                style={{
                  padding: '5px 28px 5px 30px',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  backgroundColor: '#e0f2fe',
                  color: '#0369a1',
                  border: '1.5px solid #bae6fd',
                  cursor: 'pointer',
                  outline: 'none',
                  appearance: 'none',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                <option value="">🏢 Select Department ({DEPARTMENT_CONFIG.length} Depts)...</option>
                {DEPARTMENT_CONFIG.map(dept => {
                  const withEmailCount = filteredUsers.filter(u => u.email && dept.match(u)).length;
                  return (
                    <option key={dept.id} value={dept.id}>
                      {dept.icon} {dept.name} ({withEmailCount} with email)
                    </option>
                  );
                })}
              </select>
              <ChevronDown size={14} style={{ position: 'absolute', right: '10px', color: '#0284c7', pointerEvents: 'none' }} />
            </div>

            <button
              type="button"
              onClick={handleSelectPendingInitialPass}
              style={{
                padding: '5px 12px',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 600,
                backgroundColor: '#fef3c7',
                color: '#b45309',
                border: '1px solid #fde68a',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              🔑 Initial Passwords Pending
            </button>
            <button
              type="button"
              onClick={handleSelectAllWithEmail}
              style={{
                padding: '5px 12px',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 600,
                backgroundColor: '#f1f5f9',
                color: '#475569',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              ✉️ All With Email ({filteredUsers.filter(u => u.email).length})
            </button>
            {selectedUserIds.length > 0 && (
              <button
                type="button"
                onClick={() => { setSelectedUserIds([]); setSelectedDeptId(''); }}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  backgroundColor: '#ffffff',
                  color: '#ef4444',
                  border: '1px solid #fca5a5',
                  cursor: 'pointer'
                }}
              >
                Clear Selection ({selectedUserIds.length})
              </button>
            )}
          </div>

          {selectedUserIds.length > 0 && (
            <button
              onClick={handleOpenBulkModal}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                backgroundColor: '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)'
              }}
            >
              <Send size={15} />
              Dispatch Initial Passwords to {selectedUserIds.length} Staff
            </button>
          )}
        </div>

        {searchQuery && (
          <p style={{ marginTop: '10px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            {filteredUsers.length} result{filteredUsers.length !== 1 ? 's' : ''} for &ldquo;<strong>{searchQuery}</strong>&rdquo;
          </p>
        )}
      </div>

      <div className="glass card-shadow" style={{ overflow: 'hidden', backgroundColor: '#ffffff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--bg-color)', backgroundColor: '#f8fafc' }}>
              <th style={{ padding: '1.25rem 1rem 1.25rem 1.5rem', width: '48px', textAlign: 'center' }}>
                <input 
                  type="checkbox"
                  checked={isAllPageSelected}
                  onChange={handleToggleSelectAllPage}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#2563eb' }}
                  title="Select all on current page"
                />
              </th>
              <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Name</th>
              <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Username</th>
              <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Address</th>
              <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Access Role</th>
              <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Account Status</th>
              <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedUsers.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s', backgroundColor: selectedUserIds.includes(u.id) ? '#eff6ff' : 'transparent' }} onMouseEnter={(e) => { if (!selectedUserIds.includes(u.id)) e.currentTarget.style.backgroundColor = '#f8fafc'; }} onMouseLeave={(e) => { if (!selectedUserIds.includes(u.id)) e.currentTarget.style.backgroundColor = 'transparent'; }}>
                <td style={{ padding: '1.25rem 1rem 1.25rem 1.5rem', textAlign: 'center' }}>
                  <input 
                    type="checkbox"
                    checked={selectedUserIds.includes(u.id)}
                    onChange={() => handleToggleSelectUser(u.id)}
                    disabled={!u.email}
                    style={{ width: '16px', height: '16px', cursor: u.email ? 'pointer' : 'not-allowed', accentColor: '#2563eb' }}
                    title={u.email ? 'Select staff member' : 'User has no email address'}
                  />
                </td>
                <td style={{ padding: '1.25rem 1.5rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--primary-dark)', fontSize: '1rem' }}>{u.full_name}</div>
                </td>
                <td style={{ padding: '1.25rem 1.5rem', color: 'var(--primary)', fontWeight: 700, fontSize: '0.95rem' }}>{u.username}</td>
                <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                  {u.email || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No email</span>}
                </td>
                <td style={{ padding: '1.25rem 1.5rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary)', backgroundColor: 'rgba(0,123,138,0.1)', padding: '6px 12px', borderRadius: '20px' }}>
                    <Shield size={14} />
                    {u.role_name}
                  </span>
                </td>
                <td style={{ padding: '1.25rem 1.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                    <span style={{ 
                      padding: '4px 12px', 
                      borderRadius: '20px', 
                      fontSize: '0.75rem', 
                      backgroundColor: u.is_active ? 'rgba(40, 167, 69, 0.1)' : 'rgba(220, 53, 69, 0.1)',
                      color: u.is_active ? 'var(--success)' : 'var(--danger)',
                      fontWeight: 700,
                      border: u.is_active ? '1px solid rgba(40, 167, 69, 0.2)' : '1px solid rgba(220, 53, 69, 0.2)'
                    }}>
                      {u.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                    {u.must_change_password === 1 && (
                      <span style={{ 
                        fontSize: '0.7rem', 
                        fontWeight: 700, 
                        color: '#d97706', 
                        backgroundColor: '#fef3c7', 
                        padding: '2px 8px', 
                        borderRadius: '12px',
                        border: '1px solid #fde68a',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }} title="User has an initial temporary password pending change on first sign-in">
                        <Key size={10} /> Initial Pass
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button 
                      onClick={() => handleOpenSingleEmail(u)} 
                      title={u.email ? "Send Login Credentials via Email" : "User has no email configured"}
                      disabled={!u.email}
                      style={{ 
                        background: 'none', 
                        border: 'none', 
                        color: u.email ? '#2563eb' : '#cbd5e1', 
                        cursor: u.email ? 'pointer' : 'not-allowed', 
                        padding: '8px', 
                        borderRadius: '8px', 
                        transition: 'background 0.2s' 
                      }} 
                      onMouseEnter={(e) => { if (u.email) e.currentTarget.style.backgroundColor = 'rgba(37,99,235,0.1)'; }} 
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <Mail size={18} />
                    </button>
                    {canEditAll && (
                      <button 
                        onClick={() => handleOpenOverrides(u)} 
                        title="Permission Overrides"
                        style={{ background: 'none', border: 'none', color: '#0284c7', cursor: 'pointer', padding: '8px', borderRadius: '8px', transition: 'background 0.2s' }} 
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(2,132,199,0.1)'} 
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <Shield size={18} />
                      </button>
                    )}
                    <button 
                      onClick={() => { setResettingUser(u); setIsResetModalOpen(true); }} 
                      title="Reset Password"
                      style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', padding: '8px', borderRadius: '8px', transition: 'background 0.2s' }} 
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(245,158,11,0.1)'} 
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <Key size={18} />
                    </button>
                    <button 
                      onClick={() => handleEdit(u)} 
                      title="Edit User"
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '8px', borderRadius: '8px', transition: 'background 0.2s' }} 
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,123,138,0.1)'} 
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <Edit size={18} />
                    </button>
                    <button 
                      onClick={() => handleDeleteClick(u.id, u.full_name)} 
                      title="Delete User"
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '8px', borderRadius: '8px', transition: 'background 0.2s' }} 
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.1)'} 
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <Search size={32} style={{ opacity: 0.3, marginBottom: '8px', display: 'block', margin: '0 auto 8px' }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>No users match &ldquo;{searchQuery}&rdquo;</p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>Try a different name, username, email or role.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1.25rem 1.5rem',
            borderTop: '1.5px solid var(--border-color)',
            backgroundColor: '#f8fafc',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} entries
            </span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--border-color)',
                  backgroundColor: currentPage === 1 ? '#e2e8f0' : '#ffffff',
                  color: currentPage === 1 ? '#94a3b8' : 'var(--primary-dark)',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontSize: '0.85rem'
                }}
              >
                Previous
              </button>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-dark)' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--border-color)',
                  backgroundColor: currentPage === totalPages ? '#e2e8f0' : '#ffffff',
                  color: currentPage === totalPages ? '#94a3b8' : 'var(--primary-dark)',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontSize: '0.85rem'
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Provision New Staff Account">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary-dark)' }}>Staff Full Name</label>
            <input
              type="text"
              required
              value={newUser.fullName}
              onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
              style={{ padding: '12px', backgroundColor: '#f8fafc', color: 'var(--text-primary)', border: '1.5px solid var(--border-color)', borderRadius: '10px', outline: 'none' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary-dark)' }}>System Username</label>
            <input
              type="text"
              required
              value={newUser.username}
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
              style={{ padding: '12px', backgroundColor: '#f8fafc', color: 'var(--text-primary)', border: '1.5px solid var(--border-color)', borderRadius: '10px', outline: 'none' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary-dark)' }}>Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="email"
                required
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                style={{ width: '100%', padding: '12px 12px 12px 40px', backgroundColor: '#f8fafc', color: 'var(--text-primary)', border: '1.5px solid var(--border-color)', borderRadius: '10px', outline: 'none' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary-dark)' }}>Initial Password</label>
            <div style={{ position: 'relative' }}>
              <Key size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="password"
                required
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                style={{ width: '100%', padding: '12px 12px 12px 40px', backgroundColor: '#f8fafc', color: 'var(--text-primary)', border: '1.5px solid var(--border-color)', borderRadius: '10px', outline: 'none' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary-dark)' }}>System Access Role</label>
            <select
              required
              value={newUser.roleId}
              onChange={(e) => setNewUser({ ...newUser, roleId: parseInt(e.target.value) })}
              style={{ padding: '12px', backgroundColor: '#f8fafc', color: 'var(--text-primary)', border: '1.5px solid var(--border-color)', borderRadius: '10px', outline: 'none', cursor: 'pointer' }}
            >
              <option value="">Select a role</option>
              {filteredRoles.map(r => (
                <option key={r.id} value={r.id}>{r.display_name}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button type="submit" style={{ flex: 1, padding: '12px', backgroundColor: '#003b44', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>Create Account</button>
            <button type="button" onClick={() => setIsCreateModalOpen(false)} style={{ flex: 1, padding: '12px', backgroundColor: '#f1f5f9', color: 'var(--primary-dark)', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Edit User Information">
        {editingUser && (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary-dark)' }}>Full Name</label>
              <input
                type="text"
                value={editingUser.full_name}
                onChange={(e) => setEditingUser({ ...editingUser, full_name: e.target.value })}
                style={{ padding: '12px', backgroundColor: '#f8fafc', color: 'var(--text-primary)', border: '1.5px solid var(--border-color)', borderRadius: '10px', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary-dark)' }}>Username</label>
              <input
                type="text"
                value={editingUser.username}
                onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                style={{ padding: '12px', backgroundColor: '#f8fafc', color: 'var(--text-primary)', border: '1.5px solid var(--border-color)', borderRadius: '10px', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary-dark)' }}>Email Address</label>
              <input
                type="email"
                value={editingUser.email}
                onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                style={{ padding: '12px', backgroundColor: '#f8fafc', color: 'var(--text-primary)', border: '1.5px solid var(--border-color)', borderRadius: '10px', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary-dark)' }}>Access Role</label>
              <select
                value={editingUser.role_id || roles.find(r => r.display_name === editingUser.role_name)?.id}
                onChange={(e) => setEditingUser({ ...editingUser, role_id: parseInt(e.target.value) })}
                style={{ padding: '12px', backgroundColor: '#f8fafc', color: 'var(--text-primary)', border: '1.5px solid var(--border-color)', borderRadius: '10px', outline: 'none', cursor: 'pointer' }}
              >
                {filteredRoles.map(r => (
                  <option key={r.id} value={r.id}>{r.display_name}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0' }}>
              <input
                type="checkbox"
                checked={editingUser.is_active}
                onChange={(e) => setEditingUser({ ...editingUser, is_active: e.target.checked })}
                id="is_active"
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }}
              />
              <label htmlFor="is_active" style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--primary-dark)', cursor: 'pointer' }}>Account is Active</label>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button type="submit" style={{ flex: 1, padding: '12px', backgroundColor: '#003b44', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>Update Record</button>
              <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '12px', backgroundColor: '#f1f5f9', color: 'var(--primary-dark)', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete User Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="CRITICAL: Protocol Authorization Required">
        {userToDelete && (
          <form onSubmit={handleConfirmDelete} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ padding: '1rem', backgroundColor: '#fff1f2', border: '1px solid #fecaca', borderRadius: '8px', display: 'flex', gap: '12px' }}>
              <AlertCircle size={24} color="#dc2626" />
              <div>
                <p style={{ margin: 0, fontWeight: 700, color: '#991b1b', fontSize: '0.95rem' }}>Permanent Deletion Protocol</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#b91c1c' }}>
                  You are about to permanently delete the staff account for <strong>{userToDelete.name}</strong>. This action is irreversible and will be logged in the audit trail.
                </p>
              </div>
            </div>

            {deleteError && (
              <div style={{ padding: '0.75rem 1rem', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', color: '#991b1b', fontSize: '0.85rem', fontWeight: 600 }}>
                <AlertCircle size={18} color="#dc2626" style={{ flexShrink: 0 }} />
                <span>{deleteError}</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary-dark)' }}>Confirm with Administrative Password</label>
              <div style={{ position: 'relative' }}>
                <Key size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="password"
                  required
                  autoFocus
                  value={adminPasswordForDelete}
                  onChange={(e) => {
                    setAdminPasswordForDelete(e.target.value);
                    if (deleteError) setDeleteError('');
                  }}
                  placeholder="Enter your password to authorize"
                  style={{ width: '100%', padding: '12px 12px 12px 40px', backgroundColor: '#f8fafc', color: 'var(--text-primary)', border: deleteError ? '1.5px solid #ef4444' : '1.5px solid var(--border-color)', borderRadius: '10px', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <button 
                type="submit" 
                disabled={isDeleting || !adminPasswordForDelete}
                style={{ 
                  flex: 2, 
                  padding: '12px', 
                  backgroundColor: '#dc2626', 
                  color: '#ffffff', 
                  border: 'none', 
                  borderRadius: '10px', 
                  fontWeight: 700, 
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  opacity: isDeleting ? 0.7 : 1
                }}
              >
                {isDeleting ? 'Processing...' : 'Authorize & Delete Permanently'}
              </button>
              <button 
                type="button" 
                onClick={() => setIsDeleteModalOpen(false)} 
                style={{ flex: 1, padding: '12px', backgroundColor: '#f1f5f9', color: 'var(--primary-dark)', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Reset Password Modal */}
      <Modal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} title="Force Password Synchronization">
        {resettingUser && (
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Administrative override for <strong>{resettingUser.full_name}</strong>. Entering a new password will immediately synchronize and unlock the account.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary-dark)' }}>New Secure Password</label>
              <div style={{ position: 'relative' }}>
                <Key size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  style={{ width: '100%', padding: '12px 12px 12px 40px', backgroundColor: '#f8fafc', color: 'var(--text-primary)', border: '1.5px solid var(--border-color)', borderRadius: '10px', outline: 'none' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="submit" style={{ flex: 1, padding: '12px', backgroundColor: '#f59e0b', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>Update Password</button>
              <button type="button" onClick={() => setIsResetModalOpen(false)} style={{ flex: 1, padding: '12px', backgroundColor: '#f1f5f9', color: 'var(--primary-dark)', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            </div>
          </form>
        )}
      </Modal>

      {/* Manage User Overrides Modal */}
      <Modal 
        isOpen={isOverrideModalOpen} 
        onClose={() => setIsOverrideModalOpen(false)} 
        title={`Access Overrides: ${overrideUser?.full_name || ''}`}
        maxWidth="800px"
      >
        {loadingOverrides ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--primary)' }} />
          </div>
        ) : (
          <form onSubmit={handleSaveOverrides} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ padding: '1rem', backgroundColor: 'rgba(0,123,138,0.05)', borderRadius: '10px', fontSize: '0.85rem', color: 'var(--primary-dark)' }}>
              Configure account-specific functional exceptions for this user. Overrides supersede their default role permissions (<strong>{overrideUser?.role_name}</strong>) immediately.
            </div>

            <div style={{ maxHeight: '420px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-color)', textAlign: 'left', position: 'sticky', top: 0, zIndex: 10 }}>
                    <th style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Module / Operation</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Default Rule</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Override Selection</th>
                    <th style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--text-secondary)' }}>Justification Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(effectivePerms).flatMap(([modName, actions]) => 
                    Object.entries(actions).map(([actionName, info]) => {
                      const key = `${modName}:${actionName}`;
                      const selection = overrideSelections[key] || 'default';
                      const isOverridden = selection !== 'default';

                      return (
                        <tr key={key} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 12px' }}>
                            <div style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>{modName.replace(/_/g, ' ').toUpperCase()}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>action: {actionName}</div>
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            {info.source === 'role' ? (
                              <span style={{ 
                                padding: '4px 8px', 
                                borderRadius: '12px', 
                                fontSize: '0.75rem', 
                                fontWeight: 600,
                                backgroundColor: info.granted ? 'rgba(40,167,69,0.1)' : '#f1f5f9',
                                color: info.granted ? 'var(--success)' : 'var(--text-secondary)'
                              }}>
                                {info.granted ? 'Allowed (Role)' : 'Denied (Role)'}
                              </span>
                            ) : (
                              <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#fff7ed', color: '#ea580c' }}>
                                Exception Active
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <select
                              value={selection}
                              onChange={(e) => {
                                setOverrideSelections({ ...overrideSelections, [key]: e.target.value });
                              }}
                              style={{ 
                                padding: '6px 8px', 
                                borderRadius: '6px', 
                                border: '1.5px solid var(--border-color)', 
                                outline: 'none',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                backgroundColor: selection === 'allow' ? '#f0fdf4' : selection === 'deny' ? '#fef2f2' : '#ffffff',
                                color: selection === 'allow' ? '#16a34a' : selection === 'deny' ? '#dc2626' : 'var(--text-primary)'
                              }}
                            >
                              <option value="default">Use Role Default</option>
                              <option value="allow">Override to ALLOW</option>
                              <option value="deny">Override to DENY</option>
                            </select>
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <input
                              type="text"
                              disabled={!isOverridden}
                              value={overrideReasons[key] || ''}
                              onChange={(e) => {
                                setOverrideReasons({ ...overrideReasons, [key]: e.target.value });
                              }}
                              placeholder={isOverridden ? "Reason for exception (required)" : "N/A — Inheriting role defaults"}
                              required={isOverridden}
                              style={{ 
                                width: '100%', 
                                padding: '6px 10px', 
                                border: '1.5px solid var(--border-color)', 
                                borderRadius: '6px',
                                outline: 'none',
                                fontSize: '0.8rem',
                                backgroundColor: isOverridden ? '#ffffff' : '#f8fafc',
                                color: 'var(--text-primary)'
                              }}
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <button 
                type="submit" 
                disabled={loadingOverrides}
                style={{ 
                  flex: 2, 
                  padding: '12px', 
                  backgroundColor: 'var(--primary)', 
                  color: '#ffffff', 
                  border: 'none', 
                  borderRadius: '10px', 
                  fontWeight: 700, 
                  cursor: 'pointer' 
                }}
              >
                {loadingOverrides ? 'Syncing...' : 'Save & Sync Overrides'}
              </button>
              <button 
                type="button" 
                onClick={() => setIsOverrideModalOpen(false)}
                style={{ 
                  flex: 1, 
                  padding: '12px', 
                  backgroundColor: '#f1f5f9', 
                  color: 'var(--primary-dark)', 
                  border: 'none', 
                  borderRadius: '10px', 
                  fontWeight: 600, 
                  cursor: 'pointer' 
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Bulk Email Credentials Modal */}
      <Modal 
        isOpen={isBulkModalOpen} 
        onClose={() => { if (!isBulkSending) setIsBulkModalOpen(false); }} 
        title="Bulk Dispatch Initial Passwords via Email"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {bulkResults ? (
            /* Results View */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{
                padding: '16px',
                borderRadius: '10px',
                backgroundColor: bulkResults.failed === 0 ? '#f0fdf4' : '#fffbeb',
                border: `1.5px solid ${bulkResults.failed === 0 ? '#bbf7d0' : '#fde68a'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                {bulkResults.failed === 0 ? (
                  <CheckCircle2 size={24} color="#16a34a" />
                ) : (
                  <AlertCircle size={24} color="#d97706" />
                )}
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: bulkResults.failed === 0 ? '#15803d' : '#b45309' }}>
                    {bulkResults.sent} of {bulkResults.total} credentials emails dispatched successfully
                  </div>
                  {bulkResults.failed > 0 && (
                    <div style={{ fontSize: '0.85rem', color: '#92400e', marginTop: '2px' }}>
                      {bulkResults.failed} delivery {bulkResults.failed === 1 ? 'attempt' : 'attempts'} encountered an issue.
                    </div>
                  )}
                </div>
              </div>

              {/* Results table */}
              <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px', fontWeight: 600 }}>Staff Name</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600 }}>Email</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkResults.results?.map((r, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--primary-dark)' }}>{r.fullName || r.username}</td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{r.email}</td>
                        <td style={{ padding: '8px 12px' }}>
                          {r.success ? (
                            <span style={{ color: '#16a34a', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle2 size={14} /> Sent
                            </span>
                          ) : (
                            <span style={{ color: '#dc2626', fontWeight: 600 }}>
                              Failed: {r.message || 'Error'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsBulkModalOpen(false);
                    setBulkResults(null);
                    setSelectedUserIds([]);
                  }}
                  style={{
                    padding: '10px 24px',
                    backgroundColor: '#003b44',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Done &amp; Close
                </button>
              </div>
            </div>
          ) : (
            /* Dispatch Form */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Recipients summary */}
              <div style={{
                padding: '14px 16px',
                borderRadius: '10px',
                backgroundColor: '#eff6ff',
                border: '1.5px solid #bfdbfe'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e3a8a' }}>
                      Target Recipients ({selectedUserIds.length} staff selected)
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      • mail.legacyclinics.rw
                    </span>
                  </div>

                  {/* Department switcher dropdown inside modal */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <select
                      value={selectedDeptId}
                      onChange={(e) => handleSelectDepartment(e.target.value)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: '#ffffff',
                        color: '#0369a1',
                        border: '1px solid #93c5fd',
                        cursor: 'pointer'
                      }}
                      title="Quick select all staff from a department"
                    >
                      <option value="">🏢 Switch Department...</option>
                      {DEPARTMENT_CONFIG.map(dept => {
                        const count = users.filter(u => u.email && dept.match(u)).length;
                        return (
                          <option key={dept.id} value={dept.id}>
                            {dept.icon} {dept.name} ({count})
                          </option>
                        );
                      })}
                    </select>
                    {selectedUserIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => { setSelectedUserIds([]); setSelectedDeptId(''); }}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: '#fee2e2',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          cursor: 'pointer'
                        }}
                        title="Clear all selected recipients"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '110px', overflowY: 'auto' }}>
                  {users.filter(u => selectedUserIds.includes(u.id)).map(u => (
                    <span 
                      key={u.id}
                      style={{
                        padding: '3px 8px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '14px',
                        fontSize: '0.75rem',
                        color: 'var(--primary-dark)',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                    >
                      <span>{u.full_name}</span>
                      <span style={{ color: '#64748b', fontSize: '0.7rem' }}>({u.email || 'no email'})</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUserIds(prev => prev.filter(id => id !== u.id));
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '0 2px',
                          borderRadius: '50%',
                          fontSize: '0.85rem',
                          lineHeight: 1
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
                        title={`Remove ${u.full_name} from dispatch`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Password mode */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--primary-dark)' }}>
                  Password Assignment Mode
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '12px',
                    borderRadius: '10px',
                    border: `2px solid ${bulkPasswordMode === 'fixed' ? '#2563eb' : 'var(--border-color)'}`,
                    backgroundColor: bulkPasswordMode === 'fixed' ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="radio"
                      name="bulkPasswordMode"
                      checked={bulkPasswordMode === 'fixed'}
                      onChange={() => setBulkPasswordMode('fixed')}
                      style={{ marginTop: '2px', accentColor: '#2563eb' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-dark)' }}>
                        Standard Initial Password
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Uniform initial password for all selected staff
                      </div>
                    </div>
                  </label>

                  <label style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '12px',
                    borderRadius: '10px',
                    border: `2px solid ${bulkPasswordMode === 'random' ? '#2563eb' : 'var(--border-color)'}`,
                    backgroundColor: bulkPasswordMode === 'random' ? '#eff6ff' : '#ffffff',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="radio"
                      name="bulkPasswordMode"
                      checked={bulkPasswordMode === 'random'}
                      onChange={() => setBulkPasswordMode('random')}
                      style={{ marginTop: '2px', accentColor: '#2563eb' }}
                    />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-dark)' }}>
                        Unique Generated Passwords
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Auto-generate unique secure password for each user
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Password input when fixed */}
              {bulkPasswordMode === 'fixed' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-dark)' }}>
                    Initial Temporary Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Key size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                    <input
                      type="text"
                      value={bulkPassword}
                      onChange={(e) => setBulkPassword(e.target.value)}
                      required
                      placeholder="e.g. Legacy@2026"
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 40px',
                        backgroundColor: '#ffffff',
                        border: '1.5px solid var(--border-color)',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        color: 'var(--primary-dark)'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Email subject */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-dark)' }}>
                  Email Subject Line
                </label>
                <input
                  type="text"
                  value={bulkSubject}
                  onChange={(e) => setBulkSubject(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: '#ffffff',
                    border: '1.5px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              {/* Security Option */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={bulkMustChange}
                  onChange={(e) => setBulkMustChange(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
                />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-dark)' }}>
                  Enforce password change upon first login (Recommended)
                </span>
              </label>

              {/* Email Card Preview */}
              <div style={{
                borderRadius: '10px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '8px 14px',
                  backgroundColor: '#1e3a8a',
                  color: '#ffffff',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>Preview of Automated Dispatch Email</span>
                  <span style={{ opacity: 0.8, fontSize: '0.72rem' }}>Outlook / Webmail HTML</span>
                </div>
                <div style={{ padding: '14px', fontSize: '0.82rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div><strong>Dear Colleague,</strong></div>
                  <div>Your account has been configured. Here are your credentials to log in to the Lumina Portal:</div>
                  <div style={{ backgroundColor: '#ffffff', borderLeft: '4px solid #2563eb', padding: '10px 14px', borderRadius: '4px', margin: '4px 0' }}>
                    <div><strong>Username / Email:</strong> [Staff Username or Email]</div>
                    <div><strong>Password:</strong> {bulkPasswordMode === 'fixed' ? bulkPassword : 'LC@••••••••'}</div>
                  </div>
                  <div style={{ textAlign: 'center', margin: '6px 0' }}>
                    <span style={{ display: 'inline-block', backgroundColor: '#2563eb', color: '#ffffff', padding: '6px 18px', borderRadius: '6px', fontWeight: 700, fontSize: '0.8rem' }}>
                      🚀 Log In to Lumina Portal
                    </span>
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', textAlign: 'center' }}>
                    Direct Portal URL: https://report.ops-legacyclinics.rw/login
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  disabled={isBulkSending}
                  onClick={() => setIsBulkModalOpen(false)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#f1f5f9',
                    color: 'var(--primary-dark)',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: isBulkSending ? 'not-allowed' : 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isBulkSending || selectedUserIds.length === 0}
                  onClick={handleExecuteBulkSend}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 24px',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: isBulkSending ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 10px rgba(37,99,235,0.3)',
                    opacity: isBulkSending ? 0.7 : 1
                  }}
                >
                  {isBulkSending ? (
                    <>
                      <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      Dispatching Emails ({selectedUserIds.length})...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Dispatch to {selectedUserIds.length} Staff
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Single User Email Modal */}
      <Modal 
        isOpen={isSingleEmailModalOpen} 
        onClose={() => { if (!isSingleSending) setIsSingleEmailModalOpen(false); }} 
        title="Send Login Credentials via Email"
      >
        {singleEmailUser && (
          <form onSubmit={handleExecuteSingleSend} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{
              padding: '14px',
              borderRadius: '10px',
              backgroundColor: '#eff6ff',
              border: '1.5px solid #bfdbfe',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary-dark)' }}>
                {singleEmailUser.full_name}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <strong>Username:</strong> {singleEmailUser.username} | <strong>Email:</strong> {singleEmailUser.email}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#1d4ed8' }}>
                <strong>Role:</strong> {singleEmailUser.role_name}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary-dark)' }}>
                Initial Password to Set &amp; Send
              </label>
              <div style={{ position: 'relative' }}>
                <Key size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  required
                  value={singleEmailPassword}
                  onChange={(e) => setSingleEmailPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 40px',
                    backgroundColor: '#ffffff',
                    border: '1.5px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: 600
                  }}
                />
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={singleMustChange}
                onChange={(e) => setSingleMustChange(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
              />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-dark)' }}>
                Require password change upon first login
              </span>
            </label>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                disabled={isSingleSending}
                onClick={() => setIsSingleEmailModalOpen(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#f1f5f9',
                  color: 'var(--primary-dark)',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSingleSending}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 24px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: isSingleSending ? 'not-allowed' : 'pointer',
                  opacity: isSingleSending ? 0.7 : 1
                }}
              >
                {isSingleSending ? (
                  <>
                    <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    Sending Email...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Send Credentials Email
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>

    </div>
  );
};

export default Users;
