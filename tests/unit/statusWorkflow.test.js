// FR-005: Strategy rules keep each permitted status transition independently testable.
const {
  validateTransition,
  getAllowedTransitions,
  rules,
} = require('../../server/src/services/statusWorkflow');

const staff = { role: 'staff' };
const requester = { role: 'requester' };
const management = { role: 'management' };

describe('request status transition strategies', () => {
  test('assignment requires a responsible staff member', () => {
    expect(() => validateTransition({ status: 'submitted' }, 'assigned', staff))
      .toThrow(/requires a staff member/);
    expect(
      validateTransition({ status: 'submitted' }, 'assigned', staff, { assigneeId: 'staff-1' }).to
    ).toBe('assigned');
  });

  test('permitted lifecycle: assigned -> in progress -> resolved -> closed', () => {
    expect(() => validateTransition({ status: 'assigned' }, 'in_progress', staff)).not.toThrow();
    expect(() => validateTransition({ status: 'in_progress' }, 'resolved', staff)).not.toThrow();
    expect(() => validateTransition({ status: 'resolved' }, 'closed', staff)).not.toThrow();
  });

  test('invalid jumps fail with a conflict', () => {
    expect(() => validateTransition({ status: 'submitted' }, 'closed', staff))
      .toThrow(/Cannot change status/);
    try {
      validateTransition({ status: 'submitted' }, 'closed', staff);
    } catch (error) {
      expect(error.statusCode).toBe(409);
    }
  });

  test.each([
    ['closed', 'in_progress'],
    ['rejected', 'assigned'],
  ])('terminal status %s cannot move to %s', (from, to) => {
    expect(() => validateTransition({ status: from }, to, staff))
      .toThrow(/final status/);
  });

  test('requesters and management cannot perform staff status transitions', () => {
    expect(() => validateTransition({ status: 'submitted' }, 'rejected', requester))
      .toThrow(/authorised staff/);
    expect(() => validateTransition({ status: 'assigned' }, 'in_progress', management))
      .toThrow(/authorised staff/);
  });

  test('rejection may include an explanatory note but does not require one', () => {
    expect(() => validateTransition({ status: 'submitted' }, 'rejected', staff)).not.toThrow();
  });

  test('allowed transition options respect state and role', () => {
    expect(getAllowedTransitions({ status: 'submitted' }, staff).map((rule) => rule.to))
      .toEqual(['assigned', 'rejected']);
    expect(getAllowedTransitions({ status: 'submitted' }, requester)).toEqual([]);
    expect(getAllowedTransitions({ status: 'closed' }, staff)).toEqual([]);
  });

  test('each transition rule is unique', () => {
    const keys = rules.map(({ from, to }) => `${from}>${to}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
