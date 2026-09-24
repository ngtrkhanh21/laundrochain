import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/authApi';
import {
  User,
  Mail,
  Phone,
  Shield,
  Edit3,
  Save,
  X,
  CheckCircle2,
  Calendar,
  BadgeCheck,
} from 'lucide-react';

const ROLE_LABELS = {
  ADMIN: 'Quản trị hệ thống',
  PRICING_MANAGER: 'Quản lý giá',
  SITE_MANAGER: 'Quản lý cửa hàng',
  TECHNICIAN: 'Kỹ thuật viên',
  MEMBER: 'Thành viên',
};

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 0',
        borderBottom: '1px solid var(--color-border-subtle)',
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: 'rgba(59,130,246,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={18} color="var(--color-brand-400)" />
      </div>
      <div>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>{label}</p>
        <p style={{ fontSize: '0.95rem', color: 'var(--color-text-primary)', fontWeight: 500, marginTop: 1 }}>
          {value || <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Chưa cập nhật</span>}
        </p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ fullName: user?.fullName || '', phoneNumber: user?.phoneNumber || '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
    setSuccess('');
  };

  const handleSave = async () => {
    if (!form.fullName.trim()) {
      setError('Họ tên không được để trống');
      return;
    }
    if (form.fullName.trim().length < 2) {
      setError('Họ tên phải có ít nhất 2 ký tự');
      return;
    }
    if (form.phoneNumber && !/^(0|\+84)[3-9][0-9]{8}$/.test(form.phoneNumber)) {
      setError('Số điện thoại không hợp lệ');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const result = await authApi.updateMe({
        fullName: form.fullName.trim(),
        phoneNumber: form.phoneNumber || undefined,
      });
      updateUser(result.user);
      setSuccess('Cập nhật thông tin thành công!');
      setIsEditing(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({ fullName: user?.fullName || '', phoneNumber: user?.phoneNumber || '' });
    setError('');
    setIsEditing(false);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0])
      .slice(-2)
      .join('')
      .toUpperCase();
  };

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Hồ sơ cá nhân</h1>
        <p className="page-subtitle">Xem và cập nhật thông tin tài khoản của bạn</p>
      </div>

      <div style={{ display: 'grid', gap: 24 }}>
        {/* Avatar Card */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 24,
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              fontWeight: 800,
              color: 'white',
              flexShrink: 0,
              boxShadow: '0 8px 24px rgba(59,130,246,0.35)',
            }}
          >
            {getInitials(user?.fullName)}
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 6 }}>{user?.fullName}</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {user?.roles?.map((role) => (
                <span key={role} className={`role-badge role-${role}`}>
                  {role}
                </span>
              ))}
            </div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            {!isEditing ? (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setIsEditing(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <Edit3 size={15} />
                Chỉnh sửa
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={handleCancel} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <X size={15} />
                  Hủy
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleSave}
                  disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {saving ? <div className="loading-spinner" style={{ width: 14, height: 14 }} /> : <Save size={15} />}
                  Lưu
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="alert alert-error animate-fade-in">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="alert alert-success animate-fade-in">
            <CheckCircle2 size={18} />
            <span>{success}</span>
          </div>
        )}

        {/* Info Card */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 4 }}>Thông tin cá nhân</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>
            {isEditing ? 'Chỉnh sửa thông tin bên dưới rồi nhấn Lưu' : 'Thông tin tài khoản hiện tại'}
          </p>

          {isEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="profile-fullName">Họ và tên</label>
                <input
                  id="profile-fullName"
                  name="fullName"
                  type="text"
                  className="form-input"
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder="Nguyễn Văn A"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="profile-phone">
                  Số điện thoại
                  <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}> (không bắt buộc)</span>
                </label>
                <input
                  id="profile-phone"
                  name="phoneNumber"
                  type="tel"
                  className="form-input"
                  value={form.phoneNumber}
                  onChange={handleChange}
                  placeholder="0901234567"
                />
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 8 }}>
              <InfoRow icon={User} label="Họ và tên" value={user?.fullName} />
              <InfoRow icon={Mail} label="Email" value={user?.email} />
              <InfoRow icon={Phone} label="Số điện thoại" value={user?.phoneNumber} />
              <InfoRow icon={Calendar} label="Ngày tạo tài khoản" value={formatDate(user?.createdAt)} />
              <InfoRow icon={Calendar} label="Cập nhật lần cuối" value={formatDate(user?.updatedAt)} />
            </div>
          )}
        </div>

        {/* Roles Card */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={18} color="var(--color-brand-400)" />
            Phân quyền & Vai trò
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 16 }}>
            Vai trò quyết định chức năng bạn được sử dụng
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {user?.roles?.map((role) => (
              <div
                key={role}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  background: 'var(--color-bg-secondary)',
                  borderRadius: 10,
                  border: '1px solid var(--color-border)',
                }}
              >
                <BadgeCheck size={20} color="var(--color-brand-400)" />
                <div>
                  <span className={`role-badge role-${role}`}>{role}</span>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                    {ROLE_LABELS[role] || role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
