import { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  WashingMachine,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Play,
  Square,
  RefreshCw,
  Search,
  Filter,
  Thermometer,
  Gauge,
  Flame,
  Zap,
} from 'lucide-react';

const INITIAL_MACHINES = [
  {
    id: 'm1',
    code: 'WASH-01',
    name: 'Máy giặt công nghiệp LG Commercial #1',
    type: 'WASHER',
    capacity: '15 kg',
    siteName: 'LaundroChain Quận 1 - Flagship',
    status: 'RUNNING',
    cycle: 'Giặt tiêu chuẩn + Xả vải',
    progress: 68,
    timeRemaining: 12, // phút
    temperature: 40,
    vibration: '0.4g (Normal)',
  },
  {
    id: 'm2',
    code: 'WASH-02',
    name: 'Máy giặt công nghiệp LG Commercial #2',
    type: 'WASHER',
    capacity: '15 kg',
    siteName: 'LaundroChain Quận 1 - Flagship',
    status: 'IDLE',
    cycle: 'Sẵn sàng nhận lệnh',
    progress: 0,
    timeRemaining: 0,
    temperature: 28,
    vibration: '0.0g',
  },
  {
    id: 'm3',
    code: 'WASH-03',
    name: 'Máy giặt công nghiệp SpeedQueen #3',
    type: 'WASHER',
    capacity: '20 kg',
    siteName: 'LaundroChain Quận 1 - Flagship',
    status: 'ERROR',
    cycle: 'Lỗi E04: Rung lắc lồng giặt',
    progress: 45,
    timeRemaining: 0,
    temperature: 32,
    vibration: '2.8g (High)',
  },
  {
    id: 'm4',
    code: 'DRY-01',
    name: 'Máy sấy nhiệt công nghiệp Electrolux #1',
    type: 'DRYER',
    capacity: '15 kg',
    siteName: 'LaundroChain Quận 1 - Flagship',
    status: 'RUNNING',
    cycle: 'Sấy nhiệt cao 70°C',
    progress: 82,
    timeRemaining: 6,
    temperature: 72,
    vibration: '0.2g',
  },
  {
    id: 'm5',
    code: 'DRY-02',
    name: 'Máy sấy nhiệt công nghiệp Electrolux #2',
    type: 'DRYER',
    capacity: '15 kg',
    siteName: 'LaundroChain Quận 1 - Flagship',
    status: 'IDLE',
    cycle: 'Sẵn sàng nhận đồ sấy',
    progress: 0,
    timeRemaining: 0,
    temperature: 35,
    vibration: '0.0g',
  },
  {
    id: 'm6',
    code: 'WASH-04',
    name: 'Máy giặt Nano Silver kháng khuẩn #4',
    type: 'WASHER',
    capacity: '10 kg',
    siteName: 'LaundroChain Quận 1 - Flagship',
    status: 'MAINTENANCE',
    cycle: 'Đang bảo trì định kỳ',
    progress: 0,
    timeRemaining: 0,
    temperature: 25,
    vibration: '0.0g',
  },
];

