type ClickFlowEvent = {
  eventType: string;
  page: string;
  route: string;
  label?: string;
  target?: string;
  sessionId?: string | null;
  stage?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  occurredAt: string;
};

const CLICK_BATCH_SIZE = 50;
const CLICK_FLUSH_DELAY_MS = 750;

let queue: ClickFlowEvent[] = [];
let flushTimer: number | null = null;
let flushing = false;

function hasAuthToken() {
  return typeof window !== 'undefined' && Boolean(localStorage.getItem('access_token'));
}

function normalizeText(text: string | null | undefined) {
  return text?.replace(/\s+/g, ' ').trim() ?? '';
}

function scheduleFlush() {
  if (flushTimer != null || flushing) return;
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    void flushClickFlowQueue();
  }, CLICK_FLUSH_DELAY_MS);
}

async function flushClickFlowQueue() {
  if (flushing || queue.length === 0 || !hasAuthToken()) {
    return;
  }

  flushing = true;
  const batch = queue.splice(0, CLICK_BATCH_SIZE);

  try {
    await fetch('/api/analytics/clicks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('access_token') ?? ''}`
      },
      body: JSON.stringify({ events: batch }),
      keepalive: true
    });
  } catch {
    // Clickstream is best-effort. Drop failed batches to avoid blocking the UI.
  } finally {
    flushing = false;
    if (queue.length > 0) {
      scheduleFlush();
    }
  }
}

function enqueue(event: Omit<ClickFlowEvent, 'occurredAt'>) {
  if (!hasAuthToken()) return;

  queue.push({
    ...event,
    occurredAt: new Date().toISOString()
  });

  if (queue.length > 500) {
    queue = queue.slice(-500);
  }

  scheduleFlush();
}

export function trackPageView(page: string, metadata?: Record<string, unknown>) {
  enqueue({
    eventType: 'page_view',
    page,
    route: `${window.location.pathname}${window.location.search}`,
    metadata
  });
}

export function trackUiClick(input: {
  page: string;
  route?: string;
  label?: string;
  target?: string;
  sessionId?: string | null;
  stage?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  enqueue({
    eventType: 'ui_click',
    page: input.page,
    route: input.route ?? `${window.location.pathname}${window.location.search}`,
    label: normalizeText(input.label) || undefined,
    target: normalizeText(input.target) || undefined,
    sessionId: input.sessionId ?? null,
    stage: input.stage ?? null,
    resourceId: input.resourceId ?? null,
    metadata: input.metadata
  });
}

export function trackPracticeEvent(input: {
  eventType: string;
  page: string;
  route?: string;
  label?: string;
  target?: string;
  sessionId?: string | null;
  stage?: string | null;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  enqueue({
    eventType: input.eventType,
    page: input.page,
    route: input.route ?? `${window.location.pathname}${window.location.search}`,
    label: normalizeText(input.label) || undefined,
    target: normalizeText(input.target) || undefined,
    sessionId: input.sessionId ?? null,
    stage: input.stage ?? null,
    resourceId: input.resourceId ?? null,
    metadata: input.metadata
  });
}

export function installGlobalClickTracking() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => undefined;

  const handleClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const interactive = target.closest<HTMLElement>(
      'button, a, [role="button"], input[type="submit"], input[type="button"]'
    );
    if (!interactive) return;

    if (interactive instanceof HTMLButtonElement && interactive.disabled) return;
    if (interactive instanceof HTMLInputElement && interactive.disabled) return;
    if (interactive.getAttribute('aria-disabled') === 'true') return;

    const pageRoot = interactive.closest<HTMLElement>('[data-analytics-page]');
    const page = pageRoot?.dataset.analyticsPage || window.location.pathname.replace(/^\//, '') || 'unknown';
    const route = `${window.location.pathname}${window.location.search}`;
    const label =
      interactive.dataset.trackLabel ||
      interactive.getAttribute('aria-label') ||
      interactive.getAttribute('title') ||
      normalizeText(interactive.textContent);

    trackUiClick({
      page,
      route,
      label,
      target: interactive.tagName.toLowerCase(),
      sessionId: pageRoot?.dataset.analyticsSessionId || null,
      stage: pageRoot?.dataset.analyticsStage || null,
      resourceId: pageRoot?.dataset.analyticsResourceId || null,
      metadata: {
        id: interactive.id || null,
        role: interactive.getAttribute('role') || null,
        tagName: interactive.tagName.toLowerCase()
      }
    });
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      void flushClickFlowQueue();
    }
  };

  const handlePageHide = () => {
    void flushClickFlowQueue();
  };

  window.addEventListener('click', handleClick, true);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('pagehide', handlePageHide);

  return () => {
    window.removeEventListener('click', handleClick, true);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('pagehide', handlePageHide);
  };
}
