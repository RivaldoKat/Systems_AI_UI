# Luma LMS

Quasar frontend for the Spring Boot LMS backend.

## Requirements

- Node.js 22.12+, 24+, or 26+
- The LMS backend running on `http://localhost:8080`

## Run locally

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

Quasar serves the UI at `http://localhost:9000`. The backend allows this origin in its CORS configuration. Configure `VITE_API_BASE_URL` in `.env` if the backend API is hosted elsewhere; the default is `http://localhost:8080/api`. For a deployed frontend, set it to the backend's public URL ending in `/api` and allow the frontend's origin in backend `LMS_CORS_ALLOWED_ORIGINS`.

Sign in with an account created by the backend. Administrators can create learner accounts in People and enroll learners from Enrollments. Learners can upload and submit assignment files from Assignments. For local sample accounts, enable and seed the backend using `LMS_SAMPLE_DATA_ENABLED=true` and `LMS_SAMPLE_DATA_PASSWORD` as described in the backend README.

## Build

```powershell
npm run build
npm run lint:check
```

The UI uses the backend's JWT login and sends the token in the `Authorization: Bearer` header. The API exposes pageable course, announcement, assignment, enrollment, attendance, user, and student-submission endpoints. Enrollment creation requires a course, learner, and grade level.
