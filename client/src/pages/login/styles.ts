export function useStyles() {
  return {
    page:         'min-h-screen bg-slate-950 flex items-center justify-center',
    card:         'w-full max-w-sm bg-slate-900/40 border border-slate-800 rounded-2xl p-8 space-y-6 shadow-2xl backdrop-blur-sm',
    cardHeader:   'text-center space-y-1',
    appTitle:     'text-2xl font-black text-white tracking-tight',
    subtitle:     'text-slate-500 text-xs uppercase tracking-widest font-bold',
    fieldsGroup:  'space-y-4',
    fieldLabel:   'block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2',
    input:        'w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-300 focus:outline-none focus:border-blue-500 transition-colors',
    errorText:    'text-sm text-red-400',
    submitButton: 'w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 px-4 rounded-lg text-sm transition-all duration-200 active:scale-95 shadow-lg shadow-blue-900/20',
  };
}
