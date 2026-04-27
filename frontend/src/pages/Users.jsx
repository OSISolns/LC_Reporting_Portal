import { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser, getRoles, deleteUser, resetPassword } from '../api/users';
import LoadingSpinner from '../components/LoadingSpinner';
import { UserPlus, Edit, X, Shield, Mail, Trash2, Key, CheckCircle2, AlertCircle, Search } from 'lucide-react';
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

  useEffect(() => {
    fetchData();
  }, []);

  // Full edit access (admin-level): show all users and all roles
  // Limited access (e.g. IT Officer): show only non-privileged staff
  const canEditAll = hasPermission('user_management', 'edit');

  const filteredUsers = (canEditAll
    ? users
    : users.filter(u => ['Cashier', 'Customer Care', 'Patient Relations'].includes(u.role_name))
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

  const filteredRoles = canEditAll
    ? roles
    : roles.filter(r => ['cashier', 'customer_care'].includes(r.name));

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

  const handleDelete = async (userId, userName) => {
    if (userId === currentUser.id) {
      showToast('Security Protocol Error: You cannot delete your own account.', 'error');
      return;
    }
    if (window.confirm(`CRITICAL ACTION: Are you sure you want to permanently delete "${userName}"? This cannot be undone.`)) {
      try {
        await deleteUser(userId);
        fetchData();
        showToast(`Staff account "${userName}" has been permanently deleted.`, 'success');
      } catch (err) {
        console.error('Delete error:', err);
        showToast(err.response?.data?.message || 'Failed to delete user.', 'error');
      }
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
            {filteredUsers.map(u => (
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
                      onClick={() => handleDelete(u.id, u.full_name)} 
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

    </div>
  );
};

export default Users;
