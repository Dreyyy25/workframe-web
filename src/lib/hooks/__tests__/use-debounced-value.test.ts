import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDebouncedValue } from '../use-debounced-value'

describe('useDebouncedValue', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('only surfaces the latest value after the delay', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 350), {
      initialProps: { v: 'a' },
    })
    expect(result.current).toBe('a') // initial value passes through immediately
    rerender({ v: 'ab' })
    rerender({ v: 'abc' })
    expect(result.current).toBe('a')
    act(() => vi.advanceTimersByTime(349))
    expect(result.current).toBe('a')
    act(() => vi.advanceTimersByTime(1))
    expect(result.current).toBe('abc')
  })
})
