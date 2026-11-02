import { describe, expect, it } from 'vitest'
import type { TodayItem } from '@/schemas/today'
import { isTaskSort, moveItem, orderTodayItems, positionUpdates } from './taskOrder'

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function item(n: number, extra: Partial<TodayItem> = {}): TodayItem {
  return { kind: 'task', id: id(n), title: `Item ${n}`, time: null, done: false, ...extra }
}

const titles = (items: TodayItem[]) => items.map((i) => i.title)

describe('orderTodayItems', () => {
  const items = [
    item(1, { priority: 'low', time: '08:00', position: 2 }),
    item(2, { priority: 'high', position: 0 }),
    item(3, { kind: 'routine', time: '07:00', position: 1 }),
    item(4, { priority: 'high', time: '09:00', done: true, position: 3 }),
    item(5, { priority: 'medium', time: '10:00', position: 4 }),
  ]

  it('time: by time, Anytime last, done at the bottom', () => {
    expect(titles(orderTodayItems(items, 'time'))).toEqual(['Item 3', 'Item 1', 'Item 5', 'Item 2', 'Item 4'])
  })

  it('priority: high → medium → low (repeating counts as medium), then by time', () => {
    expect(titles(orderTodayItems(items, 'priority'))).toEqual(['Item 2', 'Item 3', 'Item 5', 'Item 1', 'Item 4'])
  })

  it('manual: the saved positions, done still at the bottom', () => {
    expect(titles(orderTodayItems(items, 'manual'))).toEqual(['Item 2', 'Item 3', 'Item 1', 'Item 5', 'Item 4'])
  })

  it('manual: same position puts repeating first; no position goes last', () => {
    const list = [item(1), item(2, { position: 0 }), item(3, { kind: 'routine', position: 0 })]
    expect(titles(orderTodayItems(list, 'manual'))).toEqual(['Item 3', 'Item 2', 'Item 1'])
  })

  it('does not change the input array', () => {
    const copy = [...items]
    orderTodayItems(items, 'priority')
    expect(items).toEqual(copy)
  })
})

describe('moveItem', () => {
  const list = [item(1), item(2), item(3), item(4)]

  it('moves down and up', () => {
    expect(titles(moveItem(list, id(1), id(3)))).toEqual(['Item 2', 'Item 3', 'Item 1', 'Item 4'])
    expect(titles(moveItem(list, id(4), id(2)))).toEqual(['Item 1', 'Item 4', 'Item 2', 'Item 3'])
  })

  it('leaves the list alone for unknown ids or no move', () => {
    expect(titles(moveItem(list, id(9), id(2)))).toEqual(titles(list))
    expect(titles(moveItem(list, id(2), id(2)))).toEqual(titles(list))
  })
})

describe('positionUpdates', () => {
  it('returns only the items whose place changed, with their kind', () => {
    const ordered = [item(2, { position: 1 }), item(1, { kind: 'routine', position: 0 }), item(3, { position: 2 }), item(4)]
    expect(positionUpdates(ordered)).toEqual([
      { kind: 'task', id: id(2), position: 0 },
      { kind: 'routine', id: id(1), position: 1 },
      { kind: 'task', id: id(4), position: 3 },
    ])
  })
})

describe('isTaskSort', () => {
  it('accepts the three sorts only', () => {
    expect(['time', 'priority', 'manual', 'abc', null].map(isTaskSort)).toEqual([true, true, true, false, false])
  })
})
