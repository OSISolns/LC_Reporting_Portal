import { useState, useEffect } from 'react';
import { getUsers, updateUser, getRoles } from '../api/users';
import LoadingSpinner from '../components/LoadingSpinner';
import { UserPlus, Edit, Save, X, Shield, Mail } from 'lucide-react';
import Modal from '../components/Modal';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [uRes, rRes] = await Promise.all([
        getUsers().catch(() => ({ data: { data: [] } })),
        getRoles().catch(() => ({ data: { data: [] } }))
      ]);
      setUsers(uRes?.data?.data || []);
      setRoles(rRes?.data?.data || []);
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

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await updateUser(editingUser.id, {
        fullName: editingUser.full_name,
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

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '0.25rem' }}>User Management</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Manage clinic staff and their access roles securely.</p>
        </div>
        <button className="glass card-shadow" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '0.75rem 1.5rem',
          backgroundColor: 'var(--primary)',
          color: '#ffffff',
          border: 'none',
          borderRadius: '10px',
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 4px 6px -1px rgba(0, 123, 138, 0.2)'
        }}>
          <UserPlus size={20} />
          Create New User
        </button>
      </div>

      <div className="glass card-shadow" style={{ overflow: 'hidden', backgroundColor: '#ffffff' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--bg-color)', backgroundColor: '#f8fafc' }}>
              <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Name</th>
              <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Address</th>
              <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Access Role</th>
              <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Account Status</th>
              <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                <td style={{ padding: '1.25rem 1.5rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--primary-dark)', fontSize: '1rem' }}>{u.full_name}</div>
                </td>
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
                  <button onClick={() => handleEdit(u)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '8px', borderRadius: '8px', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,123,138,0.1)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <Edit size={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
                {roles.map(r => (
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
              <button type="submit" style={{ flex: 1, padding: '12px', backgroundColor: 'var(--primary)', color: '#ffffff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>Update Record</button>
              <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '12px', backgroundColor: '#f1f5f9', color: 'var(--primary-dark)', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default Users;
