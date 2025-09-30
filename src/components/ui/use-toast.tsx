// Simple toast implementation
const toast = {
  success: (message: string) => {
    console.log('✅ Success:', message);
    // In a real implementation, this would show a toast notification
    alert(`Success: ${message}`);
  },
  error: (message: string) => {
    console.error('❌ Error:', message);
    // In a real implementation, this would show an error toast
    alert(`Error: ${message}`);
  },
  info: (message: string) => {
    console.log('ℹ️ Info:', message);
    // In a real implementation, this would show an info toast
    alert(`Info: ${message}`);
  },
  warning: (message: string) => {
    console.warn('⚠️ Warning:', message);
    // In a real implementation, this would show a warning toast
    alert(`Warning: ${message}`);
  }
};

// Hook to use toast
export const useToast = () => {
  return { toast };
};

export { toast };
export default toast;