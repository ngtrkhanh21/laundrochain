import { useState, useEffect, useRef } from 'react';
import { brandsApi } from '../api/brandsApi';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import {
  Store,
  Plus,
  Search,
  Building2,
  Users,
  Calendar,
  CheckCircle2,
  XCircle,
  Edit3,
  Trash2,
  RefreshCw,
  UploadCloud,
  Image,
  AlertCircle,
  X,
  ExternalLink,
  ShieldCheck,
  LayoutGrid,
  List,
  Sparkles,
  Layers,
  ArrowUpDown,
} from 'lucide-react';

export default function BrandsPage() {
  const { isVietnamese, t } = useLanguage();
  const { user } = useAuth();

  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingBrandId, setEditingBrandId] = useState(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [brandToDelete, setBrandToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Form State
  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    status: 'ACTIVE',
    logoUrl: '',
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const fileInputRef = useRef(null);

  // Load brands
  const fetchBrands = async () => {
    setLoading(true);
    try {
      const data = await brandsApi.getBrands(search, statusFilter);
      setBrands(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching brands:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, [statusFilter]);

  // Handle Search submit / debounce
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      fetchBrands();
    }
  };

  // Stats calculation
  const totalBrands = brands.length;
  const activeBrands = brands.filter((b) => b.status === 'ACTIVE').length;
  const totalSites = brands.reduce((acc, b) => acc + (b.totalSites || 0), 0);
  const totalMembers = brands.reduce((acc, b) => acc + (b.totalMembers || 0), 0);

  // Open Create Modal
  const handleOpenCreate = () => {
    setIsEditing(false);
    setEditingBrandId(null);
    setForm({
      code: '',
      name: '',
      description: '',
      status: 'ACTIVE',
      logoUrl: '',
    });
    setLogoFile(null);
    setLogoPreview(null);
    setModalError('');
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (brand) => {
    setIsEditing(true);
    setEditingBrandId(brand.brandId);
    setForm({
      code: brand.code || '',
      name: brand.name || '',
      description: brand.description || '',
      status: brand.status || 'ACTIVE',
      logoUrl: brand.logoUrl || '',
    });
    setLogoFile(null);
    setLogoPreview(brand.logoUrl || null);
    setModalError('');
    setIsModalOpen(true);
  };

  // File Upload Handlers
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        setModalError(isVietnamese ? 'Kích thước file ảnh không được quá 8MB' : 'Image size cannot exceed 8MB');
        return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
      setModalError('');
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setForm((prev) => ({ ...prev, logoUrl: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Submit Create or Edit
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!form.code.trim()) {
      setModalError(isVietnamese ? 'Mã thương hiệu không được để trống' : 'Brand code is required');
      return;
    }
    if (!form.name.trim()) {
      setModalError(isVietnamese ? 'Tên thương hiệu không được để trống' : 'Brand name is required');
      return;
    }

    setModalSubmitting(true);
    setModalError('');

    try {
      const formData = new FormData();
      formData.append('code', form.code.trim().toUpperCase());
      formData.append('name', form.name.trim());
      formData.append('description', form.description.trim());
      formData.append('status', form.status);

      if (logoFile) {
        formData.append('logoFile', logoFile);
      } else if (form.logoUrl.trim()) {
        formData.append('logoUrl', form.logoUrl.trim());
      }

      if (isEditing) {
        await brandsApi.updateBrand(editingBrandId, formData);
      } else {
        await brandsApi.createBrand(formData);
      }

      setIsModalOpen(false);
      await fetchBrands();
    } catch (err) {
      setModalError(err.message || (isVietnamese ? 'Có lỗi xảy ra khi lưu thương hiệu.' : 'Failed to save brand.'));
    } finally {
      setModalSubmitting(false);
    }
  };

  // Open Delete Confirm
  const handleOpenDelete = (brand) => {
    setBrandToDelete(brand);
    setDeleteError('');
    setDeleteModalOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!brandToDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await brandsApi.deleteBrand(brandToDelete.brandId);
      setDeleteModalOpen(false);
      setBrandToDelete(null);
      await fetchBrands();
    } catch (err) {
      setDeleteError(err.message || (isVietnamese ? 'Không thể xóa thương hiệu.' : 'Cannot delete brand.'));
    } finally {
      setDeleting(false);
    }
  };

  // Helper for brand logo fallback
  const renderBrandLogo = (brand, size = 52) => {
    if (brand.logoUrl) {
      return (
        <img
          src={brand.logoUrl}
          alt={brand.name}
          style={{
            width: size,
            height: size,
            borderRadius: 14,
            objectFit: 'cover',
            background: 'var(--color-bg-card, #ffffff)',
            border: '1.5px solid var(--color-border-subtle, #e2e8f0)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      );
    }

    // Monogram fallback with stylish gradient
    const initials = brand.name
      ? brand.name
          .split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase()
      : brand.code?.slice(0, 2) || 'BR';

    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 14,
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.36,
          fontWeight: 800,
          letterSpacing: '0.05em',
          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
          flexShrink: 0,
        }}
      >
        {initials}
      </div>
    );
  };

  // Filtered brands client-side in case search query is typed
  const displayedBrands = brands.filter((b) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      b.name?.toLowerCase().includes(q) ||
      b.code?.toLowerCase().includes(q) ||
      b.description?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in" style={{ paddingBottom: 40 }}>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 6px 16px rgba(37, 99, 235, 0.25)',
              }}
            >
              <Store size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {isVietnamese ? 'Quản lý Thương hiệu' : 'Brand Management'}
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {isVietnamese
                  ? 'Quản trị thương hiệu tiệm giặt, logo Cloudinary, liên kết điểm giặt và thành viên.'
                  : 'Manage laundry store brands, Cloudinary logos, site associations, and member loyalty.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchBrands}
            disabled={loading}
            className="btn btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 16px',
              borderRadius: 12,
              fontWeight: 600,
              fontSize: '0.875rem',
            }}
            title={isVietnamese ? 'Làm mới danh sách' : 'Refresh brands'}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>{isVietnamese ? 'Làm mới' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 18px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '0.875rem',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.45)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(59, 130, 246, 0.35)';
            }}
          >
            <Plus size={18} />
            <span>{isVietnamese ? 'Thêm thương hiệu' : 'New Brand'}</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Brands */}
        <div className="glass-card p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {isVietnamese ? 'Tổng thương hiệu' : 'Total Brands'}
            </p>
            <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{totalBrands}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Store size={22} />
          </div>
        </div>

        {/* Active Brands */}
        <div className="glass-card p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {isVietnamese ? 'Đang hoạt động' : 'Active Brands'}
            </p>
            <h3 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{activeBrands}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 size={22} />
          </div>
        </div>

        {/* Total Linked Sites */}
        <div className="glass-card p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {isVietnamese ? 'Điểm giặt liên kết' : 'Linked Sites'}
            </p>
            <h3 className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">{totalSites}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Building2 size={22} />
          </div>
        </div>

        {/* Total Members */}
        <div className="glass-card p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {isVietnamese ? 'Thành viên trực thuộc' : 'Affiliated Members'}
            </p>
            <h3 className="text-2xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">{totalMembers}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Users size={22} />
          </div>
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="glass-card p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            className="form-input w-full pl-10 pr-4 py-2 text-sm rounded-xl"
            placeholder={isVietnamese ? 'Tìm theo tên, mã thương hiệu...' : 'Search by name, code...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
        </div>

        {/* Status Filters & View Toggle */}
        <div className="flex items-center justify-between w-full md:w-auto gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
            {[
              { id: 'ALL', labelVi: 'Tất cả', labelEn: 'All' },
              { id: 'ACTIVE', labelVi: 'Hoạt động', labelEn: 'Active' },
              { id: 'INACTIVE', labelVi: 'Tạm dừng', labelEn: 'Inactive' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  statusFilter === tab.id
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isVietnamese ? tab.labelVi : tab.labelEn}
              </button>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title={isVietnamese ? 'Chế độ lưới' : 'Grid view'}
            >
              <LayoutGrid size={17} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title={isVietnamese ? 'Chế độ danh sách' : 'Table view'}
            >
              <List size={17} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="glass-card p-6 rounded-2xl animate-pulse space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                </div>
              </div>
              <div className="h-10 bg-slate-100 dark:bg-slate-800/50 rounded-xl" />
            </div>
          ))}
        </div>
      ) : displayedBrands.length === 0 ? (
        <div className="glass-card p-12 rounded-3xl text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center mx-auto">
            <Store size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
            {isVietnamese ? 'Chưa tìm thấy thương hiệu nào' : 'No brands found'}
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            {search
              ? isVietnamese
                ? 'Không có kết quả khớp với từ khóa tìm kiếm của bạn. Hãy thử từ khóa khác.'
                : 'No brands matched your search keywords. Try a different query.'
              : isVietnamese
              ? 'Bắt đầu bằng việc thêm thương hiệu đầu tiên vào hệ sinh thái chuỗi LaundroChain.'
              : 'Get started by creating your first laundry brand in LaundroChain.'}
          </p>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="btn btn-primary inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold"
          >
            <Plus size={18} />
            <span>{isVietnamese ? 'Thêm thương hiệu mới' : 'Add New Brand'}</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedBrands.map((brand) => (
            <div
              key={brand.brandId}
              className="glass-card rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:shadow-xl border border-slate-200/60 dark:border-slate-800/60 group"
            >
              <div>
                {/* Top Row: Logo, Code & Status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    {renderBrandLogo(brand, 54)}
                    <div>
                      <span className="inline-block px-2 py-0.5 text-[0.7rem] font-bold tracking-wider rounded-md uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 mb-1 border border-slate-200 dark:border-slate-700">
                        {brand.code}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {brand.name}
                      </h3>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      brand.status === 'ACTIVE'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        brand.status === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                      }`}
                    />
                    {brand.status === 'ACTIVE'
                      ? isVietnamese
                        ? 'Hoạt động'
                        : 'Active'
                      : isVietnamese
                      ? 'Tạm dừng'
                      : 'Inactive'}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-3.5 line-clamp-2 min-h-[32px]">
                  {brand.description || (
                    <span className="italic text-slate-400">
                      {isVietnamese ? 'Chưa có mô tả cho thương hiệu này' : 'No description provided'}
                    </span>
                  )}
                </p>
              </div>

              {/* Bottom Metrics & Actions */}
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <Building2 size={16} className="text-blue-500 shrink-0" />
                    <div>
                      <p className="text-[0.68rem] text-slate-400 uppercase font-medium">
                        {isVietnamese ? 'Chi nhánh' : 'Sites'}
                      </p>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {brand.totalSites || 0} {isVietnamese ? 'cửa hàng' : 'stores'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <Users size={16} className="text-purple-500 shrink-0" />
                    <div>
                      <p className="text-[0.68rem] text-slate-400 uppercase font-medium">
                        {isVietnamese ? 'Thành viên' : 'Members'}
                      </p>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {brand.totalMembers || 0}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[0.72rem] text-slate-400 flex items-center gap-1">
                    <Calendar size={13} />
                    {brand.createdAt ? new Date(brand.createdAt).toLocaleDateString('vi-VN') : '—'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(brand)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                      title={isVietnamese ? 'Chỉnh sửa' : 'Edit brand'}
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenDelete(brand)}
                      className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                      title={isVietnamese ? 'Xóa thương hiệu' : 'Delete brand'}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* TABLE LIST VIEW */
        <div className="glass-card rounded-2xl overflow-hidden border border-slate-200/60 dark:border-slate-800/60">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">{isVietnamese ? 'Thương hiệu' : 'Brand'}</th>
                  <th className="px-4 py-3.5">{isVietnamese ? 'Mã code' : 'Code'}</th>
                  <th className="px-4 py-3.5">{isVietnamese ? 'Mô tả' : 'Description'}</th>
                  <th className="px-4 py-3.5 text-center">{isVietnamese ? 'Chi nhánh' : 'Sites'}</th>
                  <th className="px-4 py-3.5 text-center">{isVietnamese ? 'Thành viên' : 'Members'}</th>
                  <th className="px-4 py-3.5">{isVietnamese ? 'Trạng thái' : 'Status'}</th>
                  <th className="px-5 py-3.5 text-right">{isVietnamese ? 'Thao tác' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {displayedBrands.map((brand) => (
                  <tr key={brand.brandId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {renderBrandLogo(brand, 42)}
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{brand.name}</p>
                          <p className="text-xs text-slate-400">
                            {brand.createdAt ? new Date(brand.createdAt).toLocaleDateString('vi-VN') : '—'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-mono text-xs font-semibold px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md">
                        {brand.code}
                      </span>
                    </td>
                    <td className="px-4 py-4 max-w-xs text-slate-500 text-xs truncate">
                      {brand.description || '—'}
                    </td>
                    <td className="px-4 py-4 text-center font-semibold text-slate-700 dark:text-slate-300">
                      {brand.totalSites || 0}
                    </td>
                    <td className="px-4 py-4 text-center font-semibold text-slate-700 dark:text-slate-300">
                      {brand.totalMembers || 0}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          brand.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            brand.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        {brand.status === 'ACTIVE'
                          ? isVietnamese
                            ? 'Hoạt động'
                            : 'Active'
                          : isVietnamese
                          ? 'Tạm dừng'
                          : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(brand)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                          title={isVietnamese ? 'Chỉnh sửa' : 'Edit'}
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDelete(brand)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                          title={isVietnamese ? 'Xóa' : 'Delete'}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE & EDIT MODAL */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => !modalSubmitting && setIsModalOpen(false)}
        >
          <div
            className="glass-card animate-scale-up"
            style={{
              width: '100%',
              maxWidth: 540,
              background: 'var(--color-bg-card, #ffffff)',
              borderRadius: 24,
              padding: 32,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
              border: '1px solid var(--color-border-subtle, rgba(255,255,255,0.15))',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                  <Store size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {isEditing
                      ? isVietnamese
                        ? 'Chỉnh sửa thương hiệu'
                        : 'Edit Brand'
                      : isVietnamese
                      ? 'Thêm thương hiệu mới'
                      : 'Create New Brand'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isEditing
                      ? isVietnamese
                        ? 'Cập nhật thông tin và hình ảnh logo thương hiệu'
                        : 'Update brand details and logo asset'
                      : isVietnamese
                      ? 'Thiết lập mã nhận diện, logo và mô tả thương hiệu chuỗi'
                      : 'Set up brand code, Cloudinary logo and store description'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={modalSubmitting}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Error banner */}
            {modalError && (
              <div className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                <AlertCircle size={18} className="shrink-0 text-red-500" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleFormSubmit} className="mt-5 space-y-4">
              {/* Brand Code & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="form-label block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase">
                    {isVietnamese ? 'Mã thương hiệu' : 'Brand Code'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={50}
                    placeholder="VD: LAUNDRO_ECO"
                    className="form-input w-full font-mono uppercase text-sm"
                    value={form.code}
                    onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  />
                  <p className="text-[0.7rem] text-slate-400 mt-1">
                    {isVietnamese ? 'Định danh duy nhất (không dấu, viết hoa)' : 'Unique identifier (uppercase)'}
                  </p>
                </div>

                <div>
                  <label className="form-label block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase">
                    {isVietnamese ? 'Trạng thái' : 'Status'}
                  </label>
                  <select
                    className="form-input w-full text-sm"
                    value={form.status}
                    onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="ACTIVE">{isVietnamese ? 'Hoạt động (ACTIVE)' : 'ACTIVE'}</option>
                    <option value="INACTIVE">{isVietnamese ? 'Tạm dừng (INACTIVE)' : 'INACTIVE'}</option>
                  </select>
                </div>
              </div>

              {/* Brand Name */}
              <div>
                <label className="form-label block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase">
                  {isVietnamese ? 'Tên thương hiệu' : 'Brand Name'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={200}
                  placeholder={isVietnamese ? 'VD: LaundroChain Flagship Express' : 'e.g. LaundroChain Flagship'}
                  className="form-input w-full text-sm"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>

              {/* Logo Upload Zone (Cloudinary) */}
              <div>
                <label className="form-label block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase">
                  {isVietnamese ? 'Hình ảnh Logo thương hiệu' : 'Brand Logo (Cloudinary)'}
                </label>

                <div
                  style={{
                    border: '2px dashed var(--color-border-subtle, #cbd5e1)',
                    borderRadius: 16,
                    padding: '20px',
                    textAlign: 'center',
                    background: 'var(--color-bg-subtle, #f8fafc)',
                    transition: 'all 0.2s',
                  }}
                >
                  {logoPreview ? (
                    <div className="flex items-center justify-center gap-4">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: 16,
                          objectFit: 'cover',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          border: '2px solid #3b82f6',
                        }}
                      />
                      <div className="text-left">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                          {logoFile ? logoFile.name : isVietnamese ? 'Logo hiện tại' : 'Current logo'}
                        </p>
                        <p className="text-[0.7rem] text-slate-400">
                          {logoFile ? `${(logoFile.size / 1024).toFixed(1)} KB` : isVietnamese ? 'Lưu trên Cloudinary' : 'Hosted on Cloudinary'}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-xs font-semibold text-blue-600 hover:underline"
                          >
                            {isVietnamese ? 'Thay ảnh khác' : 'Change image'}
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={handleRemoveLogo}
                            className="text-xs font-semibold text-red-500 hover:underline"
                          >
                            {isVietnamese ? 'Gỡ ảnh' : 'Remove'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 mx-auto flex items-center justify-center mb-2">
                        <UploadCloud size={24} />
                      </div>
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        {isVietnamese ? 'Kéo thả ảnh logo vào đây hoặc bấm để chọn' : 'Upload logo image'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        PNG, JPG, WEBP, SVG {isVietnamese ? '(Tối đa 8MB, tự động tối ưu qua Cloudinary)' : '(Up to 8MB, auto-optimized)'}
                      </p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-3 px-4 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shadow-sm hover:bg-slate-50"
                      >
                        {isVietnamese ? 'Chọn file từ máy tính' : 'Browse file'}
                      </button>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/webp, image/svg+xml"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                </div>

                {/* Alternative URL */}
                <div className="mt-2">
                  <input
                    type="url"
                    placeholder={isVietnamese ? 'Hoặc nhập đường dẫn URL ảnh (https://...)' : 'Or enter image URL (https://...)'}
                    className="form-input w-full text-xs py-1.5"
                    value={form.logoUrl}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, logoUrl: e.target.value }));
                      if (!logoFile) setLogoPreview(e.target.value || null);
                    }}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="form-label block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase">
                  {isVietnamese ? 'Mô tả thương hiệu' : 'Description'}
                </label>
                <textarea
                  rows={3}
                  maxLength={1000}
                  placeholder={
                    isVietnamese
                      ? 'Nhập thông tin giới thiệu, định vị dịch vụ và quy chuẩn của chuỗi thương hiệu...'
                      : 'Brief description about this brand...'
                  }
                  className="form-input w-full text-sm"
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={modalSubmitting}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  {isVietnamese ? 'Hủy' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-5 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
                >
                  {modalSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{isVietnamese ? 'Đang lưu...' : 'Saving...'}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>{isEditing ? (isVietnamese ? 'Cập nhật' : 'Update') : isVietnamese ? 'Tạo mới' : 'Create'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModalOpen && brandToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => !deleting && setDeleteModalOpen(false)}
        >
          <div
            className="glass-card animate-scale-up"
            style={{
              width: '100%',
              maxWidth: 440,
              background: 'var(--color-bg-card, #ffffff)',
              borderRadius: 24,
              padding: 28,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} />
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white text-center">
              {isVietnamese ? 'Xóa thương hiệu này?' : 'Delete Brand?'}
            </h3>

            <p className="text-sm text-slate-500 text-center mt-2">
              {isVietnamese ? 'Bạn có chắc chắn muốn xóa thương hiệu' : 'Are you sure you want to delete brand'}{' '}
              <strong className="text-slate-800 dark:text-slate-200">"{brandToDelete.name}"</strong>?
            </p>

            {/* Warning if has associations */}
            {(brandToDelete.totalSites > 0 || brandToDelete.totalMembers > 0) && (
              <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertCircle size={14} className="text-amber-600" />
                  {isVietnamese ? 'Ràng buộc dữ liệu chuỗi:' : 'Database Constraint Warning:'}
                </p>
                <p>
                  {isVietnamese
                    ? `Thương hiệu này đang liên kết với ${brandToDelete.totalSites} điểm giặt và ${brandToDelete.totalMembers} thành viên. Backend sẽ chặn xóa vĩnh viễn để bảo vệ tính toàn vẹn dữ liệu. Hãy chuyển trạng thái sang "Tạm dừng" (INACTIVE) thay vì xóa.`
                    : `This brand is linked to ${brandToDelete.totalSites} sites and ${brandToDelete.totalMembers} members. Deletion will be rejected by backend integrity rules.`}
                </p>
              </div>
            )}

            {deleteError && (
              <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                {deleteError}
              </div>
            )}

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50 text-sm"
              >
                {isVietnamese ? 'Hủy' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 text-sm shadow-md flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
                <span>{isVietnamese ? 'Xác nhận xóa' : 'Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
