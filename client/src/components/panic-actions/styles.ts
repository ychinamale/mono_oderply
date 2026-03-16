const base = 'px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 w-full mt-3';
const baseLoading = `${base} opacity-60 cursor-not-allowed`;

export function useStyles() {
  return {
    acknowledgeButton:        `${base} bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/20`,
    acknowledgeButtonLoading: `${baseLoading} bg-red-600 text-white shadow-lg shadow-red-900/20`,
    dispatchButton:           `${base} bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20`,
    dispatchButtonLoading:    `${baseLoading} bg-blue-600 text-white shadow-lg shadow-blue-900/20`,
    resolveButton:            `${base} bg-emerald-600 hover:bg-emerald-500 text-white`,
    resolveButtonLoading:     `${baseLoading} bg-emerald-600 text-white`,
    errorText:                'text-red-400 text-xs mt-1 block',
  };
}
