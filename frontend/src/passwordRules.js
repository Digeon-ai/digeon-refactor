export function passwordChecks(pw) {
  return {
    'At least 8 characters': pw.length >= 8,
    'One uppercase letter': /[A-Z]/.test(pw),
    'One lowercase letter': /[a-z]/.test(pw),
    'One number': /[0-9]/.test(pw),
    'One special character': /[^A-Za-z0-9]/.test(pw),
  }
}