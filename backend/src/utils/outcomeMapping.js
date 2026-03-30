// Outcome-to-status mapping for auto-updating lead status after logging a call
export const OUTCOME_STATUS_MAP = {
  no_answer: 'no_answer',
  callback: 'callback',
  interested: 'interested',
  not_interested: 'not_interested',
  booked_meeting: 'booked_meeting',
  already_customer: 'already_customer',
  wrong_number: 'wrong_number',
};

export const VALID_OUTCOMES = [
  ...Object.keys(OUTCOME_STATUS_MAP),
  'sent_email',
  'sent_followup',
];

/**
 * Get the lead status that corresponds to a call outcome.
 * Returns undefined for outcomes that should not change the lead status
 * (e.g. sent_email, sent_followup).
 */
export function getStatusForOutcome(outcome) {
  return OUTCOME_STATUS_MAP[outcome];
}

/**
 * Check whether an outcome string is valid.
 */
export function isValidOutcome(outcome) {
  return VALID_OUTCOMES.includes(outcome);
}
