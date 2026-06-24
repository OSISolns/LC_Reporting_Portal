import { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser, getRoles, deleteUser, resetPassword } from '../api/users';
import { getUserEffectivePermissions, setUserOverride } from '../api/permissions';
import LoadingSpinner from '../components/LoadingSpinner';
import { UserPlus, Edit, X, Shield, Mail, Trash2, Key, CheckCircle2, AlertCircle, Search, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

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
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Define low-level roles that can be managed by IT Officers or other limited admins
  const LOW_LEVEL_ROLES_DISPLAY = ['Customer Care', 'Principal Cashier', 'Cashier', 'Operations Staff', 'Staff Member', 'Clinical Nurse', 'Chief Nurse Manager', 'Medical Doctor', 'Consultant', 'Medical Director'];
  const LOW_LEVEL_ROLES_KEY = ['customer_care', 'principal_cashier', 'cashier', 'operations_staff', 'staff', 'nurse', 'chef-nurse', 'doctor', 'consultant', 'medical_director'];

  const filteredUsers = (canEditAll
    ? users
    : users.filter(u => LOW_LEVEL_ROLES_DISPLAY.includes(u.role_name))
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
    : roles.filter(r => LOW_LEVEL_ROLES_KEY.includes(r.name));

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
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async (e) => {
    e.preventDefault();
    if (!adminPasswordForDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteUser(userToDelete.id, adminPasswordForDelete);
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      setAdminPasswordForDelete('');
      fetchData();
      showToast(`Staff account "${userToDelete.name}" has been permanently deleted.`, 'success');
    } catch (err) {
      console.error('Delete error:', err);
      showToast(err.response?.data?.message || 'Failed to delete user.', 'error');
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
    try {
      await updateUser(editingUser.id, {
        fullName: editingUser.full_name,
        username: editingUser.username,
        email: editingUser.email,
        roleId: editingUser.role_id || roles.find(r => r.display_name === editingUser.role_name)?.id,
        isActive: editingUser.is_active
      });
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      alert('Failed to update user');
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
      setNewUser({ fullName: '', username: '', email: '', password: '', roleId: filteredRoles[0]?.id || roles[0]?.id });
      fetchData();
    } catch (err) {
      console.error('Create error:', err);
      alert(err.response?.data?.message || 'Failed to create user');
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '0.25rem' }}>User Management</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Manage clinic staff and their access roles securely.</p>
        </div>
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

      {/* Search Bar */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{
          position: 'relative',
          maxWidth: '420px',
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
        {searchQuery && (
          <p style={{ marginTop: '6px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            {filteredUsers.length} result{filteredUsers.length !== 1 ? 's' : ''} for &ldquo;<strong>{searchQuery}</strong>&rdquo;
          </p>
        )}
      </div>

      <div className="glass card-shadow" style={{ overflow: 'hidden', backgroundColor: '#ffffff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--bg-color)', backgroundColor: '#f8fafc' }}>
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
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                <td style={{ padding: '1.25rem 1.5rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--primary-dark)', fontSize: '1rem' }}>{u.full_name}</div>
                </td>
                <td style={{ padding: '1.25rem 1.5rem', color: 'var(--primary)', fontWeight: 700, fontSize: '0.95rem' }}>{u.username}</td>
                <td style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{u.email}</td>
                <td style={{ padding: '1.25rem 1.5rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary)', backgroundColor: 'rgba(0,123,138,0.1)', padding: '6px 12px', borderRadius: '20px' }}>
                    <Shield size={14} />
                    {u.role_name}
                  </span>
                </td>
                <td style={{ padding: '1.25rem 1.5rem' }}>
                  <span style={{ 
                    padding: '6px 14px', 
                    borderRadius: '20px', 
                    fontSize: '0.75rem', 
                    backgroundColor: u.is_active ? 'rgba(40, 167, 69, 0.1)' : 'rgba(220, 53, 69, 0.1)',
                    color: u.is_active ? 'var(--success)' : 'var(--danger)',
                    fontWeight: 700,
                    border: u.is_active ? '1px solid rgba(40, 167, 69, 0.2)' : '1px solid rgba(220, 53, 69, 0.2)'
                  }}>
                    {u.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </td>
                <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
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
                <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
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
              placeholder="Enter full name"
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
              placeholder="e.g. lc_patience"
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
                placeholder="email@legacyclinics.rw"
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
                placeholder="••••••••"
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary-dark)' }}>Confirm with Administrative Password</label>
              <div style={{ position: 'relative' }}>
                <Key size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                <input
                  type="password"
                  required
                  autoFocus
                  value={adminPasswordForDelete}
                  onChange={(e) => setAdminPasswordForDelete(e.target.value)}
                  placeholder="Enter your password to authorize"
                  style={{ width: '100%', padding: '12px 12px 12px 40px', backgroundColor: '#f8fafc', color: 'var(--text-primary)', border: '1.5px solid var(--border-color)', borderRadius: '10px', outline: 'none' }}
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

    </div>
  );
};

export default Users;
