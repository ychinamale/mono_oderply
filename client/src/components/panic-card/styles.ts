const cardBase = 'p-4 border-l-4 mb-2 rounded-r-xl border-y border-r border-transparent';
const badgeBase = 'text-[10px] uppercase font-bold tracking-widest';

export function useStyles() {
  return {
    link:              'block',
    pendingCard:       `${cardBase} border-l-red-500 bg-red-500/5`,
    acknowledgedCard:  `${cardBase} border-l-amber-500 bg-amber-500/5`,
    dispatchedCard:    `${cardBase} border-l-blue-500 bg-blue-500/5`,
    resolvedCard:      `${cardBase} border-l-slate-500 bg-slate-500/5`,
    pendingBadge:      `${badgeBase} text-red-500`,
    acknowledgedBadge: `${badgeBase} text-amber-500`,
    dispatchedBadge:   `${badgeBase} text-blue-400`,
    resolvedBadge:     `${badgeBase} text-slate-500`,
    cardRow:           'flex justify-between items-center mb-1',
    cardTimestamp:     'text-slate-500 text-[10px] font-mono',
    partnerName:       'text-white font-bold text-sm truncate',
    coords:            'text-slate-400 text-xs mt-1 font-mono',
  };
}
