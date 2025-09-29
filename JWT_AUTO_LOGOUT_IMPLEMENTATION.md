# JWT Auto-Logout Implementation

This document describes the implementation of automatic logout functionality when JWT tokens expire in the Temple Management System.

## Overview

The system now automatically logs out users when their JWT tokens expire, providing better security and user experience. This is implemented through multiple layers of protection:

## Components

### 1. Centralized API Client (`src/lib/apiClient.ts`)

- **Purpose**: Provides a centralized axios instance with automatic token handling
- **Features**:
  - Token expiration check before each request
  - Global 401 error handling
  - Automatic logout callback integration

### 2. Enhanced AuthContext (`src/contexts/AuthContext.tsx`)

- **Purpose**: Manages authentication state with automatic logout capabilities
- **Features**:
  - Token expiration check on app startup
  - Periodic token validation (every 5 minutes)
  - Integration with global logout callback

### 3. Test Component (`src/components/TokenExpirationTest.tsx`)

- **Purpose**: Demonstrates and tests the auto-logout functionality
- **Features**:
  - Real-time token status display
  - Time until expiration countdown
  - Manual logout testing

## How It Works

### 1. Token Expiration Detection

```typescript
// Check if token is expired
export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch (error) {
    return true; // Consider invalid tokens as expired
  }
}
```

### 2. Automatic Logout Triggers

The system automatically logs out users in these scenarios:

1. **On App Startup**: If saved token is expired
2. **Before API Requests**: If token is expired before making requests
3. **On 401 Responses**: When server returns unauthorized
4. **Periodic Checks**: Every 5 minutes during active session

### 3. Global Logout Callback

```typescript
// Set up global logout callback
setGlobalLogoutCallback(logout);

// API client automatically calls this on token expiration
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (globalLogoutCallback) {
        globalLogoutCallback();
      }
    }
    return Promise.reject(error);
  }
);
```

## Usage

### For Developers

1. **Use the centralized API client**:
   ```typescript
   import apiClient from '@/lib/apiClient';
   
   // All requests automatically handle token expiration
   const response = await apiClient.get('/api/data');
   ```

2. **Token utilities**:
   ```typescript
   import { isTokenExpired, getTokenExpirationTime } from '@/lib/apiClient';
   
   const token = localStorage.getItem('authToken');
   if (isTokenExpired(token)) {
     // Handle expired token
   }
   ```

### For Testing

1. **Add the test component to any page**:
   ```tsx
   import TokenExpirationTest from '@/components/TokenExpirationTest';
   
   // Add to your component
   <TokenExpirationTest />
   ```

2. **Test scenarios**:
   - Wait for natural token expiration
   - Manually modify token in localStorage
   - Simulate 401 responses

## Security Benefits

1. **Automatic Session Cleanup**: Expired sessions are automatically cleared
2. **Proactive Protection**: Token validation before API calls
3. **User Experience**: Seamless logout without manual intervention
4. **Security**: Prevents unauthorized access with expired tokens

## Configuration

### Token Check Interval

The system checks token expiration every 5 minutes. To modify:

```typescript
// In AuthContext.tsx
const interval = setInterval(checkTokenExpiration, 5 * 60 * 1000); // 5 minutes
```

### API Base URL

Configure the API base URL in your environment:

```env
VITE_API_BASE_URL=https://tmsapi.xesstechlink.com
```

## Troubleshooting

### Common Issues

1. **Token not expiring**: Check if the token has a valid `exp` claim
2. **Logout not triggering**: Ensure the global logout callback is set
3. **API requests failing**: Verify the API client is being used instead of direct fetch

### Debug Information

The system logs important events to the console:
- Token expiration warnings
- Automatic logout triggers
- API request failures due to expired tokens

## Future Enhancements

1. **Token Refresh**: Implement automatic token refresh before expiration
2. **User Notification**: Show warning before automatic logout
3. **Session Persistence**: Remember user preferences across sessions
4. **Multiple Tab Sync**: Synchronize logout across browser tabs

## Testing Checklist

- [ ] Token expiration on app startup
- [ ] Token expiration during active session
- [ ] 401 response handling
- [ ] Manual logout functionality
- [ ] Token status display
- [ ] Console logging
- [ ] LocalStorage cleanup
