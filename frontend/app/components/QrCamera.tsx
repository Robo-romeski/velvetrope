'use client';

import { useEffect, useRef, useState } from 'react';
import { Alert, Button } from '@/app/components/ui';

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

  useEffect(() => {
    onCodeRef.current = onCode;
  }, [onCode]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let timer: number | undefined;
    const videoElement = videoRef.current;

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
        if (!videoElement) return;
        videoElement.srcObject = stream;
        await videoElement.play();

        const scan = async () => {
          if (cancelled || !videoElement) return;
          try {
            const codes = await detector.detect(videoElement);
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
      if (videoElement) videoElement.srcObject = null;
    };
  }, [active]);

  return (
    <div className="space-y-4">
      <Button
        type="button"
        onClick={() => {
          setError(null);
          setActive((value) => !value);
        }}
        variant="secondary"
      >
        {active ? 'Stop camera' : 'Scan with camera'}
      </Button>
      {error && (
        <Alert tone="danger" role="alert">
          {error}
        </Alert>
      )}
      <video
        ref={videoRef}
        className={
          active
            ? 'aspect-square w-full max-w-sm rounded-2xl border border-border bg-black object-cover'
            : 'hidden'
        }
        playsInline
        muted
      />
    </div>
  );
}
