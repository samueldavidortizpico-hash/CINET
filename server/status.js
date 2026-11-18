const statusCodes = new Map([
  ["200", { status: 200 }],
  ["301", { status: 301, location: "/status/200" }],
  ["400", { status: 400 }],
  ["404", { status: 404 }],
]);

/** Responde con la SPA y conserva el código HTTP de las páginas /status/:code. */
export function createStatusHandler(getHtml) {
  return async function statusHandler(req, res) {
    const url = new URL(req.url ?? "/", "http://localhost");
    const code = url.searchParams.get("code") ?? url.pathname.split("/").filter(Boolean).at(-1);
    const response = statusCodes.get(code) ?? { status: 404 };
    const html = await getHtml(req);

    res.writeHead(response.status, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      ...(response.location && { location: response.location }),
    });
    res.end(html);
  };
}
