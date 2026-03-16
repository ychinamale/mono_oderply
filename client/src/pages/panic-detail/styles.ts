const badgeBase = 'text-xs uppercase font-bold tracking-widest';

export function useStyles() {
  return {
    page:              'min-h-screen bg-slate-950 text-slate-200 p-8',
    content:           'max-w-2xl mx-auto space-y-6',
    statusRow:         'flex items-center gap-3',
    pendingBadge:      `${badgeBase} text-red-500`,
    acknowledgedBadge: `${badgeBase} text-amber-500`,
    dispatchedBadge:   `${badgeBase} text-blue-400`,
    resolvedBadge:     `${badgeBase} text-slate-500`,
    details:           'space-y-2',
    partnerName:       'text-white font-bold text-lg',
    fieldMono:         'text-slate-400 text-xs font-mono',
    metadataBlock:     'text-slate-400 text-xs font-mono bg-slate-900 p-2 rounded',
    timestamp:         'text-slate-500 text-xs font-mono',
  };
}
