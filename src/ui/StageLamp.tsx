type StageLampProps = {
  active: boolean;
};

/**
 * Decorative stage lamp that hangs from the venue arch and tracks the
 * hovered/focused nav button. All motion is driven by CSS variables written
 * by the parent (`VenueMap`) onto `.venue-map` - this component is pure
 * structure + styling so React never re-renders on mouse move.
 */
export function StageLamp({ active }: StageLampProps) {
  return (
    <div
      className={`stage-lamp${active ? ' is-active' : ''}`}
      aria-hidden="true"
    >
      <div className="stage-lamp-rod" />
      <div className="stage-lamp-body">
        <div className="stage-lamp-yoke" />
        <div className="stage-lamp-lens" />
      </div>
      <div className="stage-lamp-cone" />
    </div>
  );
}
