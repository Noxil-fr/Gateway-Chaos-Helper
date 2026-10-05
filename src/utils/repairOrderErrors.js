// Ids and values vary between occurrences of the same error ("varchar '900008588201'", "ItemID 663132"), so they are masked for grouping
export const normalizeErrorMessage = (message) => message
  .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '…')
  .replace(/\d{3,}/g, '#')

// Error messages of a failed SetRepairOrder response, or [] if it did not fail.
// A FAIL carries either blocking warnings (Severity > 0) or only a generic top-level ErrorMessage ("Operation failed"):
// the real cause is then in the ERROR lines logged under the request scope (logErrors), e.g. a SQL conversion exception.
export function getRepairOrderErrors(resp, logErrors = []) {
  if (!resp || resp.Status !== 'FAIL') return []
  const blocking = (resp.Warnings || []).filter(w => w.Severity > 0)
  const messages = blocking.length > 0
    ? blocking.map(w => (w.ErrorMessage || '').trim() || 'Unknown warning')
    : logErrors.length > 0
      ? logErrors.map(normalizeErrorMessage)
      : [(resp.ErrorMessage || '').trim() || 'Unknown error']
  return [...new Set(messages)]
}
