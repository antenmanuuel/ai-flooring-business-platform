// Shared by the Clients list and the client detail page.

export const statusBadge = {
  pending: { label: 'Pending Approval', className: 'bg-copper/10 text-copper' },
  active: { label: 'Active', className: 'bg-sand text-ink' },
  disabled: { label: 'Disabled', className: 'bg-red-50 text-red-700' },
}

export const plainButton = 'rounded-md border border-line bg-white px-3.5 py-2 text-sm hover:border-ink/30'
export const darkButton = 'rounded-md bg-espresso px-3.5 py-2 text-sm text-white hover:bg-espresso-dark'
export const redButton = 'rounded-md border border-red-300 bg-white px-3.5 py-2 text-sm text-red-700 hover:border-red-500'

export const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
