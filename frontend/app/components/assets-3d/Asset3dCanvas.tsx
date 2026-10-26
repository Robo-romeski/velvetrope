'use client';

import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  Bounds,
  Html,
  OrbitControls,
  useAnimations,
  useBounds,
  useGLTF,
  useProgress,
} from '@react-three/drei';
import {
  Group,
  LoopRepeat,
  Mesh,
  MeshStandardMaterial,
  SRGBColorSpace,
} from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { Button, Select, cn } from '@/app/components/ui';

type ClipInfo = { name: string; duration: number };
type SeekRequest = { value: number; nonce: number };

class ViewerErrorBoundary extends Component<
  {
    children: ReactNode;
    fallback: ReactNode;
  },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo): void {
    // The visible recovery state is intentional; loader details stay in devtools.
    void _error;
    void _info;
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function LoadingModel() {
  const { progress, loaded, total } = useProgress();
  return (
    <Html center>
      <div
        className="min-w-48 rounded-md border border-border bg-surface/95 px-4 py-3 text-center shadow-card"
        role="status"
      >
        <div className="text-sm font-semibold text-foreground">
          Loading model
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
          <div
            className="h-full bg-accent transition-[width]"
            style={{ width: `${Math.max(3, progress)}%` }}
          />
        </div>
        <div className="mt-2 text-xs tabular-nums text-muted">
          {Math.round(progress)}%
          {total > 0 ? ` · ${loaded}/${total} files` : ''}
        </div>
      </div>
    </Html>
  );
}

function Model({
  url,
  selectedClip,
  playing,
  playbackRate,
  seek,
  resetSignal,
  onClips,
  onTime,
}: {
  url: string;
  selectedClip: string;
  playing: boolean;
  playbackRate: number;
  seek: SeekRequest;
  resetSignal: number;
  onClips: (clips: ClipInfo[]) => void;
  onTime: (time: number) => void;
}) {
  const group = useRef<Group>(null);
  const bounds = useBounds();
  const gltf = useGLTF(url);
  const scene = useMemo(() => clone(gltf.scene), [gltf.scene]);
  const { actions, mixer } = useAnimations(gltf.animations, group);
  const lastTimeUpdate = useRef(0);

  useEffect(() => {
    scene.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      materials.forEach((material) => {
        if (!(material instanceof MeshStandardMaterial)) return;
        if (material.map) material.map.colorSpace = SRGBColorSpace;
        material.needsUpdate = true;
      });
    });
  }, [scene]);

  useEffect(() => {
    onClips(
      gltf.animations.map((clip) => ({
        name: clip.name || `Animation ${gltf.animations.indexOf(clip) + 1}`,
        duration: clip.duration,
      })),
    );
  }, [gltf.animations, onClips]);

  useLayoutEffect(() => {
    if (!group.current) return;
    bounds.refresh(group.current).clip().fit();
  }, [bounds, resetSignal, scene]);

  useEffect(() => {
    Object.values(actions).forEach((action) => action?.stop());
    const action = actions[selectedClip];
    if (!action) return;
    action.reset().setLoop(LoopRepeat, Infinity).play();
    return () => {
      action.stop();
    };
  }, [actions, selectedClip]);

  useEffect(() => {
    const action = actions[selectedClip];
    if (!action) return;
    action.setEffectiveTimeScale(playing ? playbackRate : 0);
  }, [actions, playbackRate, playing, selectedClip]);

  useEffect(() => {
    const action = actions[selectedClip];
    if (!action) return;
    const time = Math.min(
      action.getClip().duration,
      Math.max(0, seek.value),
    );
    mixer.setTime(time);
    onTime(time);
  }, [actions, mixer, onTime, seek, selectedClip]);

  useFrame(({ clock }) => {
    const action = actions[selectedClip];
    if (!action || !playing) return;
    if (clock.elapsedTime - lastTimeUpdate.current < 0.1) return;
    lastTimeUpdate.current = clock.elapsedTime;
    onTime(action.time);
  });

  return (
    <group ref={group} dispose={null}>
      <primitive object={scene} />
    </group>
  );
}

function ModelFailure({
  title,
  thumbnailUrl,
}: {
  title: string;
  thumbnailUrl?: string | null;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-surface-subtle">
      {thumbnailUrl && (
        // Signed object-storage URLs are intentionally rendered without Next image optimization.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailUrl}
          alt=""
          className="absolute inset-0 size-full object-cover opacity-20"
        />
      )}
      <div className="relative max-w-md px-6 text-center">
        <div className="font-display text-2xl font-semibold text-foreground">
          Preview unavailable
        </div>
        <p className="mt-2 text-sm leading-6 text-muted">
          {title} could not be opened. The file may be corrupted or use an
          unsupported glTF extension. Try reloading or ask an administrator to
          replace the model.
        </p>
      </div>
    </div>
  );
}

