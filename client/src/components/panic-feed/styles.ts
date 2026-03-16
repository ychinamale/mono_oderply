const asideBase = 'w-80 border-r border-slate-900 flex flex-col bg-slate-950/50 h-full';
const feedHeaderBase = 'p-4 border-b border-slate-900 flex items-center justify-between';

export function useStyles() {
  return {
    sidebar:      asideBase,
    header:       feedHeaderBase,
    feedTitle:    'text-lg font-bold text-white',
    liveGroup:    'flex items-center gap-2',
    idleDot:      'w-2 h-2 rounded-full bg-slate-700',
    liveDot:      'w-2 h-2 rounded-full bg-red-500 animate-pulse',
    liveLabel:    'text-[10px] text-slate-500 font-bold uppercase tracking-widest',
    skeletonList: 'flex-1 p-4 space-y-2',
    skeletonItem: 'animate-pulse bg-slate-800 rounded-xl h-20',
    errorAlert:   'text-red-400 p-4 text-sm',
    feedList:     'flex-1 overflow-y-auto p-4',
  };
}