export default function MachinesMonitoringPage() {
  const { isVietnamese } = useLanguage();
  const [machines, setMachines] = useState(INITIAL_MACHINES);
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [search, setSearch] = useState('');

  // Live timer simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setMachines((prev) =>
        prev.map((m) => {
          if (m.status === 'RUNNING') {
            const nextProgress = m.progress >= 99 ? 0 : m.progress + 1;
            const nextStatus = m.progress >= 99 ? 'IDLE' : 'RUNNING';
            return {
              ...m,
              progress: nextProgress,
              status: nextStatus,
              timeRemaining: Math.max(0, m.timeRemaining - (nextProgress % 10 === 0 ? 1 : 0)),
            };
          }
          return m;
        })
      );
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  function handleStop(id) {
    setMachines((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: 'IDLE', progress: 0, timeRemaining: 0 } : m))
    );
  }

  function handleReset(id) {
    setMachines((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: 'IDLE', cycle: 'Sẵn sàng nhận lệnh', progress: 0 } : m))
    );
  }

  const filtered = machines.filter((m) => {
    const matchesSearch =
      m.code.toLowerCase().includes(search.toLowerCase()) ||
      m.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'ALL' || m.type === filterType;
    const matchesStatus = filterStatus === 'ALL' || m.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <WashingMachine className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            {isVietnamese ? 'Giám sát máy móc thời gian thực' : 'Real-time Machine Monitoring'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isVietnamese
              ? 'Theo dõi tiến trình chu trình giặt/sấy, cảm biến rung lắc, nhiệt độ và điều khiển dừng khẩn cấp.'
              : 'Monitor cycle progress, telemetry sensors, temperature and emergency stop control.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
            Live Telemetry (3s stream)
          </span>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isVietnamese ? 'Tìm theo mã máy (WASH-01, DRY-01)...' : 'Search machine code...'}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200"
          >
            <option value="ALL">{isVietnamese ? 'Tất cả loại máy' : 'All Machine Types'}</option>
            <option value="WASHER">{isVietnamese ? 'Máy giặt' : 'Washers'}</option>
            <option value="DRYER">{isVietnamese ? 'Máy sấy' : 'Dryers'}</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-800 dark:text-slate-200"
          >
            <option value="ALL">{isVietnamese ? 'Tất cả trạng thái' : 'All Status'}</option>
            <option value="RUNNING">{isVietnamese ? 'Đang chạy' : 'Running'}</option>
            <option value="IDLE">{isVietnamese ? 'Sẵn sàng' : 'Idle'}</option>
            <option value="ERROR">{isVietnamese ? 'Báo sự cố' : 'Error'}</option>
            <option value="MAINTENANCE">{isVietnamese ? 'Bảo trì' : 'Maintenance'}</option>
          </select>
        </div>
      </div>

      {/* Grid of Machines */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((m) => {
          const isRunning = m.status === 'RUNNING';
          const isError = m.status === 'ERROR';
          const isIdle = m.status === 'IDLE';

          return (
            <div
              key={m.id}
              className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 shadow-sm transition-all relative overflow-hidden ${
                isError
                  ? 'border-red-300 dark:border-red-800/80 shadow-red-500/5'
                  : isRunning
                  ? 'border-blue-300 dark:border-blue-800/80 shadow-blue-500/5'
                  : 'border-slate-200/80 dark:border-slate-800'
              }`}
            >
              {/* Top Row: Code, Type badge, Status */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm ${
                      isError
                        ? 'bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400'
                        : isRunning
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    <WashingMachine className={`w-6 h-6 ${isRunning ? 'animate-spin' : ''}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-1.5">
                      {m.code}
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        {m.capacity}
                      </span>
                    </h3>
                    <div className="text-xs text-slate-400 truncate max-w-[180px]">{m.name}</div>
                  </div>
                </div>

                {/* Status Badge */}
                {isRunning ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
                    {isVietnamese ? 'ĐANG GIẶT' : 'RUNNING'}
                  </span>
                ) : isError ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {isVietnamese ? 'SỰ CỐ' : 'ERROR'}
                  </span>
                ) : isIdle ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    {isVietnamese ? 'SẴN SÀNG' : 'IDLE'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    {isVietnamese ? 'BẢO TRÌ' : 'MAINTENANCE'}
                  </span>
                )}
              </div>

              {/* Cycle info */}
              <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">
                    {isVietnamese ? 'Chu trình:' : 'Current Cycle:'}
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{m.cycle}</span>
                </div>

                {/* Progress bar if running */}
                {isRunning && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {isVietnamese ? `Còn lại: ${m.timeRemaining} phút` : `${m.timeRemaining}m left`}
                      </span>
                      <span className="text-slate-700 dark:text-slate-300">{m.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${m.progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Telemetry sensors */}
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <Thermometer className="w-3.5 h-3.5 text-amber-500" />
                  <span>
                    {isVietnamese ? 'Nhiệt độ:' : 'Temp:'} <strong>{m.temperature}°C</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                  <Gauge className="w-3.5 h-3.5 text-indigo-500" />
                  <span>
                    {isVietnamese ? 'Độ rung:' : 'Vibration:'} <strong>{m.vibration}</strong>
                  </span>
                </div>
              </div>

              {/* Controls */}
              <div className="pt-3 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">{m.siteName}</span>

                <div className="flex items-center gap-2">
                  {isRunning && (
                    <button
                      onClick={() => handleStop(m.id)}
                      className="px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition flex items-center gap-1"
                    >
                      <Square className="w-3 h-3 fill-current" />
                      {isVietnamese ? 'Dừng máy' : 'Stop'}
                    </button>
                  )}
                  {isError && (
                    <button
                      onClick={() => handleReset(m.id)}
                      className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      {isVietnamese ? 'Reset lỗi' : 'Reset Error'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
