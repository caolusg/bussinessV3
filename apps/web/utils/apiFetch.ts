export type ApiFetchResult<T> = {
  data: T | null;
  res: Response;
  text: string;
};

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiFetchResult<T>> {
  const token = localStorage.getItem('access_token');
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(path, { ...options, headers });
  const text = await res.text();
  let data: T | null = null;

  if (text) {
    try {
      data = JSON.parse(text) as T;
    } catch {
      data = null;
    }
  }

  if (res.status === 401) {
    localStorage.removeItem('access_token');
    if (typeof window !== 'undefined') {
      window.location.replace('/login');
    }
  }

  return { data, res, text };
}
