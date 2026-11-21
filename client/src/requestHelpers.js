// Shared by every page that shows quote requests (admin and client).

// How each request status is shown to Anna.
export const requestStatus = {
  pending: { label: 'New', className: 'bg-copper/10 text-copper' },
  quoted: { label: 'Quoted', className: 'bg-sand text-ink' },
  countered: { label: 'Countered', className: 'bg-copper/10 text-copper' },
  accepted: { label: 'Accepted', className: 'bg-sand text-ink' },
  rejected: { label: 'Rejected', className: 'bg-red-50 text-red-700' },
  canceled: { label: 'Canceled', className: 'bg-line/60 text-muted' },
}

// How each request status is shown to the client.
export const clientRequestStatus = {
  pending: { label: 'Under review', className: 'bg-copper/10 text-copper' },
  quoted: { label: 'Quote ready', className: 'bg-sand text-ink' },
  countered: { label: 'Waiting for Anna', className: 'bg-copper/10 text-copper' },
  accepted: { label: 'Accepted', className: 'bg-sand text-ink' },
  rejected: { label: 'Declined', className: 'bg-red-50 text-red-700' },
  canceled: { label: 'Canceled', className: 'bg-line/60 text-muted' },
}

export const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

// A date and time from the database (e.g. when the request was sent), shown as "Nov 20, 2026".
export const formatDate = (value) =>
  new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

// A date-only value like "2027-01-15" (e.g. the preferred date), shown without shifting a day by time zone.
export const formatDay = (value) =>
  new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
