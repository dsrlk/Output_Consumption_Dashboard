import './animations.css';

/* Three independent aurora layers — dark void bg with crimson + amber pulse */
export const Aurora = () => (
  <div className="aurora-container" aria-hidden="true">
    <div className="aurora-layer-1" />
    <div className="aurora-layer-2" />
    <div className="aurora-layer-3" />
    <div className="aurora-noise" />
  </div>
);
