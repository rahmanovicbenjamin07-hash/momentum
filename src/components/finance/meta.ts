export const FINANCE_TABS = [
  { key: 'logs', label: 'Logs' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
  { key: 'savings', label: 'Savings' },
] as const
export type FinanceTab = (typeof FINANCE_TABS)[number]['key']

export const isFinanceTab = (value: unknown): value is FinanceTab => FINANCE_TABS.some((t) => t.key === value)

/** Id of each tab button, so the panel can be labelled by it. */
export const financeTabId = (tab: FinanceTab) => `finance-tab-${tab}`

/** Id of the one panel under the tabs. */
export const FINANCE_PANEL_ID = 'finance-panel'
