import { useEffect, useRef } from 'react';
import AudioMotionAnalyzer from 'audiomotion-analyzer';
import { getStrudelAnalyser, getStrudelAudioContext } from '../strudel/engine';

type StageVisualizerProps = {
  /** Show + animate the bars. False keeps the component mounted but idle. */
  active: boolean;
};

/**
 * Frequency-bar visualizer rendered along the inside-bottom of the stage
 * proscenium. Plugs into the same side-branch AnalyserNode that powers
 * the performer aura and beat-synced marquee (exposed via
 * `getStrudelAnalyser`) - one analyser, many consumers.
 *
 * Loaded lazily by `TalentStage` so the ~30 kB audiomotion-analyzer
 * payload only hits the wire on first playback.
 */
export default function StageVisualizer({ active }: StageVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instRef = useRef<AudioMotionAnalyzer | null>(null);

  useEffect(() => {
    if (!active || !containerRef.current || instRef.current) return;
    const ctx = getStrudelAudioContext();
    const node = getStrudelAnalyser();
    if (!ctx || !node) return;
    try {
      instRef.current = new AudioMotionAnalyzer(containerRef.current, {
        audioCtx: ctx,
        source: node,
        // Strudel already wires every source to ctx.destination; we only want
        // to *observe* the analyser here. Leaving this at the default true
        // adds a second source -> analyser -> AudioMotion -> destination path
        // alongside Strudel's direct one, and the small group delay between
        // the two summed copies sounds as background comb-filter static.
        connectSpeakers: false,
        mode: 6,                  // 1/12 octave bands - dense, musical
        gradient: 'rainbow',
        showBgColor: false,
        overlay: true,
        showScaleX: false,
        showScaleY: false,
        showPeaks: false,
        smoothing: 0.7,
        barSpace: 0.25,
        lumiBars: true,           // bars-as-gradient, looks great on dark
      });
    } catch {
      // analyser may be unavailable in some sandboxes / privacy modes -
      // fail soft; the show still works without the viz.
    }
    return () => {
      instRef.current?.destroy();
      instRef.current = null;
    };
  }, [active]);

  return (
    <div
      ref={containerRef}
      className={`stage-visualizer${active ? ' is-active' : ''}`}
      aria-hidden="true"
    />
  );
}
