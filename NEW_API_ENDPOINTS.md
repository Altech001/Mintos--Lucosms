# New API Endpoints - TypeScript Client

## 📱 User Phone Management

### Update Phone Number
```typescript
import { UsersApi } from '@/lib/api'

const usersApi = new UsersApi()

// Update user's phone number
await usersApi.updateUserPhoneApiV1UsersMePhonePatch({
  userPhoneUpdate: {
    phone: "+256700123456"
  }
})
```

---

## 🔐 Login History Tracking

### Get Login History
```typescript
import { UsersApi } from '@/lib/api'

const usersApi = new UsersApi()

// Get login history with browser, OS, device info
const history = await usersApi.readLoginHistoryApiV1UsersMeLoginHistoryGet({
  skip: 0,
  limit: 50
})

// Response includes:
// - user_agent, ip_address, location
// - browser (e.g., "Chrome 120.0")
// - os (e.g., "Windows 10")
// - device (e.g., "Desktop")
// - created_at
```

---

## 📨 Bulk SMS (Handles Millions of Messages)

### Create Bulk SMS Job
```typescript
import { SmsApi } from '@/lib/api'

const smsApi = new SmsApi()

// Create bulk job (returns immediately)
const job = await smsApi.createBulkSmsJobApiV1SmsSendBulkPost({
  bulkSmsJobCreate: {
    name: "Campaign 2024",
    recipients: ["+256700123456", "+256700234567", ...], // Can be millions
    message: "Hello from our campaign!",
    sender_id: "MyBrand",
    batch_size: 100  // Process 100 at a time
  }
})

console.log(job.id) // Job ID for tracking
```

### Get All Bulk Jobs
```typescript
// List all bulk jobs
const jobs = await smsApi.getBulkJobsApiV1SmsBulkJobsGet({
  skip: 0,
  limit: 20,
  status: "processing" // Optional: filter by status
})

// Response includes:
// - id, name, status
// - total_recipients, processed_count
// - successful_count, failed_count
// - progress_percentage
// - total_cost
```

### Get Job Status
```typescript
// Get specific job status
const jobStatus = await smsApi.getBulkJobApiV1SmsBulkJobsJobIdGet({
  jobId: "uuid-here"
})

console.log(jobStatus.progress_percentage) // e.g., 45.2
console.log(jobStatus.successful_count)    // e.g., 452000
console.log(jobStatus.failed_count)        // e.g., 1200
```

### Pause Bulk Job
```typescript
// Pause a running job
await smsApi.pauseBulkJobApiV1SmsBulkJobsJobIdPausePost({
  jobId: "uuid-here"
})
```

### Resume Bulk Job
```typescript
// Resume a paused job
await smsApi.resumeBulkJobApiV1SmsBulkJobsJobIdResumePost({
  jobId: "uuid-here"
})
```

---

## 🔑 API Key SMS Sending

### Send SMS with API Key (No Session Required)
```typescript
import { SmsApi, Configuration } from '@/lib/api'

// Create API with x-api-key header
const config = new Configuration({
  basePath: 'http://localhost:8000',
  headers: {
    'x-api-key': 'lk_your_api_key_here'
  }
})

const smsApi = new SmsApi(config)

// Send SMS using API key authentication
const result = await smsApi.sendSmsApiApiV1SmsSendApiPost({
  sendSMSRequest: {
    to: ["+256700123456"],
    message: "Hello via API key!",
    from: "MyBrand"
  }
})
```

---

## 🎯 WebSocket Real-time Updates

### Listen for Bulk SMS Progress
```typescript
const ws = new WebSocket('ws://localhost:8000/api/v1/sms/ws')

ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  
  if (data.event === 'bulk_sms_progress') {
    console.log(`Progress: ${data.progress_percentage}%`)
    console.log(`Sent: ${data.successful_count}/${data.total_recipients}`)
    console.log(`Batch: ${data.current_batch}/${data.total_batches}`)
  }
  
  if (data.event === 'bulk_sms_completed') {
    console.log('Job completed!')
    console.log(`Total cost: ${data.total_cost} UGX`)
  }
}
```

---

## 📊 Complete Example: Bulk SMS with Progress Tracking

```typescript
import { SmsApi } from '@/lib/api'
import { useState, useEffect } from 'react'

function BulkSMSComponent() {
  const [jobId, setJobId] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')
  
  const smsApi = new SmsApi()
  
  // Create bulk job
  const sendBulk = async () => {
    const job = await smsApi.createBulkSmsJobApiV1SmsSendBulkPost({
      bulkSmsJobCreate: {
        name: "My Campaign",
        recipients: [...], // Your recipients
        message: "Hello!",
        batch_size: 100
      }
    })
    
    setJobId(job.id)
  }
  
  // WebSocket for real-time updates
  useEffect(() => {
    if (!jobId) return
    
    const ws = new WebSocket('ws://localhost:8000/api/v1/sms/ws')
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      
      if (data.job_id === jobId && data.event === 'bulk_sms_progress') {
        setProgress(data.progress_percentage)
        setStatus(`${data.successful_count}/${data.total_recipients} sent`)
      }
    }
    
    return () => ws.close()
  }, [jobId])
  
  return (
    <div>
      <button onClick={sendBulk}>Send Bulk SMS</button>
      {jobId && (
        <div>
          <p>Progress: {progress}%</p>
          <p>Status: {status}</p>
        </div>
      )}
    </div>
  )
}
```

---

## 🔄 Migration Notes

### Your Existing Endpoints Still Work!
All your current frontend code remains functional:
- ✅ `POST /api/v1/sms/send` - Regular SMS sending
- ✅ All user management endpoints
- ✅ All template, contact, transaction endpoints

### New Additions
- ✅ Bulk SMS for large-scale campaigns
- ✅ Login history tracking
- ✅ Phone number management
- ✅ API key authentication for SMS

---

## 📝 TypeScript Types Available

All new models are fully typed:
- `BulkSmsJobCreate`
- `BulkSmsJobPublic`
- `BulkSmsJobsPublic`
- `LoginHistoryPublic`
- `LoginHistoryPublicList`
- `UserPhoneUpdate`

Import from:
```typescript
import { 
  BulkSmsJobCreate, 
  BulkSmsJobPublic,
  LoginHistoryPublic 
} from '@/lib/api/models'
```

---

## 🚀 Performance Notes

### Bulk SMS
- Processes in batches (default 100 messages/batch)
- Returns immediately with job ID
- Background processing with progress updates
- Can handle 1M+ messages
- Pause/resume capability
- Only charges for successful sends

### API Keys
- Expire in 2 years by default
- Secure bcrypt hashing
- Prefix-based lookup for performance

