# CivicFlow AI Backend — API Documentation & System Specification

Welcome to the **CivicFlow AI Backend** documentation. This backend powers the **CivicFlow AI** civic complaint action platform using Express, MongoDB, Cloudinary, Nodemailer, and Google Gemini 2.5 Flash Multimodal AI.

---

## 🚀 Key Features

1. **Multimodal Gemini 2.5 Flash Engine**: Processes **Text Description + Uploaded Image** together to extract category, priority (`critical`, `high`, `medium`, `low`), department, confidence score (%), technical reason, and summary.
2. **Smart Duplicate Complaint Detection**: Scans database for active complaints in ~1km radius or matching category/location, alerts user of potential duplicates, and increments community report counts.
3. **Complaint History Audit Trail**: Tracks full status lifecycle (`Submitted` → `AI Verified` → `Assigned` → `In Progress` → `Resolved`).
4. **Admin Dashboard Stats**: Aggregates complaint statistics, priority breakdowns, and category distributions.
5. **No Voice Input**: Streamlined text + image workflow designed for rapid hackathon execution.

---

## 🌐 Base URL
`http://localhost:5000/api` (or `http://localhost:5000`)

---

## 📚 Endpoints Summary

| Category | Endpoint | Method | Description |
| -------- | -------- | ------ | ----------- |
| **System** | `/api/health` | `GET` | Health check & service status |
| **Auth** | `/api/auth/register` | `POST` | Register user account |
| **Auth** | `/api/auth/login` | `POST` | Login user account (Demo Admin: `admin@civicflow.ai` / `admin123`) |
| **Auth** | `/api/auth/send-otp` | `POST` | Generate and send OTP via Nodemailer |
| **Auth** | `/api/auth/verify-otp` | `POST` | Verify OTP and return JWT token |
| **AI / Upload** | `/api/upload` | `POST` | Upload image + Gemini 2.5 Flash Multimodal AI + Smart Duplicate Detection |
| **Complaints** | `/api/complaints` | `POST` | Submit/finalize complaint |
| **Complaints** | `/api/complaints` | `GET` | List complaints (supports `phone`, `status`, `priority`, `category` filters) |
| **Complaints** | `/api/complaints/:id` | `GET` | Get complaint details by `complaintId` (`CF-2026-XXXX`) or MongoDB ID |
| **Complaints** | `/api/complaints/:id/status` | `PATCH` | Admin status update & department assignment |
| **Admin** | `/api/admin/stats` | `GET` | Admin dashboard analytics (total, pending, priority overview, categories) |
| **Admin** | `/api/admin/complaints` | `GET` | Filtered admin complaint list |

---

## 💡 Quick Test Commands (cURL)

### 1. Test Multimodal AI & Upload Image
```bash
curl -X POST http://localhost:5000/api/upload \
  -F "image=@/path/to/pothole.jpg" \
  -F "description=Large pothole near college main gate. Two bikes almost fell." \
  -F "location=College Main Gate, MG Road" \
  -F "latitude=12.9716" \
  -F "longitude=77.5946"
```

### 2. Admin Dashboard Analytics
```bash
curl -X GET http://localhost:5000/api/admin/stats
```

### 3. Update Status (Admin)
```bash
curl -X PATCH http://localhost:5000/api/complaints/CF-2026-0001/status \
  -H "Content-Type: application/json" \
  -d '{
    "status": "In Progress",
    "department": "Roads & Public Works",
    "message": "Asphalt repair crew dispatched."
  }'
```
