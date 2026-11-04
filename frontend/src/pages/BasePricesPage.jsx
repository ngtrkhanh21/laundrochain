import { useState, useEffect, useMemo, useCallback } from 'react';
import { Coins, Search, RefreshCw, Pencil, Check, X, AlertTriangle, CheckCircle2, Building2, Sliders } from 'lucide-react';
import { pricingApi } from '../api/pricingApi';
import { brandsApi } from '../api/brandsApi';

const formatVnd = (n) => `${Number(n || 0).toLocaleString('vi-VN')}đ`;

export default function BasePricesPage() {
  const [prices, setPrices] = useState([]);
  const [brands, setBrands] = useState([]);
  const [brandId, setBrandId] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await pricingApi.getBasePrices(brandId || undefined);
      setPrices(Array.isArray(res) ? res : res?.items || []);
    } catch (err) {
      setError(err.message || 'Không tải được bảng giá.');
    } finally {
      setLoading(false);
    }
  }, [brandId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    brandsApi
      .getBrands()
      .then((res) => setBrands(Array.isArray(res) ? res : res?.items || res?.data || []))
      .catch(() => setBrands([]));
  }, []);

  const categories = useMemo(
    () => ['ALL', ...Array.from(new Set(prices.map((p) => p.serviceCategory).filter(Boolean)))],
    [prices]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return prices.filter((p) => {
      if (category !== 'ALL' && p.serviceCategory !== category) return false;
      if (!q) return true;
      return [p.offeringName, p.offeringCode, p.machineClassName, p.serviceTypeName]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(q));
    });
  }, [prices, search, category]);

  const startEdit = (p) => {
    setEditingId(p.offeringId);
    setDraft(String(p.unitPrice ?? 0));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft('');
  };

  const save = async (p) => {
    const value = Number(draft);
    if (!Number.isFinite(value) || value < 0 || value > 10000000) {
      setError('Đơn giá phải từ 0 đến 10.000.000đ.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const updated = await pricingApi.updateServicePrice(p.offeringId, {
        brandId: brandId || null,
        unitPrice: Math.round(value),
      });
      setPrices((prev) =>
        prev.map((x) => (x.offeringId === p.offeringId ? { ...x, ...updated } : x))
      );
      setToast(`Đã cập nhật giá "${p.offeringName}" thành ${formatVnd(value)}.`);
      setTimeout(() => setToast(''), 3500);
      cancelEdit();
    } catch (err) {
      setError(err.message || 'Không thể cập nhật giá.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs shrink-0">
            <Coins className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                Quản lý Giá cơ sở dịch vụ
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                Bảng giá niêm yết
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Điều chỉnh đơn giá giặt, sấy và dịch vụ phụ trợ cho toàn hệ thống hoặc theo thương hiệu riêng.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Tải lại</span>
          </button>
        </div>
      </div>

      {toast && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {toast}
        </div>
      )}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex flex-col lg:flex-row gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="base-price-search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm dịch vụ, mã dịch vụ, loại máy..."
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/30"
              />
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              <select
                id="base-price-brand"
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                className="px-3 py-2.5 text-sm font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-amber-500/30"
              >
                <option value="">Toàn hệ thống</option>
                {brands.map((b) => (
                  <option key={b.brandId || b.id} value={b.brandId || b.id}>
                    {b.name || b.brandName}
                  </option>
                ))}
              </select>
            </div>
            <select
              id="base-price-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2.5 text-sm font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 border-0 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-amber-500/30"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === 'ALL' ? 'Tất cả nhóm dịch vụ' : c}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-sm font-bold cursor-pointer active:scale-95 transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Tải lại
            </button>
          </div>

      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500 bg-slate-50 dark:bg-slate-800/60">
              <th className="px-4 py-3 font-bold">Dịch vụ</th>
              <th className="px-4 py-3 font-bold">Loại máy</th>
              <th className="px-4 py-3 font-bold">Đơn vị tính</th>
              <th className="px-4 py-3 font-bold text-right">Đơn giá</th>
              <th className="px-4 py-3 font-bold">Trạng thái</th>
              <th className="px-4 py-3 font-bold text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  Đang tải bảng giá...
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  Không có dịch vụ phù hợp.
                </td>
              </tr>
            )}
            {!loading &&
              filtered.map((p) => {
                const isEditing = editingId === p.offeringId;
                return (
                  <tr
                    key={p.offeringId}
                    className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition"
                  >
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900 dark:text-white">{p.offeringName}</div>
                      <div className="text-xs font-mono text-slate-500">
                        {p.offeringCode} • {p.serviceCategory}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">
                      {p.machineClassName || '—'}
                      {p.durationMin ? (
                        <div className="text-xs text-slate-500">{p.durationMin} phút</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">
                      {p.pricingUnitName || p.pricingUnit}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {isEditing ? (
                        <input
                          autoFocus
                          type="number"
                          min={0}
                          max={10000000}
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') save(p);
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          className="w-32 px-3 py-2 text-right font-mono font-bold rounded-xl border border-amber-300 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500/30"
                        />
                      ) : (
                        <span className="font-mono font-black text-slate-900 dark:text-white">
                          {formatVnd(p.unitPrice)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {p.isCustomPrice ? (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-800">
                          Giá riêng{p.brandName ? ` • ${p.brandName}` : ''}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          Giá chung
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {isEditing ? (
                        <div className="inline-flex gap-2">
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => save(p)}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer disabled:opacity-60"
                          >
                            <Check className="w-4 h-4" /> Lưu
                          </button>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={cancelEdit}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                          >
                            <X className="w-4 h-4" /> Hủy
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(p)}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold cursor-pointer transition"
                        >
                          <Pencil className="w-4 h-4" /> Sửa giá
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
