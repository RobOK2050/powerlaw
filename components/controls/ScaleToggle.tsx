'use client';

interface ScaleToggleProps {
  isLogScale: boolean;
  onToggle: () => void;
}

export function ScaleToggle({ isLogScale, onToggle }: ScaleToggleProps) {
  return (
    <div className="space-y-3">
      <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">Y-Axis Scale</label>
      <div className="flex rounded-lg border border-white/10 bg-zinc-900/50 p-1">
        <button
          onClick={() => !isLogScale && onToggle()}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${isLogScale ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25' : 'text-zinc-400 hover:text-white'}`}
        >
          Log Scale
        </button>
        <button
          onClick={() => isLogScale && onToggle()}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${!isLogScale ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25' : 'text-zinc-400 hover:text-white'}`}
        >
          Linear
        </button>
      </div>
      <p className="text-xs text-zinc-500">{isLogScale ? 'Log scale shows exponential growth as a straight line' : 'Linear scale shows absolute price values'}</p>
    </div>
  );
}
