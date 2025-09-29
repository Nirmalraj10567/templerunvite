import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isTokenExpired, getTokenExpirationTime } from '@/lib/apiClient';

/**
 * Test component to demonstrate and test JWT token expiration handling
 * This component shows token information and allows testing auto-logout functionality
 */
export const TokenExpirationTest: React.FC = () => {
  const { user, token, logout } = useAuth();
  const [tokenInfo, setTokenInfo] = useState<{
    isExpired: boolean;
    expirationTime: number | null;
    timeUntilExpiration: string;
  } | null>(null);

  useEffect(() => {
    if (!token) {
      setTokenInfo(null);
      return;
    }

    const updateTokenInfo = () => {
      const isExpired = isTokenExpired(token);
      const expirationTime = getTokenExpirationTime(token);
      
      let timeUntilExpiration = 'Unknown';
      if (expirationTime) {
        const now = Date.now();
        const timeLeft = expirationTime - now;
        
        if (timeLeft <= 0) {
          timeUntilExpiration = 'Expired';
        } else {
          const minutes = Math.floor(timeLeft / (1000 * 60));
          const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
          timeUntilExpiration = `${minutes}m ${seconds}s`;
        }
      }

      setTokenInfo({
        isExpired,
        expirationTime,
        timeUntilExpiration,
      });
    };

    updateTokenInfo();
    const interval = setInterval(updateTokenInfo, 1000); // Update every second

    return () => clearInterval(interval);
  }, [token]);

  if (!user || !token) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-lg font-semibold text-yellow-800">Token Expiration Test</h3>
        <p className="text-yellow-700">No user logged in or token available.</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h3 className="text-lg font-semibold text-blue-800 mb-4">Token Expiration Test</h3>
      
      <div className="space-y-2 text-sm">
        <div>
          <span className="font-medium">User:</span> {user.name} ({user.email})
        </div>
        
        {tokenInfo && (
          <>
            <div>
              <span className="font-medium">Token Status:</span>
              <span className={`ml-2 px-2 py-1 rounded text-xs ${
                tokenInfo.isExpired 
                  ? 'bg-red-100 text-red-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {tokenInfo.isExpired ? 'EXPIRED' : 'VALID'}
              </span>
            </div>
            
            <div>
              <span className="font-medium">Time Until Expiration:</span> {tokenInfo.timeUntilExpiration}
            </div>
            
            {tokenInfo.expirationTime && (
              <div>
                <span className="font-medium">Expires At:</span> {new Date(tokenInfo.expirationTime).toLocaleString()}
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-4 space-x-2">
        <button
          onClick={logout}
          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
        >
          Manual Logout
        </button>
        
        <button
          onClick={() => {
            // Simulate an expired token by modifying localStorage
            const currentToken = localStorage.getItem('authToken');
            if (currentToken) {
              // This is just for testing - in real scenario, we'd wait for natural expiration
              console.log('Current token:', currentToken.substring(0, 20) + '...');
              console.log('Token expiration check:', isTokenExpired(currentToken));
            }
          }}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
        >
          Check Token Status
        </button>
      </div>

      <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
        <p className="font-medium text-gray-700">How Auto-Logout Works:</p>
        <ul className="mt-1 text-gray-600 list-disc list-inside">
          <li>Token expiration is checked every 5 minutes</li>
          <li>API requests check token validity before sending</li>
          <li>401 responses from server trigger automatic logout</li>
          <li>Expired tokens are detected on app startup</li>
        </ul>
      </div>
    </div>
  );
};

export default TokenExpirationTest;
