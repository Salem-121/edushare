// ============================================================================
// api.js
// ----------------------------------------------------------------------------
// WHAT THIS FILE IS: the single "phone line" between the frontend and the
// backend server. Every screen that needs data goes through the helpers here
// instead of writing raw network code. It uses "axios", a popular library for
// making HTTP requests (GET = read, POST = create, PUT = update, DELETE = remove).
// ============================================================================

import axios from 'axios'

// Create one shared axios client with default settings every request inherits.
const api = axios.create({
  // Where the backend lives. Reads from an environment variable in production,
  // and falls back to the local dev server during development.
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  timeout: 30_000,   // give up after 30 seconds (30_000 ms) if the server is silent
})

// --- REQUEST INTERCEPTOR: runs before every request goes out ----------------
// Auth header
// Attaches the saved login token so the backend knows who is asking.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`   // standard "Bearer <token>" format
  return config                                                  // must return the (possibly edited) config
})

// --- RESPONSE INTERCEPTOR: runs after every response comes back -------------
// 401 handling — single redirect (debounced), preserves the location for "next"
// 401 means "not authenticated" (token missing/expired). When that happens we
// log the user out and send them to /login, remembering where they were so we
// can return them there after they sign back in.
let redirectingTo401 = false    // guard so two failing requests don't redirect twice
api.interceptors.response.use(
  (res) => res,                  // success: just pass the response through untouched
  (err) => {                     // failure: inspect the error
    const status = err.response?.status
    if (status === 401 && !redirectingTo401 && !location.pathname.startsWith('/login')) {
      redirectingTo401 = true
      localStorage.removeItem('token')                            // clear the bad token
      localStorage.removeItem('user')
      const next = encodeURIComponent(location.pathname + location.search)  // remember current page
      location.replace(`/login?next=${next}`)                     // send to login with a "come back here" hint
    }
    return Promise.reject(err)   // still reject so the calling code can handle it too
  }
)

// AI calls can take a while — give them their own generous timeout.
const AI_TIMEOUT = 120_000   // 120 seconds, because the AI can be slow to respond

// ----------------------------------------------------------------------------
// Below: grouped helpers, one object per feature area. Each method returns the
// axios promise, so callers do  `const { data } = await usersAPI.getAll()`.
// ----------------------------------------------------------------------------

// Authentication: log in, sign up, and "who am I?".
export const authAPI = {
  login:    (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me:       ()     => api.get('/auth/me'),
}

// Public platform counters for the landing page (no auth required).
export const statsAPI = {
  getPublic: () => api.get('/stats'),
}

// Users management (admin): list, view, create, edit, delete accounts.
export const usersAPI = {
  getAll:  (params)   => api.get('/users', { params }),     // params = optional filters like ?role=student
  getById: (id)       => api.get(`/users/${id}`),
  create:  (data)     => api.post('/users', data),
  update:  (id, data) => api.put(`/users/${id}`, data),
  delete:  (id)       => api.delete(`/users/${id}`),
}

// Modules (subjects/courses): the building blocks lessons belong to.
export const modulesAPI = {
  getAll:  ()         => api.get('/modules'),
  create:  (data)     => api.post('/modules', data),
  update:  (id, data) => api.put(`/modules/${id}`, data),
  delete:  (id)       => api.delete(`/modules/${id}`),
}

// Filieres (study tracks/majors that group students together).
export const filieresAPI = {
  getAll:  ()         => api.get('/filieres'),
  create:  (data)     => api.post('/filieres', data),
  update:  (id, data) => api.put(`/filieres/${id}`, data),
  delete:  (id)       => api.delete(`/filieres/${id}`),
}

// Quizzes (teacher-made QCM tests) — including AI generation from a document.
export const quizzesAPI = {
  getAll:      ()         => api.get('/quizzes'),
  getById:     (id)       => api.get(`/quizzes/${id}`),
  create:      (data)     => api.post('/quizzes', data),
  update:      (id, data) => api.put(`/quizzes/${id}`, data),
  delete:      (id)       => api.delete(`/quizzes/${id}`),
  submit:      (id, answers) => api.post(`/quizzes/${id}/submit`, { answers }),   // student turns in answers
  getAttempts: (id)       => api.get(`/quizzes/${id}/attempts`),                  // see past attempts
  // Generate QCM questions from an uploaded PDF/DOCX (AI — slow).
  // FormData + multipart is how you send a file over HTTP.
  generate:    (formData) => api.post('/quizzes/generate', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: AI_TIMEOUT,
  }),
}

// Private, student-only quizzes generated from a dropped file.
// (Practice tests a student makes for themselves; nobody else sees them.)
export const practiceQuizzesAPI = {
  getMy:    ()             => api.get('/practice-quizzes'),
  getById:  (id)           => api.get(`/practice-quizzes/${id}`),
  create:   (data)         => api.post('/practice-quizzes', data),
  submit:   (id, answers)  => api.post(`/practice-quizzes/${id}/submit`, { answers }),
  delete:   (id)           => api.delete(`/practice-quizzes/${id}`),
}

// Lessons: the uploaded course documents (PDF/DOCX) plus their metadata.
export const lessonsAPI = {
  getAll:   (params)   => api.get('/lessons', { params }),   // browse/filter all visible lessons
  getMy:    ()         => api.get('/lessons/my'),            // lessons I uploaded (teacher)
  getById:  (id)       => api.get(`/lessons/${id}`),
  create:   (formData) => api.post('/lessons', formData, {   // upload a new lesson file
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update:   (id, data) => api.put(`/lessons/${id}`, data),
  delete:   (id)       => api.delete(`/lessons/${id}`),
  download: (id)       => api.get(`/lessons/${id}/download`, { responseType: 'blob' }),  // blob = raw file bytes
}

// Summaries: AI-written recaps of a lesson, which a teacher then reviews.
export const summariesAPI = {
  generate:     (lessonId, data) => api.post(`/summaries/generate/${lessonId}`, data || {}, { timeout: AI_TIMEOUT }),
  getMy:        ()               => api.get('/summaries/my'),        // my summaries (student)
  getPending:   ()               => api.get('/summaries/pending'),   // summaries awaiting teacher review
  getForLesson: (lessonId)       => api.get(`/summaries/lesson/${lessonId}`),
  review:       (id, data)       => api.put(`/summaries/${id}/review`, data),  // approve/reject
}

// Chat: ask the AI tutor questions about a specific lesson, with saved history.
export const chatAPI = {
  send:                (lessonId, messages, sessionId) =>
                         api.post(`/chat/${lessonId}`, { messages, sessionId }, { timeout: AI_TIMEOUT }),
  getSessions:         ()         => api.get('/chat/sessions'),                 // all my past conversations
  getSessionForLesson: (lessonId) => api.get(`/chat/sessions/${lessonId}`),     // conversation for one lesson
  deleteSession:       (sessionId) => api.delete(`/chat/sessions/${sessionId}`),
}

// Notifications: the little alerts bell (e.g. "your summary was approved").
export const notificationsAPI = {
  getAll:      () => api.get('/notifications'),
  markRead:    (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
}

// Export the raw client too, in case some code needs a custom one-off request.
export default api
