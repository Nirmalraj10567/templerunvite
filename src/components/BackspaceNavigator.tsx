import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const BackspaceNavigator: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if backspace key is pressed
      if (event.key === 'Backspace') {
        // Prevent default behavior only when we're handling the navigation
        // This prevents accidental text deletion when focused on input elements
        if (
          event.target instanceof HTMLElement &&
          (event.target.tagName === 'INPUT' ||
           event.target.tagName === 'TEXTAREA' ||
           event.target.isContentEditable)
        ) {
          // Don't navigate if we're in an input, textarea, or content-editable element
          return;
        }
        
        // Prevent default backspace behavior
        event.preventDefault();
        
        // Navigate to the previous page
        navigate(-1);
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);

    // Clean up event listener on component unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate]);

  return null; // This component doesn't render anything
};

export default BackspaceNavigator;
