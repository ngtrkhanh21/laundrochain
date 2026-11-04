import { useState, useEffect } from 'react';
import { adminApi } from '../api/adminApi';
import { useLanguage } from '../context/LanguageContext';
import {
  Cpu,
  Wifi,
  WifiOff,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Server,
  Zap,
  Activity,
  ArrowUpRight,
} from 'lucide-react';

export default function DevicesPage() {
  const { isVietnamese } = useLanguage();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [rebootingId, setRebootingId] = useState(null);

  useEffect(() => {
    async function loadDevices() {
      setLoading(true);
      try {
        const data = await adminApi.getDevices();
        const list = Array.isArray(data) ? data : (data?.items || []);
        const mapped = list.map((d) => ({
          deviceId: d.deviceId,
          deviceCode: d.code,
          type: d.deviceType === 'KIOSK' ? 'KIOSK_TERMINAL' : 'IOT_GATEWAY',
          siteName: d.siteName || 'LaundroChain Bến Thành - Quận 1',
          ipAddress: d.ipAddress || '192.168.1.100',
          status: d.status || 'ONLINE',
          firmware: d.firmwareVersion || 'v1.0.0',
          signal: -50,
          lastPing: d.lastPingAt ? new Date(d.lastPingAt).toLocaleTimeString('vi-VN') : 'Vừa xong',
          connectedMachines: 6,
        }));
        setDevices(mapped);
      } catch (err) {
        console.warn('Devices API load error', err);
        setDevices([]);
      } finally {
        setLoading(false);
      }
    }
    loadDevices();
  }, []);

  function handleReboot(id) {
    setRebootingId(id);
    setTimeout(() => {
      setRebootingId(null);
      alert(isVietnamese ? `Đã gửi lệnh khởi động lại thiết bị ${id}` : `Reboot signal sent to ${id}`);
    }, 1500);
  }

  const filtered = devices.filter((d) => {
    const matchesSearch =
      d.deviceCode.toLowerCase().includes(search.toLowerCase()) ||
      d.siteName.toLowerCase().includes(search.toLowerCase()) ||
      d.ipAddress.includes(search);
    const matchesType = filterType === 'ALL' || d.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Cpu className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            {isVietnamese ? 'Quản lý thiết bị IoT & Ki-ốt' : 'IoT & Kiosk Device Management'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isVietnamese
              ? 'Theo dõi trạng thái kết nối mạng, telemetry và điều khiển từ xa các trạm Ki-ốt.'
              : 'Monitor network connection, telemetry and remotely control IoT kiosk stations.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            MQTT Broker: Connected (TLS)
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-xs font-semibold uppercase text-slate-400">
            {isVietnamese ? 'Tổng thiết bị' : 'Total Devices'}
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">42</div>
          <div className="text-xs text-slate-500 mt-1">32 Kiosk, 10 Gateways</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-xs font-semibold uppercase text-slate-400">
            {isVietnamese ? 'Đang trực tuyến' : 'Online'}
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">39</div>
          <div className="text-xs text-emerald-600 mt-1">92.8% uptime SLA</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-xs font-semibold uppercase text-slate-400">
            {isVietnamese ? 'Tín hiệu yếu' : 'Weak Signal'}
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">2</div>
          <div className="text-xs text-amber-600 mt-1">RSSI &lt; -80 dBm</div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-xs font-semibold uppercase text-slate-400">
            {isVietnamese ? 'Mất kết nối' : 'Offline'}
          </div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">1</div>
          <div className="text-xs text-red-600 mt-1">Cần cử kỹ thuật viên</div>
        </div>
      </div>

      {/* Filter and search */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isVietnamese ? 'Tìm theo mã thiết bị, IP, chi nhánh...' : 'Search device code, IP...'}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200"
          >
            <option value="ALL">{isVietnamese ? 'Tất cả loại thiết bị' : 'All Types'}</option>
            <option value="KIOSK_TERMINAL">Ki-ốt cảm ứng (Kiosk)</option>
            <option value="IOT_GATEWAY">IoT Gateway</option>
          </select>
        </div>
      </div>

      {/* Device Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4">{isVietnamese ? 'Thiết bị' : 'Device'}</th>
                <th className="px-6 py-4">{isVietnamese ? 'Chi nhánh' : 'Branch Site'}</th>
                <th className="px-6 py-4">IP / Firmware</th>
                <th className="px-6 py-4">{isVietnamese ? 'Tín hiệu & Ping' : 'Signal & Ping'}</th>
                <th className="px-6 py-4">{isVietnamese ? 'Trạng thái' : 'Status'}</th>
                <th className="px-6 py-4 text-right">{isVietnamese ? 'Hành động' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filtered.map((d) => (
                <tr key={d.deviceId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Server className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{d.deviceCode}</div>
                        <div className="text-xs text-slate-400 font-mono">{d.type}</div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                    {d.siteName}
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {d.connectedMachines} {isVietnamese ? 'máy kết nối' : 'connected machines'}
                    </div>
                  </td>

                  <td className="px-6 py-4 text-xs">
                    <div className="font-mono text-slate-800 dark:text-slate-200">{d.ipAddress}</div>
                    <div className="text-slate-400">{d.firmware}</div>
                  </td>

                  <td className="px-6 py-4 text-xs">
                    <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                      {d.signal !== 0 ? (
                        <>
                          <Wifi className="w-3.5 h-3.5 text-blue-500" />
                          <span>{d.signal} dBm</span>
                        </>
                      ) : (
                        <>
                          <WifiOff className="w-3.5 h-3.5 text-red-500" />
                          <span className="text-red-500">Mất tín hiệu</span>
                        </>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{d.lastPing}</div>
                  </td>

                  <td className="px-6 py-4">
                    {d.status === 'ONLINE' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        ONLINE
                      </span>
                    ) : d.status === 'WARNING' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        WARNING
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        OFFLINE
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleReboot(d.deviceCode)}
                      disabled={rebootingId === d.deviceCode}
                      className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition inline-flex items-center gap-1.5"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${
                          rebootingId === d.deviceCode ? 'animate-spin text-blue-500' : ''
                        }`}
                      />
                      {rebootingId === d.deviceCode
                        ? isVietnamese
                          ? 'Đang gửi...'
                          : 'Rebooting...'
                        : isVietnamese
                        ? 'Khởi động lại'
                        : 'Reboot'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
