import { AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { useState, useEffect, useRef } from 'react';

import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';
import { Scene6 } from './video_scenes/Scene6';
import { CursorPointer } from './CursorPointer';

export const SCENE_DURATIONS = {
  s1: 8000,
  s2: 8000,
  s3: 12000,
  s4: 10000,
  s5: 14000,
  s6: 10000,
};

const SCENE_START_SEC: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  let cumulativeMs = 0;
  for (const [key, ms] of Object.entries(SCENE_DURATIONS)) {
    out[key] = cumulativeMs / 1000;
    cumulativeMs += ms;
  }
  return out;
})();

const AUDIO_SEEK_EPSILON_SEC = 0.18;

type SceneProps = {
  setCursorPos: (p: { x: string; y: string }) => void;
  setIsClicking: (v: boolean) => void;
};

const SCENE_COMPONENTS: Record<string, React.ComponentType<SceneProps>> = {
  s1: Scene1,
  s2: Scene2,
  s3: Scene3,
  s4: Scene4,
  s5: Scene5,
  s6: Scene6,
};

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  muted = false,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  muted?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentSceneKey } = useVideoPlayer({ durations, loop });
  const [cursorPos, setCursorPos] = useState({ x: '50vw', y: '50vh' });
  const [isClicking, setIsClicking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '') as keyof typeof SCENE_DURATIONS;
  const sceneIndex = Object.keys(SCENE_DURATIONS).indexOf(baseSceneKey);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.45;
    const targetTime = SCENE_START_SEC[baseSceneKey] ?? 0;
    if (Math.abs(audio.currentTime - targetTime) > AUDIO_SEEK_EPSILON_SEC) {
      audio.currentTime = targetTime;
    }
    audio.play().catch(() => {});
  }, [currentSceneKey, baseSceneKey]);

  let activeNav = 'Dashboard';
  if (sceneIndex === 3 || sceneIndex === 4) activeNav = 'Analytics';
  if (sceneIndex === 5) activeNav = 'Assignments';

  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  return (
    <div className="w-full h-screen flex overflow-hidden bg-background">
      {/* Sidebar - persists across all scenes */}
      <div className="w-64 h-full border-r border-border bg-white flex flex-col pt-8 pb-4 shrink-0 z-20 shadow-sm relative">
        <div className="px-6 mb-8 flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary text-white flex items-center justify-center font-serif text-xl rounded">E1</div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {['Dashboard', 'Assignments', 'Analytics'].map((nav) => (
            <div
              key={nav}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                activeNav === nav ? 'bg-primary text-white' : 'text-muted-foreground'
              }`}
            >
              {nav}
            </div>
          ))}
        </nav>

        <div className="px-6 mt-auto">
          <div className="text-xs text-muted-foreground uppercase font-semibold">Ethics Course MVP</div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 h-full relative">
        <AnimatePresence mode="popLayout">
          {SceneComponent && (
            <SceneComponent
              key={currentSceneKey}
              setCursorPos={setCursorPos}
              setIsClicking={setIsClicking}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Global Cursor */}
      <CursorPointer x={cursorPos.x} y={cursorPos.y} isClicking={isClicking} />

      <audio
        ref={audioRef}
        src={`${import.meta.env.BASE_URL}audio/bg_music.mp3`}
        preload="auto"
        autoPlay
        muted={muted}
      />
    </div>
  );
}
