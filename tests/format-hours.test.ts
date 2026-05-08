import { describe, it, expect } from 'vitest'
import { formatHoursLabel } from '../src/lib/format-hours'

describe('formatHoursLabel', () => {
  it('formats zero as 0m', () => {
    expect(formatHoursLabel(0)).toBe('0m')
  })

  it('formats sub-hour values as minutes', () => {
    expect(formatHoursLabel(1)).toBe('1m')
    expect(formatHoursLabel(45)).toBe('45m')
    expect(formatHoursLabel(59)).toBe('59m')
  })

  it('formats exactly 60 as 1h', () => {
    expect(formatHoursLabel(60)).toBe('1h')
  })

  it('formats whole hours without minute suffix', () => {
    expect(formatHoursLabel(120)).toBe('2h')
    expect(formatHoursLabel(180)).toBe('3h')
  })

  it('formats mixed hours and minutes', () => {
    expect(formatHoursLabel(75)).toBe('1h 15m')
    expect(formatHoursLabel(195)).toBe('3h 15m')
    expect(formatHoursLabel(61)).toBe('1h 1m')
  })

  it('rounds fractional minutes', () => {
    expect(formatHoursLabel(60.4)).toBe('1h')
    expect(formatHoursLabel(60.6)).toBe('1h 1m')
  })

  it('returns 0m for invalid input', () => {
    expect(formatHoursLabel(-5)).toBe('0m')
    expect(formatHoursLabel(NaN)).toBe('0m')
    expect(formatHoursLabel(Infinity)).toBe('0m')
  })
})
