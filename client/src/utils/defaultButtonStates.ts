// Default button states with pre-configured styling for immediate user understanding
export const defaultButtonStates = {
  default: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease-in-out',
    textAlign: 'center' as const,
    lineHeight: '1.5',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  hover: {
    backgroundColor: '#2563eb',
    color: '#ffffff',
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
  },
  active: {
    backgroundColor: '#1d4ed8',
    color: '#ffffff',
    transform: 'translateY(0px)',
    boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)',
  },
  focus: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    outline: '2px solid #93c5fd',
    outlineOffset: '2px',
  },
  disabled: {
    backgroundColor: '#9ca3af',
    color: '#ffffff',
    cursor: 'not-allowed',
    opacity: '0.6',
    transform: 'none',
    boxShadow: 'none',
  }
};

// Initialize button designs in localStorage with default states
export function initializeDefaultButtonStates() {
  const existingDesigns = localStorage.getItem('buttonDesigns');
  if (!existingDesigns) {
    const defaultDesign = {
      'default-button': {
        id: 'default-button',
        name: 'Default Button',
        description: 'Professional default button with hover effects',
        states: defaultButtonStates,
        category: 'default',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };
    localStorage.setItem('buttonDesigns', JSON.stringify(defaultDesign));
  }
}

// Call this when the app initializes
initializeDefaultButtonStates();