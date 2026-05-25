import { useState } from 'react';
import {
  SOUND_PALETTE,
  STRUDEL_SNIPPET_MIME,
  type SoundChip,
} from '../studio/sounds';

export type SoundPaletteProps = {
  /** Plays the chip's snippet briefly so the user can audition before dragging. */
  onAudition?: (chip: SoundChip) => void | Promise<void>;
};

export function SoundPalette({ onAudition }: SoundPaletteProps) {
  const [previewing, setPreviewing] = useState<string | null>(null);

  const handleDragStart = (
    event: React.DragEvent<HTMLButtonElement>,
    chip: SoundChip,
  ) => {
    const dt = event.dataTransfer;
    dt.effectAllowed = 'copy';
    // Custom MIME for our own drop handler - survives only intra-app drags.
    dt.setData(STRUDEL_SNIPPET_MIME, chip.snippet);
    // Plain-text fallback so the snippet still drops cleanly on Safari mobile
    // or any host that doesn't preserve the custom MIME.
    dt.setData('text/plain', chip.snippet);
  };

  const handleClick = async (chip: SoundChip) => {
    if (!onAudition) return;
    setPreviewing(chip.name);
    try {
      await onAudition(chip);
    } finally {
      // Pulse window matches the audition stop timer in Studio (~600 ms).
      window.setTimeout(() => {
        setPreviewing((cur) => (cur === chip.name ? null : cur));
      }, 700);
    }
  };

  return (
    <div className="sound-palette" role="toolbar" aria-label="Sound palette">
      <span className="sound-palette-label">Sounds</span>
      <div className="sound-palette-chips">
        {SOUND_PALETTE.map((chip) => (
          <button
            key={chip.name}
            type="button"
            draggable
            onDragStart={(e) => handleDragStart(e, chip)}
            onClick={() => handleClick(chip)}
            className={`sound-chip ${chip.kind}${
              previewing === chip.name ? ' previewing' : ''
            }`}
            title={`Drag into editor - or click to audition ${chip.snippet}`}
            aria-label={`${chip.label} (${chip.kind}). Drag to insert ${chip.snippet} into the editor, or click to audition.`}
          >
            <span className="sound-chip-name">{chip.name}</span>
            <span className="sound-chip-label">{chip.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
