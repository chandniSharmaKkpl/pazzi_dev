// utils/validation.ts
export const validateEmail = (email: string): string => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
        return 'Email is required';
    }
    if (!emailRegex.test(email)) {
        return 'Please enter a valid email address';
    }
    return '';
};

export const validatePassword = (password: string): string => {
    if (!password) {
        return 'Password is required';
    }
    if (password.length < 8) {
        return 'Password must be at least 8 characters long';
    }
    return '';
};

export const validatePasswordStrength = (password: string): {
    isValid: boolean;
    strength: 'weak' | 'medium' | 'strong';
    message: string;
} => {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < 8) {
        return {
            isValid: false,
            strength: 'weak',
            message: 'Password must be at least 8 characters long'
        };
    }

    const passedTests = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;

    if (passedTests <= 2) {
        return {
            isValid: true,
            strength: 'weak',
            message: 'Consider adding uppercase, numbers, or special characters'
        };
    } else if (passedTests === 3) {
        return {
            isValid: true,
            strength: 'medium',
            message: 'Good password'
        };
    } else {
        return {
            isValid: true,
            strength: 'strong',
            message: 'Strong password'
        };
    }
};

export function validateName(name: string): string {
  if (!name || name.trim().length === 0) {
    return 'Name is required';
  }
  return '';
}