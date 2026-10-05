// RecruitFlow — עטיפה משותפת לכל קריאות ה-API: מוסיפה את הטוקן, וזורקת אם התשובה לא תקינה
export const API_BASE = 'http://localhost:4000';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('rf_token');
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.error ?? 'משהו השתבש', res.status);
  }
  return data;
}
