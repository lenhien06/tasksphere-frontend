/**
 * Lightweight axios instance for use in Next.js BFF (API routes) only.
 * Does NOT import Zustand, interceptors, or any client-side code,
 * which keeps the BFF route module graph small and compilation fast.
 */
import axios from 'axios'

const SERVER_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'

export const serverAxios = axios.create({
  baseURL: SERVER_API_URL,
  headers: { 'Content-Type': 'application/json' },
})
