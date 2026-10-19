// FR-001 boundary tests for the MongoDB service-request input.
const { validateNewRequest } = require('../../server/src/services/requestService');

const valid = {
  title: 'Broken street light',
  description: 'The light on the corner of 5th and Oak has been out for a week.',
  location: '5th and Oak',
  category: 'street_lighting',
  priority: 'medium',
};
const repeated = (length) => 'x'.repeat(length);

describe('service request input validation', () => {
  test('valid input is normalized and accepted', () => {
    expect(validateNewRequest({ ...valid, title: '  Broken street light  ' })).toMatchObject({
      ...valid,
      title: 'Broken street light',
    });
  });

  test.each(['title', 'description', 'location', 'category'])('missing %s is rejected', (field) => {
    expect(() => validateNewRequest({ ...valid, [field]: '' })).toThrow();
  });

  test('unknown category and priority are rejected with field details', () => {
    try {
      validateNewRequest({ ...valid, category: 'not-a-category', priority: 'urgent' });
    } catch (error) {
      expect(error.statusCode).toBe(400);
      expect(error.details).toHaveProperty('category');
      expect(error.details).toHaveProperty('priority');
    }
  });

  test.each([
    [1, true],
    [120, true],
    [121, false],
  ])('title length %i is accepted=%s', (length, accepted) => {
    const result = () => validateNewRequest({ ...valid, title: repeated(length) });
    if (accepted) expect(result).not.toThrow();
    else expect(result).toThrow();
  });

  test.each([
    [1, true],
    [2000, true],
    [2001, false],
  ])('description length %i is accepted=%s', (length, accepted) => {
    const result = () => validateNewRequest({ ...valid, description: repeated(length) });
    if (accepted) expect(result).not.toThrow();
    else expect(result).toThrow();
  });

  test('requester-supplied status, assignee, or ownership fields are ignored', () => {
    expect(validateNewRequest({
      ...valid,
      status: 'closed',
      assignee: 'untrusted-id',
      requester: 'another-user',
    })).toMatchObject(valid);
  });
});
