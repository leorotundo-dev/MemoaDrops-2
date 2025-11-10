import client from 'prom-client';
export const httpLatency = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency per route',
  labelNames: ['method','route','status'],
  buckets: [0.01,0.05,0.1,0.2,0.5,1,2,5]
});
export function metricsOnResponse(opts?: { getRoute?: (url:string)=>string }){
  return async function (_req:any, reply:any){
    const r = reply.request;
    const route = (r.routerPath || r.url || 'unknown').toString();
    const labels = { method: r.method, route, status: String(reply.statusCode) };
    const dur = (reply.getResponseTime && reply.getResponseTime()) || 0;
    httpLatency.observe(labels, dur/1000);
  }
}
