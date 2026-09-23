'use client';

import { useEffect, useRef, useState } from 'react';

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
};

function getBarcodeDetector(): BarcodeDetectorLike | null {
  const Detector = (
    window as Window & {
      BarcodeDetector?: new (opts?: { formats: string[] }) => BarcodeDetectorLike;
    }
  ).BarcodeDetector;
  if (!Detector) return null;
  try {
    return new Detector({ formats: ['qr_code'] });
  } catch {
    return null;
  }
}

export default function QrCamera({ onCode }: { onCode: (value: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onCodeRef = useRef(onCode);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  onCodeRef.current = onCode;

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let timer: number | undefined;

    (async () => {
      const detector = getBarcodeDetector();
      if (!detector) {
        setError('Camera QR scanning is not supported in this browser. Paste the token instead.');
        setActive(false);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        const scan = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const value = codes[0]?.rawValue?.trim();
            if (value) {
              onCodeRef.current(value);
              setActive(false);
              return;
            }
          } catch {
            // keep scanning
          }
          timer = window.setTimeout(scan, 250);
        };
        timer = window.setTimeout(scan, 250);
      } catch {
        if (!cancelled) {
          setError('Could not open the camera. Paste the token instead.');
          setActive(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [active]);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => {
          setError(null);
          setActive((value) => !value);
        }}
        className="px-4 py-2 border rounded text-sm"
      >
        {active ? 'Stop camera' : 'Scan with camera'}
      </button>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <video
        ref={videoRef}
        className={active ? 'w-full max-w-sm rounded border bg-black' : 'hidden'}
        playsInline
        muted
      />
    </div>
  );
}
