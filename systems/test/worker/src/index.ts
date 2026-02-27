// Test Worker — minimal health-check worker for validating cf-deploy topology.

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return Response.json({ status: "ok", worker: "test-worker" });
    }

    return new Response("test-worker is running", {
      headers: { "content-type": "text/plain" },
    });
  },
};
