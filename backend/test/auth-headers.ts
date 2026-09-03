export function hostAuth(sub = 'test-user') {
  return {
    Authorization: 'Bearer invalid.token',
    'x-test-roles': '["host"]',
    'x-test-sub': sub,
  };
}

export function userAuth(sub: string) {
  return {
    Authorization: 'Bearer invalid.token',
    'x-test-roles': '[]',
    'x-test-sub': sub,
  };
}
