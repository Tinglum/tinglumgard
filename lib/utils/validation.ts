/**
 * Form validation utilities
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate Norwegian phone number
 */
export function validatePhone(phone: string): ValidationResult {
  // Remove spaces and other formatting
  const cleaned = phone.replace(/\s+/g, '').replace(/\+47/, '');
  
  // Norwegian mobile numbers: 8 digits starting with 4 or 9
  // Landline: 8 digits
  if (!/^\d{8}$/.test(cleaned)) {
    return {
      isValid: false,
      error: 'Telefonnummer må være 8 siffer'
    };
  }

  return { isValid: true };
}

/**
 * Validate email address
 */
export function validateEmail(email: string): ValidationResult {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email || email.trim().length === 0) {
    return {
      isValid: false,
      error: 'E-post er påkrevd'
    };
  }

  if (!emailRegex.test(email)) {
    return {
      isValid: false,
      error: 'Ugyldig e-postadresse'
    };
  }

  return { isValid: true };
}

/**
 * Validate name
 */
export function validateName(name: string): ValidationResult {
  if (!name || name.trim().length < 2) {
    return {
      isValid: false,
      error: 'Navn må være minst 2 tegn'
    };
  }

  if (name.trim().length > 100) {
    return {
      isValid: false,
      error: 'Navn kan ikke være lengre enn 100 tegn'
    };
  }

  return { isValid: true };
}

/**
 * Validate order number format
 */
export function validateOrderNumber(orderNumber: string): ValidationResult {
  // Format: TLXXXXXX (TL followed by 6 alphanumeric characters)
  if (!/^TL[A-Z0-9]{6}$/.test(orderNumber.toUpperCase())) {
    return {
      isValid: false,
      error: 'Ugyldig ordrenummer format'
    };
  }

  return { isValid: true };
}

/**
 * Validate rebate code
 */
export function validateRebateCode(code: string): ValidationResult {
  if (!code || code.trim().length === 0) {
    return {
      isValid: false,
      error: 'Rabattkode er tom'
    };
  }

  // Alphanumeric, 4-20 characters
  if (!/^[A-Z0-9]{4,20}$/i.test(code)) {
    return {
      isValid: false,
      error: 'Ugyldig rabattkode format'
    };
  }

  return { isValid: true };
}

/**
 * Validate amount (must be positive)
 */
export function validateAmount(amount: number | string): ValidationResult {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(num) || num <= 0) {
    return {
      isValid: false,
      error: 'Beløp må være et positivt tall'
    };
  }

  return { isValid: true };
}

/**
 * Validate quantity
 */
export function validateQuantity(quantity: number | string): ValidationResult {
  const num = typeof quantity === 'string' ? parseInt(quantity) : quantity;

  if (isNaN(num) || num < 1) {
    return {
      isValid: false,
      error: 'Antall må være minst 1'
    };
  }

  if (num > 100) {
    return {
      isValid: false,
      error: 'Antall kan ikke være mer enn 100'
    };
  }

  return { isValid: true };
}

/**
 * Batch validation
 */
export function validateFields(
  fields: Record<string, any>,
  validators: Record<string, (value: any) => ValidationResult>
): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  
  for (const [fieldName, validator] of Object.entries(validators)) {
    const value = fields[fieldName];
    const result = validator(value);
    
    if (!result.isValid && result.error) {
      errors[fieldName] = result.error;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
