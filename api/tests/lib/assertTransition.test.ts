import { assertTransition } from '../../src/lib/assertTransition.js'

describe('assertTransition', () => {
  it('assertTransition returns a 400 with a descriptive message on any invalid transition', () => {
    // acknowledge: requires PENDING
    expect(() => assertTransition('ACKNOWLEDGED', 'PENDING', 'acknowledge')).toThrow(
      'Cannot acknowledge a panic with status ACKNOWLEDGED',
    )
    expect(() => assertTransition('DISPATCHED', 'PENDING', 'acknowledge')).toThrow(
      'Cannot acknowledge a panic with status DISPATCHED',
    )
    expect(() => assertTransition('RESOLVED', 'PENDING', 'acknowledge')).toThrow(
      'Cannot acknowledge a panic with status RESOLVED',
    )

    // dispatch: requires ACKNOWLEDGED
    expect(() => assertTransition('PENDING', 'ACKNOWLEDGED', 'dispatch')).toThrow(
      'Cannot dispatch a panic with status PENDING',
    )
    expect(() => assertTransition('DISPATCHED', 'ACKNOWLEDGED', 'dispatch')).toThrow(
      'Cannot dispatch a panic with status DISPATCHED',
    )
    expect(() => assertTransition('RESOLVED', 'ACKNOWLEDGED', 'dispatch')).toThrow(
      'Cannot dispatch a panic with status RESOLVED',
    )

    // resolve: requires DISPATCHED
    expect(() => assertTransition('PENDING', 'DISPATCHED', 'resolve')).toThrow(
      'Cannot resolve a panic with status PENDING',
    )
    expect(() => assertTransition('ACKNOWLEDGED', 'DISPATCHED', 'resolve')).toThrow(
      'Cannot resolve a panic with status ACKNOWLEDGED',
    )
    expect(() => assertTransition('RESOLVED', 'DISPATCHED', 'resolve')).toThrow(
      'Cannot resolve a panic with status RESOLVED',
    )
  })

  it('does not throw when currentStatus matches requiredStatus', () => {
    expect(() => assertTransition('PENDING', 'PENDING', 'acknowledge')).not.toThrow()
    expect(() => assertTransition('ACKNOWLEDGED', 'ACKNOWLEDGED', 'dispatch')).not.toThrow()
    expect(() => assertTransition('DISPATCHED', 'DISPATCHED', 'resolve')).not.toThrow()
  })
})
