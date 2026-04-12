export type ApiFetchResult<T> = {
  data: T | null;
  res: Response;
  text: string;
};

type ApiEnvelope<T> = {
  ok?: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
};

const normalizeApiError = (raw: string, status?: number) => {
  switch (raw) {
    case 'UNAUTHORIZED':
    case 'Unauthorized':
    case 'INVALID_CREDENTIALS':
    case 'USER_NOT_FOUND':
    case 'User not found':
      return '用户名或密码错误';
    case 'USERNAME_TAKEN':
    case 'Username already exists':
      return '用户名已存在';
    case 'EMAIL_TAKEN':
    case 'Email already exists':
      return '邮箱已被注册';
    case 'EMAIL_NOT_VERIFIED':
    case 'Email verification required':
      return '该账号尚未完成邮箱验证，请先验证后再登录';
    case 'INVALID_OR_EXPIRED_TOKEN':
    case 'Invalid or expired token':
      return '链接已失效，请重新获取';
    case 'FORBIDDEN':
    case 'Forbidden':
    case 'ROLE_FORBIDDEN':
      return '当前账号没有这个入口的权限，请使用正确的身份登录';
    case 'INTERNAL_ERROR':
    case 'Internal error':
    case 'Internal Server Error':
      return '服务暂时不可用，请确认 API 服务启动后再试';
    default:
      break;
  }

  if (status && status >= 500) {
    return '服务暂时不可用，请确认 API 服务启动后再试';
  }

  return raw || '服务暂时不可用，请稍后再试';
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

  return { data, res, text };
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  config: { redirectOnUnauthorized?: boolean } = {}
): Promise<T> {
  let result: ApiFetchResult<ApiEnvelope<T> | T>;
  try {
    result = await apiFetch<ApiEnvelope<T> | T>(path, options);
  } catch {
    throw new Error('服务暂时不可用，请确认 API 服务启动后再试');
  }

  const { data, res, text } = result;
  const redirectOnUnauthorized = config.redirectOnUnauthorized ?? true;

  if (res.status === 401 && redirectOnUnauthorized) {
    localStorage.removeItem('access_token');
    if (typeof window !== 'undefined') {
      window.location.replace('/login');
    }
    throw new Error('UNAUTHORIZED');
  }

  if (!res.ok) {
    const envelope = data as ApiEnvelope<T> | null;
    const raw =
      envelope && typeof envelope === 'object'
        ? envelope.error ?? envelope.message ?? envelope.code ?? res.statusText
        : text || res.statusText;
    throw new Error(normalizeApiError(raw, res.status));
  }

  if (data && typeof data === 'object' && 'ok' in data) {
    const envelope = data as ApiEnvelope<T>;
    if (envelope.ok === false) {
      throw new Error(
        normalizeApiError(envelope.error ?? envelope.message ?? envelope.code ?? '', res.status)
      );
    }
    return (envelope.data ?? null) as T;
  }

  return data as T;
}
