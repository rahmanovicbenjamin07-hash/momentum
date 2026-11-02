import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { SettingsSection } from './meta'
import { SettingsTabs } from './SettingsTabs'

describe('SettingsTabs', () => {
  it('marks the open tab and reports clicks', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn<(section: SettingsSection) => void>()
    render(<SettingsTabs active="appearance" onSelect={onSelect} />)
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'Appearance',
      'Date & time',
      'Notifications',
      'Data & backups',
      'Integrations',
    ])
    expect(screen.getByRole('tab', { name: 'Appearance' })).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('tab', { name: 'Notifications' }))
    expect(onSelect).toHaveBeenCalledWith('notifications')
  })

  it('moves with the arrow keys, wrapping at the ends', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn<(section: SettingsSection) => void>()
    render(<SettingsTabs active="appearance" onSelect={onSelect} />)
    screen.getByRole('tab', { name: 'Appearance' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(onSelect).toHaveBeenLastCalledWith('datetime')
    await user.keyboard('{ArrowLeft}')
    expect(onSelect).toHaveBeenLastCalledWith('integrations')
  })
})
