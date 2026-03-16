export function useStyles() {
  return {
    page:         'flex h-screen bg-slate-950 text-slate-200 overflow-hidden',
    column:       'flex flex-col flex-1 overflow-hidden',
    header:       'h-16 border-b border-slate-900 flex items-center justify-between px-8 bg-slate-950/80 shrink-0',
    appTitle:     'text-xl font-bold text-white',
    headerRight:  'flex items-center gap-4',
    operatorName: 'text-slate-400 text-sm font-mono',
    logoutButton: 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors',
    content:      'flex flex-1 overflow-hidden',
  };
}
