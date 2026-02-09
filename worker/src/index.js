const DEFAULT_PORT = 9876;

export default {
  fetch(request) {
    const url = new URL(request.url);

    let port = DEFAULT_PORT;
    const state = url.searchParams.get("state");
    if (state) {
      try {
        const decoded = JSON.parse(atob(state));
        if (decoded.p) port = decoded.p;
      } catch {
        // ignore malformed state, fall back to default port
      }
    }

    url.protocol = "http:";
    url.hostname = "localhost";
    url.port = String(port);

    return Response.redirect(url.toString(), 302);
  },
};
