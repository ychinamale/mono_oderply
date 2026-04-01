export function assertTransition(currentStatus: string, requiredStatus: string, action: string): void {
  if (currentStatus !== requiredStatus) {
    const err = new Error(`Cannot ${action} a panic with status ${currentStatus}`) as Error & { statusCode: number }
    err.statusCode = 400
    throw err
  }
}
