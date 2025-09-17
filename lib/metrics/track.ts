// Simple metrics tracking
// In production, you might send to an analytics service

const metrics: Record<string, number> = {};

export async function track(event: string, value: number = 1) {
  if (!metrics[event]) {
    metrics[event] = 0;
  }
  metrics[event] += value;
  
  // Log for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log('[METRICS]', event, metrics[event]);
  }
}

export function getMetrics() {
  return { ...metrics };
}
