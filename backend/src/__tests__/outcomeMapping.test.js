import { describe, it, expect } from 'vitest';
import {
  OUTCOME_STATUS_MAP,
  VALID_OUTCOMES,
  getStatusForOutcome,
  isValidOutcome,
} from '../utils/outcomeMapping.js';

describe('OUTCOME_STATUS_MAP', () => {
  it('maps each call outcome to the expected lead status', () => {
    expect(OUTCOME_STATUS_MAP.no_answer).toBe('no_answer');
    expect(OUTCOME_STATUS_MAP.callback).toBe('callback');
    expect(OUTCOME_STATUS_MAP.interested).toBe('interested');
    expect(OUTCOME_STATUS_MAP.not_interested).toBe('not_interested');
    expect(OUTCOME_STATUS_MAP.booked_meeting).toBe('booked_meeting');
    expect(OUTCOME_STATUS_MAP.already_customer).toBe('already_customer');
    expect(OUTCOME_STATUS_MAP.wrong_number).toBe('wrong_number');
  });

  it('contains exactly 7 outcome-to-status entries', () => {
    expect(Object.keys(OUTCOME_STATUS_MAP)).toHaveLength(7);
  });
});

describe('VALID_OUTCOMES', () => {
  it('includes all status-mapped outcomes plus sent_email and sent_followup', () => {
    const expected = [
      'no_answer', 'callback', 'interested', 'not_interested',
      'booked_meeting', 'already_customer', 'wrong_number',
      'sent_email', 'sent_followup',
    ];
    expect(VALID_OUTCOMES).toEqual(expect.arrayContaining(expected));
    expect(VALID_OUTCOMES).toHaveLength(expected.length);
  });
});

describe('getStatusForOutcome', () => {
  it('returns the correct status for each mapped outcome', () => {
    expect(getStatusForOutcome('no_answer')).toBe('no_answer');
    expect(getStatusForOutcome('callback')).toBe('callback');
    expect(getStatusForOutcome('interested')).toBe('interested');
    expect(getStatusForOutcome('not_interested')).toBe('not_interested');
    expect(getStatusForOutcome('booked_meeting')).toBe('booked_meeting');
    expect(getStatusForOutcome('already_customer')).toBe('already_customer');
    expect(getStatusForOutcome('wrong_number')).toBe('wrong_number');
  });

  it('returns undefined for outcomes that should not change lead status', () => {
    expect(getStatusForOutcome('sent_email')).toBeUndefined();
    expect(getStatusForOutcome('sent_followup')).toBeUndefined();
  });

  it('returns undefined for unknown outcomes', () => {
    expect(getStatusForOutcome('invalid')).toBeUndefined();
    expect(getStatusForOutcome('')).toBeUndefined();
    expect(getStatusForOutcome(undefined)).toBeUndefined();
  });
});

describe('isValidOutcome', () => {
  it('returns true for all valid outcomes', () => {
    for (const outcome of VALID_OUTCOMES) {
      expect(isValidOutcome(outcome)).toBe(true);
    }
  });

  it('returns false for invalid outcomes', () => {
    expect(isValidOutcome('invalid')).toBe(false);
    expect(isValidOutcome('')).toBe(false);
    expect(isValidOutcome('NEW')).toBe(false);
    expect(isValidOutcome(null)).toBe(false);
  });
});
