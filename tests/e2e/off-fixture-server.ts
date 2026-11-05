import { createServer } from "node:http";
import { frenchProduct, FR_GTIN, offMissing, offSuccess } from "../fixtures/product-sources";

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  if (url.pathname === "/ready") {
    response.end("ready");
    return;
  }
  const match = /^\/api\/v3\/product\/(\d+)$/.exec(url.pathname);
  if (!match) {
    response.writeHead(400).end();
    return;
  }
  const [, barcode] = match;
  const found = barcode === FR_GTIN;
  response.writeHead(found ? 200 : 404, { "Content-Type": "application/json" });
  response.end(JSON.stringify(found ? offSuccess(frenchProduct) : offMissing(barcode)));
});

server.listen(3101, "127.0.0.1");
