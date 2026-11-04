import { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { authApi } from '../api/authApi';
import {
  X,
  QrCode,
  Camera,
  CheckCircle2,
  AlertCircle,
  Monitor,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

export default function KioskQrScannerModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const { isVietnamese } = useLanguage();

  // Các bước: 'SCANNING' | 'CONFIRMING' | 'SUCCESS'
  const [step, setStep] = useState('SCANNING');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [torchOn, setTorchOn] = useState(false);

  // Thông tin phiên quét
  const [scannedSession, setScannedSession] = useState(null); // { sessionId, qrToken, deviceName }

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanLoopRef = useRef(null);

  // Reset state mỗi khi mở modal
  useEffect(() => {
    if (isOpen) {
      setStep('SCANNING');
      setCameraError('');
      setError('');
      setScannedSession(null);

      if (!hasNativePermission()) {
        handleRequestNativePermission();
      } else {
        startCamera();
      }
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  const startingLockRef = useRef(false);

  const hasNativePermission = () => {
    try {
      if (window.AndroidCamera && typeof window.AndroidCamera.hasCameraPermission === 'function') {
        return window.AndroidCamera.hasCameraPermission();
      }
    } catch {
      // ignore
    }
    return true;
  };

  // Đăng ký hàm khởi chạy lại Camera toàn cục để Native Android gọi khi người dùng bấm Cho phép quyền Camera
  useEffect(() => {
    window.__restartQrCamera = () => {
      setCameraError('');
      if (isOpen && !streamRef.current) {
        startCamera();
      }
    };
    window.__onCameraPermissionDenied = () => {
      setCameraError(
        isVietnamese
          ? 'Ứng dụng chưa được cấp quyền máy ảnh. Vui lòng cấp quyền trong Cài đặt thiết bị.'
          : 'Camera permission denied. Please allow camera permission in Settings.'
      );
    };
    return () => {
      delete window.__restartQrCamera;
      delete window.__onCameraPermissionDenied;
    };
  }, [isOpen, isVietnamese]);

  const stopCamera = () => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setTorchOn(false);
  };

  const handleRequestNativePermission = () => {
    try {
      if (window.AndroidCamera && typeof window.AndroidCamera.requestCameraPermission === 'function') {
        window.AndroidCamera.requestCameraPermission();
      }
    } catch {
      // ignore
    }
  };

  const startCamera = async () => {
    if (startingLockRef.current || streamRef.current) return;
    startingLockRef.current = true;
    setCameraError('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(
          isVietnamese
            ? 'Trình duyệt hoặc thiết bị không hỗ trợ truy cập máy ảnh trực tiếp.'
            : 'Browser or device does not support camera access.'
        );
        return;
      }

      let stream = null;
      try {
        // Ưu tiên camera sau (environment)
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        // Fallback sang camera bất kỳ
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setCameraActive(true);

        // Bắt đầu vòng lặp quét với jsQR
        startScanningLoop();
      }
    } catch (err) {
      console.warn('Camera error:', err);
      let errorMsg = isVietnamese
        ? 'Không thể mở máy ảnh. Vui lòng cho phép quyền truy cập Camera hoặc chọn ảnh QR.'
        : 'Unable to access camera. Please allow camera permission or upload a QR image.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = isVietnamese
          ? 'Ứng dụng chưa được cấp quyền máy ảnh. Vui lòng cấp quyền trong Cài đặt thiết bị.'
          : 'Camera permission denied. Please allow camera permission in Settings.';
      }
      setCameraError(errorMsg);
    } finally {
      startingLockRef.current = false;
    }
  };

  // Vòng lặp quét frame video bằng jsQR
  const startScanningLoop = () => {
    const scanFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (qrCode && qrCode.data) {
            handleScannedRawData(qrCode.data);
            return; // Dừng vòng lặp khi đã nhận diện
          }
        }
      }

      scanLoopRef.current = requestAnimationFrame(scanFrame);
    };

    scanLoopRef.current = requestAnimationFrame(scanFrame);
  };

  // Bật/tắt đèn Flash
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    try {
      const track = streamRef.current.getVideoTracks()[0];
      const capabilities = track.getCapabilities ? track.getCapabilities() : {};
      if (capabilities.torch) {
        const next = !torchOn;
        await track.applyConstraints({ advanced: [{ torch: next }] });
        setTorchOn(next);
      }
    } catch (err) {
      console.warn('Torch toggle not supported', err);
    }
  };

  // Xử lý chuỗi QR đọc được từ Camera
  const handleScannedRawData = async (rawData) => {
    if (!rawData) return;
    stopCamera();
    setError('');

    try {
      const trimmed = rawData.trim();
      let sessionId = null;
      let qrToken = null;

      // Hỗ trợ format chuẩn: LC:QR_LOGIN:{sessionId}:{qrToken}
      if (trimmed.startsWith('LC:QR_LOGIN:')) {
        const parts = trimmed.split(':');
        sessionId = parts[2];
        qrToken = parts[3];
      } else {
        // Thử parse dạng JSON nếu có
        try {
          const parsed = JSON.parse(trimmed);
          sessionId = parsed.sessionId || parsed.session_id || parsed.id;
          qrToken = parsed.qrToken || parsed.qr_token || parsed.token;
        } catch {
          // Thử tách theo dấu gạch ngang hoặc 2 chuỗi
          const parts = trimmed.split('|');
          if (parts.length >= 2) {
            sessionId = parts[0];
            qrToken = parts[1];
          }
        }
      }

      if (!sessionId || !qrToken) {
        throw new Error(
          isVietnamese
            ? 'Mã QR không đúng định dạng đăng nhập Ki-ốt LaundroChain.'
            : 'QR code is not a valid LaundroChain Kiosk login code.'
        );
      }

      setSubmitting(true);

      // Gọi API scanQrCode để thông báo Kiosk biết điện thoại đã quét mã
      let deviceName = 'Kiosk Trạm Giặt LaundroChain';
      try {
        const scanRes = await authApi.scanQrCode({
          sessionId,
          qrToken,
          qrData: trimmed,
        });
        if (scanRes?.deviceName) {
          deviceName = scanRes.deviceName;
        }
      } catch (scanErr) {
        console.warn('API scanQrCode note:', scanErr);
      }

      setScannedSession({
        sessionId,
        qrToken,
        qrData: trimmed,
        deviceName,
      });

      setStep('CONFIRMING');
    } catch (err) {
      console.error('Scan processing error:', err);
      setError(err.message || 'Lỗi xử lý mã QR. Vui lòng quét lại.');
      // Khởi động lại camera sau 1.5s
      setTimeout(() => {
        startCamera();
      }, 1500);
    } finally {
      setSubmitting(false);
    }
  };

  // Xác nhận đăng nhập Kiosk
  const handleConfirmLogin = async () => {
    if (!scannedSession) return;
    const token = localStorage.getItem('laundrochain_token');
    if (!token) {
      setError(
        isVietnamese
          ? 'Bạn cần đăng nhập tài khoản trên điện thoại trước khi xác nhận vào Ki-ốt!'
          : 'Please sign in to your mobile account before confirming on Kiosk!'
      );
      return;
    }
    setSubmitting(true);
    setError('');

    try {
      await authApi.confirmQrLogin({
        sessionId: scannedSession.sessionId,
        qrToken: scannedSession.qrToken,
        qrData: scannedSession.qrData,
      });

      setStep('SUCCESS');
      // Đóng modal sau 2 giây
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Confirm QR login error:', err);
      setError(err.message || (isVietnamese ? 'Xác nhận thất bại. Vui lòng thử lại.' : 'Failed to confirm login.'));
    } finally {
      setSubmitting(false);
    }
  };

  // Từ chối đăng nhập Kiosk
  const handleRejectLogin = async () => {
    if (!scannedSession) {
      onClose();
      return;
    }
    setSubmitting(true);
    try {
      await authApi.rejectQrLogin({
        sessionId: scannedSession.sessionId,
        qrToken: scannedSession.qrToken,
        qrData: scannedSession.qrData,
      });
    } catch (err) {
      console.warn('Reject QR login warning:', err);
    } finally {
      setSubmitting(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      {/* Hidden canvas for jsQR frame decoding */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {isVietnamese ? 'Quét QR Đăng nhập Ki-ốt' : 'Scan Kiosk QR Code'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                LaundroChain Mobile Auth
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto">
          {/* BƯỚC 1: SCANNING */}
          {step === 'SCANNING' && (
            <div className="space-y-4">
              {/* Camera Scanner Viewport */}
              <div className="relative w-full aspect-square bg-black rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  muted
                  playsInline
                />

                {/* Laser scan animation overlay */}
                {cameraActive && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    <div className="relative w-48 h-48 border-2 border-white/40 rounded-2xl">
                      {/* 4 corner brackets */}
                      <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
                      <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
                      <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />

                      {/* Moving laser bar */}
                      <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_8px_#38bdf8] animate-pulse"
                        style={{
                          position: 'absolute',
                          top: '50%',
                          transform: 'translateY(-50%)',
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Camera initializing / waiting for permission state */}
                {!cameraActive && !cameraError && (
                  <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-4 text-center space-y-3 z-5">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center animate-pulse">
                      <Camera className="w-6 h-6" />
                    </div>
                    <p className="text-xs text-slate-300 font-medium">
                      {isVietnamese ? 'Đang chuẩn bị máy ảnh...' : 'Preparing camera...'}
                    </p>
                  </div>
                )}

                {/* Camera error state */}
                {cameraError && (
                  <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-4 text-center space-y-3 z-10">
                    <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                      <Camera className="w-6 h-6" />
                    </div>
                    <div className="space-y-1 max-w-xs">
                      <p className="text-xs text-rose-300 font-bold leading-relaxed">
                        {cameraError}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        handleRequestNativePermission();
                        startCamera();
                      }}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md shadow-blue-500/20 active:scale-95"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{isVietnamese ? 'Thử lại' : 'Retry'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Error Alert */}
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              {/* Instructions */}
              <div className="text-center space-y-1">
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {isVietnamese
                    ? 'Hướng máy ảnh về phía mã QR trên màn hình Ki-ốt'
                    : 'Point your camera at the QR code on the Kiosk screen'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {isVietnamese
                    ? 'Hệ thống tự động nhận diện và yêu cầu bạn xác nhận'
                    : 'System will automatically recognize and ask for confirmation'}
                </p>
              </div>
            </div>
          )}

          {/* BƯỚC 2: CONFIRMING */}
          {step === 'CONFIRMING' && (
            <div className="space-y-5 text-center py-2 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-sm">
                <Monitor className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  {isVietnamese ? 'Xác nhận Đăng nhập Ki-ốt' : 'Confirm Kiosk Login'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {scannedSession?.deviceName || 'Kiosk Trạm Giặt Thông Minh'}
                </p>
              </div>

              {/* Account Confirmation Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-left space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center">
                    {(user?.fullName || user?.username || 'U')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {user?.fullName || user?.username || 'Hội viên'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {user?.email || user?.phone || 'Tài khoản Hội viên'}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>{isVietnamese ? 'Thiết bị trạm đã được xác thực mã hóa an toàn' : 'Secure Kiosk connection'}</span>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 text-xs">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={handleConfirmLogin}
                  disabled={submitting}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-[#0f4e7f] hover:from-blue-700 hover:to-[#0c416a] text-white text-xs font-bold shadow-md shadow-blue-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {submitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>
                    {submitting
                      ? (isVietnamese ? 'Đang gửi xác nhận...' : 'Confirming...')
                      : (isVietnamese ? 'Xác nhận Đăng nhập Ki-ốt' : 'Confirm Login')}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleRejectLogin}
                  disabled={submitting}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition"
                >
                  {isVietnamese ? 'Từ chối / Hủy' : 'Reject / Cancel'}
                </button>
              </div>
            </div>
          )}

          {/* BƯỚC 3: SUCCESS */}
          {step === 'SUCCESS' && (
            <div className="space-y-4 text-center py-6 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  {isVietnamese ? 'Đăng nhập thành công!' : 'Login Successful!'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  {isVietnamese
                    ? 'Màn hình Ki-ốt đã được mở khóa bằng tài khoản của bạn. Vui lòng thao tác tiếp trên Ki-ốt.'
                    : 'Kiosk has been unlocked with your account. You can now use the Kiosk screen.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
