import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
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
  AtSign,
} from 'lucide-react';

function InfoRow({ icon: Icon, label, value, notUpdatedText }) {
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
          {value || <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>{notUpdatedText}</span>}
        </p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { t, language } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    phoneNumber: user?.phoneNumber || user?.phone || '',
    email: user?.email || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Sync form when user changes
  useEffect(() => {
    if (user) {
      setForm({
        fullName: user.fullName || '',
        phoneNumber: user.phoneNumber || user.phone || '',
        email: user.email || '',
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
    setSuccess('');
  };

  const handleSave = async () => {
    if (!form.fullName.trim()) {
      setError(t('profile.fullNameRequired', 'Họ tên không được để trống'));
      return;
    }
    if (form.fullName.trim().length < 2) {
      setError(t('profile.fullNameMin', 'Họ tên phải có ít nhất 2 ký tự'));
      return;
    }
    if (form.phoneNumber && !/^[0-9]{10,11}$/.test(form.phoneNumber.trim())) {
      setError('Số điện thoại phải từ 10 đến 11 chữ số');
      return;
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError('Email không hợp lệ');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const result = await authApi.updateMe({
        fullName: form.fullName.trim(),
        phoneNumber: form.phoneNumber ? form.phoneNumber.trim() : undefined,
        email: form.email ? form.email.trim() : undefined,
        language: language === 'en' ? 'en' : 'vi',
      });
      const updated = result?.user || result;
      updateUser(updated);
      setSuccess(t('profile.updateSuccess', 'Cập nhật thông tin thành công!'));
      setIsEditing(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({
      fullName: user?.fullName || '',
      phoneNumber: user?.phoneNumber || user?.phone || '',
      email: user?.email || '',
    });
    setError('');
    setIsEditing(false);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', {
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
        <h1 className="page-title">{t('profile.title', 'Hồ sơ cá nhân')}</h1>
        <p className="page-subtitle">{t('profile.subtitle', 'Xem và cập nhật thông tin tài khoản của bạn')}</p>
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
            {getInitials(user?.fullName || user?.username)}
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 6 }}>
              {user?.fullName || user?.username}
            </h2>
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
                {t('profile.editProfile', 'Chỉnh sửa')}
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={handleCancel}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <X size={15} />
                  {t('profile.cancel', 'Hủy')}
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleSave}
                  disabled={saving}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  {saving ? (
                    <div className="loading-spinner" style={{ width: 14, height: 14 }} />
                  ) : (
                    <Save size={15} />
                  )}
                  {saving ? t('profile.saving', 'Đang lưu...') : t('profile.saveChanges', 'Lưu')}
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
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 4 }}>
            {t('profile.personalInfo', 'Thông tin cá nhân')}
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>
            {isEditing
              ? t('profile.editInfoPrompt', 'Chỉnh sửa thông tin bên dưới rồi nhấn Lưu')
              : t('profile.currentInfoPrompt', 'Thông tin tài khoản hiện tại')}
          </p>

          {isEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="profile-fullName">
                  {t('profile.fullName', 'Họ và tên')} *
                </label>
                <input
                  id="profile-fullName"
                  name="fullName"
                  type="text"
                  className="form-input"
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder={t('auth.fullNamePlaceholder', 'Nguyễn Văn A')}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="profile-email">
                  {t('profile.email', 'Email')}
                </label>
                <input
                  id="profile-email"
                  name="email"
                  type="email"
                  className="form-input"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="example@email.com"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="profile-phone">
                  {t('profile.phone', 'Số điện thoại')}
                  <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>
                    {' '}
                    {t('auth.optional', '(không bắt buộc)')}
                  </span>
                </label>
                <input
                  id="profile-phone"
                  name="phoneNumber"
                  type="tel"
                  className="form-input"
                  value={form.phoneNumber}
                  onChange={handleChange}
                  placeholder={t('auth.phonePlaceholder', '0901234567')}
                />
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 8 }}>
              <InfoRow
                icon={AtSign}
                label={t('auth.usernameLabel', 'Tên đăng nhập')}
                value={user?.username}
                notUpdatedText={t('profile.notUpdated', 'Chưa cập nhật')}
              />
              <InfoRow
                icon={User}
                label={t('profile.fullName', 'Họ và tên')}
                value={user?.fullName}
                notUpdatedText={t('profile.notUpdated', 'Chưa cập nhật')}
              />
              <InfoRow
                icon={Mail}
                label={t('profile.email', 'Email')}
                value={user?.email}
                notUpdatedText={t('profile.notUpdated', 'Chưa cập nhật')}
              />
              <InfoRow
                icon={Phone}
                label={t('profile.phone', 'Số điện thoại')}
                value={user?.phoneNumber || user?.phone}
                notUpdatedText={t('profile.notUpdated', 'Chưa cập nhật')}
              />
              <InfoRow
                icon={Calendar}
                label={t('profile.createdAt', 'Ngày tạo tài khoản')}
                value={formatDate(user?.createdAt)}
                notUpdatedText={t('profile.notUpdated', 'Chưa cập nhật')}
              />
            </div>
          )}
        </div>

        {/* Roles & Permissions Card */}
        <div className="card">
          <h3
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              marginBottom: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Shield size={18} color="var(--color-brand-400)" />
            {t('profile.rolesAndPermissions', 'Phân quyền & Vai trò')}
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 16 }}>
            {t('profile.rolesDescription', 'Vai trò quyết định chức năng bạn được sử dụng')}
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
                    {t('roles.' + role, role)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {user?.permissions && user.permissions.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
                Quyền hạn (Permissions):
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {user.permissions.map((perm) => (
                  <span
                    key={perm}
                    style={{
                      fontSize: '0.72rem',
                      fontFamily: 'monospace',
                      padding: '3px 8px',
                      borderRadius: 6,
                      background: 'rgba(59, 130, 246, 0.08)',
                      color: 'var(--color-brand-400)',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                    }}
                  >
                    {perm}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