function formatTime(value: number) {
  if (!Number.isFinite(value)) return '0:00';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default function Asset3dCanvas({
  modelUrl,
  thumbnailUrl,
  title,
}: {
  modelUrl: string;
  thumbnailUrl?: string | null;
  title: string;
}) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [clips, setClips] = useState<ClipInfo[]>([]);
  const [selectedClip, setSelectedClip] = useState('');
  const [playing, setPlaying] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [seek, setSeek] = useState<SeekRequest>({ value: 0, nonce: 0 });
  const [resetSignal, setResetSignal] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [expandedFallback, setExpandedFallback] = useState(false);

  const handleClips = useCallback((next: ClipInfo[]) => {
    setClips(next);
    setSelectedClip((current) =>
      next.some((clip) => clip.name === current)
        ? current
        : (next[0]?.name ?? ''),
    );
    setPlaying(next.length > 0);
    setCurrentTime(0);
  }, []);

  const handleTime = useCallback((time: number) => setCurrentTime(time), []);
  const activeClip = clips.find((clip) => clip.name === selectedClip);

  useEffect(() => {
    const onFullscreenChange = () => {
      setFullscreen(document.fullscreenElement === viewerRef.current);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () =>
      document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!viewerRef.current) return;
    if (document.fullscreenElement === viewerRef.current) {
      await document.exitFullscreen();
      return;
    }
    if (expandedFallback) {
      setExpandedFallback(false);
      return;
    }
    try {
      await viewerRef.current.requestFullscreen();
      if (document.fullscreenElement !== viewerRef.current) {
        setExpandedFallback(true);
      }
    } catch {
      setExpandedFallback(true);
    }
  };

  const fullscreenActive = fullscreen || expandedFallback;

  return (
    <div
      ref={viewerRef}
      className={cn(
        'relative flex min-h-[32rem] flex-col bg-[#ebe8f2]',
        fullscreenActive &&
          'fixed inset-0 z-[100] h-screen min-h-screen w-screen',
      )}
    >
      <div
        className="relative h-[20rem] min-h-[20rem] flex-1 sm:h-[24rem] sm:min-h-[24rem]"
        aria-label={`3D view of ${title}`}
      >
        <div className="absolute inset-0">
          <ViewerErrorBoundary
            key={modelUrl}
            fallback={
              <ModelFailure title={title} thumbnailUrl={thumbnailUrl} />
            }
          >
            <Canvas
              camera={{
                fov: 42,
                position: [3, 2, 4],
                near: 0.01,
                far: 10_000,
              }}
              dpr={[1, 2]}
              gl={{ antialias: true, alpha: false }}
              style={{ touchAction: 'none' }}
            >
              <color attach="background" args={['#ebe8f2']} />
              <ambientLight intensity={0.35} />
              <hemisphereLight
                args={['#fffaf6', '#706b82', 0.8]}
                position={[0, 4, 0]}
              />
              <directionalLight
                color="#fff4ed"
                position={[4, 7, 6]}
                intensity={2.35}
              />
              <directionalLight
                color="#dce8ff"
                position={[-4, 3, 3]}
                intensity={0.75}
              />
              <directionalLight
                color="#ffe2ef"
                position={[2, 4, -5]}
                intensity={1.05}
              />
              <Suspense fallback={<LoadingModel />}>
                <Bounds fit clip observe margin={1.2}>
                  <Model
                    url={modelUrl}
                    selectedClip={selectedClip}
                    playing={playing}
                    playbackRate={playbackRate}
                    seek={seek}
                    resetSignal={resetSignal}
                    onClips={handleClips}
                    onTime={handleTime}
                  />
                </Bounds>
              </Suspense>
              <OrbitControls
                makeDefault
                enableDamping
                dampingFactor={0.08}
                enablePan
                enableZoom
                minDistance={0.01}
                maxDistance={10_000}
                screenSpacePanning
              />
            </Canvas>
          </ViewerErrorBoundary>
        </div>
      </div>

      <div className="border-t border-border bg-surface px-3 py-3 sm:px-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setResetSignal((value) => value + 1)}
          >
            Reset view
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => void toggleFullscreen()}
          >
            {fullscreenActive ? 'Exit fullscreen' : 'Fullscreen'}
          </Button>
          <span className="ml-auto text-xs text-muted">
            Drag to rotate · Scroll or pinch to zoom · Shift-drag or two-finger
            drag to pan
          </span>
        </div>

        {clips.length > 0 && activeClip && (
          <div className="mt-3 grid gap-3 border-t border-border pt-3 sm:grid-cols-[auto_minmax(10rem,16rem)_minmax(10rem,1fr)_auto] sm:items-center">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setPlaying((value) => !value)}
            >
              {playing ? 'Pause' : 'Play'}
            </Button>
            <Select
              aria-label="Animation"
              value={selectedClip}
              onChange={(event) => {
                setSelectedClip(event.target.value);
                setCurrentTime(0);
                setPlaying(true);
              }}
            >
              {clips.map((clip) => (
                <option key={clip.name} value={clip.name}>
                  {clip.name}
                </option>
              ))}
            </Select>
            <label className="flex items-center gap-2 text-xs tabular-nums text-muted">
              <span className="w-9 text-right">{formatTime(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={activeClip.duration}
                step={0.01}
                value={Math.min(currentTime, activeClip.duration)}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setCurrentTime(value);
                  setSeek((current) => ({
                    value,
                    nonce: current.nonce + 1,
                  }));
                }}
                className="min-w-0 flex-1 accent-accent"
                aria-label="Animation position"
              />
              <span className="w-9">
                {formatTime(activeClip.duration)}
              </span>
            </label>
            <Select
              aria-label="Playback speed"
              value={playbackRate}
              onChange={(event) => setPlaybackRate(Number(event.target.value))}
              className="sm:w-24"
            >
              <option value={0.5}>0.5×</option>
              <option value={1}>1×</option>
              <option value={1.5}>1.5×</option>
              <option value={2}>2×</option>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
