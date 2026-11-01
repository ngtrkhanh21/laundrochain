import { useState, useEffect } from 'react';
import { adminApi } from '../api/adminApi';
import { useLanguage } from '../context/LanguageContext';
import {
  Building2,
  MapPin,
  Clock,
  WashingMachine,
  Cpu,
  Search,
  Plus,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Store,
} from 'lucide-react';

export default function BranchesPage() {
  const { isVietnamese } = useLanguage();
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function fetchSites() {
      setLoading(true);
      try {
        const data = await adminApi.getSites();
        setSites(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchSites();
  }, []);

  const filteredSites = sites.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      s.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            {isVietnamese ? 'Chi nhánh & Cửa hàng' : 'Store Branches & Sites'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isVietnamese
              ? 'Mạng lưới các điểm giặt thông minh trên toàn quốc thuộc chuỗi LaundroChain.'
              : 'Network of smart laundry stores nationwide managed under LaundroChain.'}
          </p>
        </div>

        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm transition">
          <Plus className="w-4 h-4" />
          {isVietnamese ? 'Thêm chi nhánh' : 'New Branch'}
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              isVietnamese
                ? 'Tìm theo tên chi nhánh, mã cửa hàng, địa chỉ...'
                : 'Search by branch name, code, address...'
            }
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          {filteredSites.length} {isVietnamese ? 'chi nhánh hoạt động' : 'active branches'}
        </div>
      </div>

      {/* Grid of Store Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredSites.map((site, index) => (
          <div
            key={site.siteId || index}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      {site.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {site.code}
                      </span>
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                        {site.brandName || 'LaundroChain Express'}
                      </span>
                    </div>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  {isVietnamese ? 'Mở cửa 24/7' : 'Open 24/7'}
                </span>
              </div>

              <div className="space-y-2 mt-4 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  <span>{site.address}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span>
                    {isVietnamese
                      ? 'Giờ phục vụ: 06:00 - 23:30 hàng ngày'
                      : 'Operating hours: 06:00 - 23:30 daily'}
                  </span>
                </div>
              </div>

              {/* Statistics row */}
              <div className="grid grid-cols-3 gap-2 mt-4 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-center">
                <div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">12</div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                    <WashingMachine className="w-3 h-3" />
                    {isVietnamese ? 'Máy giặt/sấy' : 'Machines'}
                  </div>
                </div>
                <div>
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">10/12</div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    {isVietnamese ? 'Sẵn sàng' : 'Available'}
                  </div>
                </div>
                <div>
                  <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">2</div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
                    <Cpu className="w-3 h-3 text-indigo-500" />
                    {isVietnamese ? 'Ki-ốt IoT' : 'Kiosks'}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">
                {isVietnamese ? 'Quản lý:' : 'Site Manager:'} <strong className="text-slate-700 dark:text-slate-200">Trần Văn Cửa Hàng Trưởng</strong>
              </span>
              <button className="text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center gap-1">
                {isVietnamese ? 'Xem sơ đồ máy' : 'View Machines'}
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
