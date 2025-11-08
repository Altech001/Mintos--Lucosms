# API Client

Auto-generated API client from OpenAPI schema.

## Regenerate

```bash
cd backend
./generate-client.sh
```

## Usage

```typescript
import { apiClient } from '@/lib/api/client'

// Login example
const response = await apiClient.loginAccessTokenApiV1LoginAccessTokenPost({
  username: 'user@example.com',
  password: 'password'
})

// Set token for authenticated requests
import { setAuthToken } from '@/lib/api/client'
setAuthToken(response.access_token)

// Make authenticated requests
const users = await apiClient.readUsersApiV1UsersGet()
```

## Environment Variables

Add to your `.env` file:

```
VITE_API_URL=http://localhost:8000
```
