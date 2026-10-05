// Ids and values vary between occurrences of the same error ("varchar '900008588201'", "ItemID 663132",
// "(Reference=LR052653)"), so they are masked for grouping
export const normalizeErrorMessage = (message) => message
  .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '…')
  .replace(/=\s*[^\s),;]+/g, '=…')
  .replace(/\d{3,}/g, '#')

export const FAILURE_KINDS = {
  technical: { label: 'Technical error', detail: '"Operation failed" (logged exception)' },
  rejected: { label: 'Rejected by DMS', detail: 'blocking warning' },
}

// How a SetRepairOrder response failed, or null if it did not:
// - rejected: the DMS refused it through blocking warnings (Severity > 0), e.g. "[100000] Repair Order locked by other user"
// - technical: only a generic "Operation failed"; the real cause is in the ERROR lines logged under the request scope
//   (logErrors), e.g. a SQL conversion exception
export function getRepairOrderFailure(resp, logErrors = []) {
  if (!resp || resp.Status !== 'FAIL') return null
  const blocking = (resp.Warnings || []).filter(w => w.Severity > 0)
  if (blocking.length > 0) {
    const messages = blocking.map(w => {
      const text = (w.ErrorMessage || '').trim() || 'Unknown warning'
      return w.ErrorID ? `[${w.ErrorID}] ${text}` : text
    })
    return { kind: 'rejected', messages: [...new Set(messages)] }
  }
  const messages = logErrors.length > 0
    ? logErrors.map(normalizeErrorMessage)
    : [(resp.ErrorMessage || '').trim() || 'Unknown error']
  return { kind: 'technical', messages: [...new Set(messages)] }
}

// Error messages of a failed SetRepairOrder response, or [] if it did not fail
export function getRepairOrderErrors(resp, logErrors = []) {
  return getRepairOrderFailure(resp, logErrors)?.messages || []
}
