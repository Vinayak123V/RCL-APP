/**
 * useQRScanner — unified QR scanner hook.
 *
 * Android / iOS (Capacitor native):
 *   @capacitor-mlkit/barcode-scanning — BarcodeScanner.scan()
 *   Opens a full-screen native scanner UI with real-time auto-detection.
 *   No WebView camera preview needed — the plugin handles everything.
 *
 * Browser (Chrome / Edge):
 *   navigator.mediaDevices.getUserMedia + jsQR frame-by-frame decode.
 */
import { useRef, useCallback, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  BarcodeScanner,
  BarcodeFormat,
} from '@capacitor-mlkit/barcode-scanning';
import jsQR from 'jsqr';

export interface QRDevice {
  deviceId: string;
  mac: string;
  name?: string;
}

export type ScannerState = 'idle' | 'requesting' | 'scanning' | 'denied' | 'error';

export const isNative = Capacitor.isNativePlatform();

// ─── QR payload parser ────────────────────────────────────────────────────────
export function parseQRPayload(raw: string): QRDevice | null {
  const trimmed = raw.trim();

  try {
    const obj = JSON.parse(trimmed);
    const mac = obj.mac ?? obj.address ?? obj.MAC ?? '';
    const deviceId = obj.device_id ?? obj.deviceId ?? obj.id ?? mac;
    if (mac && /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(mac)) {
      return { deviceId: String(deviceId), mac, name: obj.name };
    }
  } catch { /* not JSON */ }

  if (/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(trimmed)) {
    return { deviceId: trimmed, mac: trimmed };
  }

  if (trimmed.length > 4 && trimmed.length < 64) {
    return { deviceId: trimmed, mac: trimmed };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────

export function useQRScanner() {
  // Web-only refs
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef    = useRef<number | null>(null);

  const [state, setState]   = useState<ScannerState>('idle');
  const [result, setResult] = useState<QRDevice | null>(null);
  const [error, setError]   = useState<string>('');

  // ── Web: stop camera stream ───────────────────────────────────────────────
  const stopStream = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // ── Web: frame-by-frame QR decode ────────────────────────────────────────
  const tick = useCallback((onFound: (d: QRDevice) => void) => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(() => tick(onFound));
      return;
    }
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });
    if (code?.data) {
      const parsed = parseQRPayload(code.data);
      if (parsed) {
        stopStream();
        setState('idle');
        setResult(parsed);
        onFound(parsed);
        return;
      }
    }
    rafRef.current = requestAnimationFrame(() => tick(onFound));
  }, [stopStream]);

  // ── Main: startScanner ────────────────────────────────────────────────────
  const startScanner = useCallback(async (onFound: (d: QRDevice) => void) => {
    setResult(null);
    setError('');
    setState('requesting');

    // ── NATIVE: MLKit full-screen scanner ────────────────────────────────
    if (isNative) {
      try {
        // 1. Request camera permission
        const { camera } = await BarcodeScanner.requestPermissions();
        if (camera !== 'granted' && camera !== 'limited') {
          setState('denied');
          setError('Camera permission denied. Please allow it in Settings.');
          return;
        }

        // 2. Ensure Google Barcode Scanner module is installed (Android only)
        //    This is a one-time ~3 MB download; on iOS it's built-in.
        try {
          const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
          if (!available) {
            setState('scanning'); // show "preparing" state while downloading
            await BarcodeScanner.installGoogleBarcodeScannerModule();
          }
        } catch { /* iOS doesn't have this method — ignore */ }

        setState('scanning');

        // 3. Open the native full-screen QR scanner.
        //    scan() blocks until the user scans a code or cancels.
        const { barcodes } = await BarcodeScanner.scan({
          formats: [BarcodeFormat.QrCode],
        });

        setState('idle');

        if (barcodes.length === 0) {
          // User cancelled — no error needed
          return;
        }

        // 4. Parse the first detected QR code
        const raw = barcodes[0].rawValue ?? barcodes[0].displayValue ?? '';
        const parsed = parseQRPayload(raw);

        if (parsed) {
          setResult(parsed);
          onFound(parsed);
        } else {
          setState('error');
          setError('Invalid QR code. Please scan a valid BMS device QR.');
        }
      } catch (err: any) {
        setState('idle');
        const msg: string = err?.message ?? '';
        // User cancelled — not an error
        if (!msg.toLowerCase().includes('cancel') && !msg.toLowerCase().includes('dismiss')) {
          setState('error');
          setError(msg || 'Scanner error. Please try again.');
        }
      }
      return;
    }

    // ── BROWSER: getUserMedia + jsQR ─────────────────────────────────────
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('error');
      setError('Camera not supported in this browser');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }
      setState('scanning');
      rafRef.current = requestAnimationFrame(() => tick(onFound));
    } catch (err: any) {
      stopStream();
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setState('denied');
        setError('Camera permission denied');
      } else {
        setState('error');
        setError('Could not access camera');
      }
    }
  }, [tick, stopStream]);

  // ── stopScanner ───────────────────────────────────────────────────────────
  const stopScanner = useCallback(() => {
    stopStream();
    setState('idle');
    setError('');
    // Note: BarcodeScanner.scan() is a blocking call — it can't be cancelled
    // from outside. The user must press the native back/cancel button.
  }, [stopStream]);

  return { videoRef, canvasRef, state, result, error, startScanner, stopScanner };
}
