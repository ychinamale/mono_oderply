export const PanicStatus = {
  PENDING: 'PENDING',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  DISPATCHED: 'DISPATCHED',
  RESOLVED: 'RESOLVED',
} as const;

export type PanicStatus = (typeof PanicStatus)[keyof typeof PanicStatus];
