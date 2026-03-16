export function useStyles() {
  return {
    sectionLabel:       'text-slate-400 text-xs uppercase font-bold tracking-widest mb-3',
    logList:            'space-y-2',
    logRow:             'text-xs font-mono text-slate-400 flex gap-2 items-center',
    operatorTransition: 'text-blue-400',
    partnerTransition:  'text-amber-400',
    actor:              'text-slate-500',
    logTime:            'text-slate-600',
    paginationRow:      'flex gap-2 mt-3',
    paginationButton:   'text-xs text-slate-400 disabled:opacity-40',
    pageIndicator:      'text-xs text-slate-500',
  };
}
