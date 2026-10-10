import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import {
  abrirPaso,
  analizarPdf,
  ARRASTRE_SOBRE_ROJO,
  cargar,
  dibujarRecuadro,
  esperarVistaPrevia,
  generarYDescargar,
  vigilarConsola,
} from "./utilidades.ts";

async function flujoCompleto(page: Page) {
  await cargar(page, "dni-ficticio.pdf");
  await esperarVistaPrevia(page);
  await abrirPaso(page, "Ocultar datos");
  await dibujarRecuadro(page, ...ARRASTRE_SOBRE_ROJO);
  return generarYDescargar(page);
}

/** Registra el origen de toda petición (también blob:, no data:) y cualquier WebSocket. */
function vigilarOrigenes(context: BrowserContext, page: Page) {
  const origenes = new Set<string>();
  const websockets: string[] = [];
  context.on("request", (peticion) => {
    const url = peticion.url();
    if (/^data:/i.test(url)) return;
    origenes.add(new URL(url).origin);
  });
  page.on("websocket", (ws) => websockets.push(ws.url()));
  return { origenes, websockets };
}

async function esperarControlDelServiceWorker(page: Page, origen: string) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => navigator.serviceWorker.controller !== null),
    )
    .toBe(true);
  const script = await page.evaluate(
    () => navigator.serviceWorker.controller!.scriptURL,
  );
  expect(new URL(script).origin).toBe(origen);
}

test.describe("Privacidad", () => {
  test("ninguna petición sale del propio origen y no hay errores de CSP", async ({
    page,
    context,
    baseURL,
  }) => {
    const origen = new URL(baseURL!).origin;
    const errores = vigilarConsola(page);
    const { origenes, websockets } = vigilarOrigenes(context, page);
    await page.goto("/");
    await flujoCompleto(page);
    expect([...origenes]).toEqual([origen]);
    expect(websockets).toEqual([]);
    expect(errores).toEqual([]);
  });

  test("con el service worker controlando la página tampoco sale nada del origen", async ({
    page,
    context,
    baseURL,
    browserName,
  }) => {
    test.skip(
      browserName === "webkit",
      "El service worker de WebKit en Playwright no es fiable; se verifica a mano (tarea 18)",
    );
    const origen = new URL(baseURL!).origin;
    const errores = vigilarConsola(page);
    const { origenes, websockets } = vigilarOrigenes(context, page);
    await page.goto("/");
    await esperarControlDelServiceWorker(page, origen);
    await flujoCompleto(page);
    expect([...origenes]).toEqual([origen]);
    expect(websockets).toEqual([]);
    expect(errores).toEqual([]);
  });

  test("no guarda nada en el navegador", async ({ page }) => {
    await page.goto("/");
    await flujoCompleto(page);
    const almacen = await page.evaluate(async () => ({
      local: localStorage.length,
      sesion: sessionStorage.length,
      cookies: document.cookie,
      bases: (await indexedDB.databases()).map((b) => b.name),
    }));
    expect(almacen).toEqual({ local: 0, sesion: 0, cookies: "", bases: [] });
  });

  test("funciona sin conexión tras la primera visita", async ({
    page,
    context,
    baseURL,
    browserName,
  }) => {
    test.skip(
      browserName === "webkit",
      "El service worker de WebKit en Playwright no es fiable; se verifica a mano (tarea 18)",
    );
    const origen = new URL(baseURL!).origin;
    const errores = vigilarConsola(page);
    const { origenes, websockets } = vigilarOrigenes(context, page);
    await page.goto("/");
    await esperarControlDelServiceWorker(page, origen);
    await context.setOffline(true);
    await page.reload();
    const { bytes } = await flujoCompleto(page);
    expect((await analizarPdf(bytes)).paginas).toBe(1);
    expect([...origenes]).toEqual([origen]);
    expect(websockets).toEqual([]);
    expect(errores).toEqual([]);
  });

  test("es instalable: manifest con nombre, idioma, iconos válidos y modo standalone", async ({
    page,
    request,
    baseURL,
  }) => {
    await page.goto("/");
    const href = await page
      .locator('link[rel="manifest"]')
      .getAttribute("href");
    const urlManifest = new URL(href!, baseURL).href;
    const manifest = await (await request.get(urlManifest)).json();
    expect(manifest).toMatchObject({
      name: "Protege DNI",
      lang: "es",
      display: "standalone",
    });
    expect(manifest.icons).toHaveLength(3);
    for (const icono of manifest.icons) {
      const respuesta = await request.get(new URL(icono.src, urlManifest).href);
      expect(respuesta.ok(), icono.src).toBe(true);
      expect(respuesta.headers()["content-type"], icono.src).toMatch(
        /^image\//,
      );
    }
    const tamanos = manifest.icons.map((i: { sizes: string }) => i.sizes);
    expect(tamanos).toContain("192x192");
    expect(tamanos).toContain("512x512");
    expect(
      manifest.icons.some(
        (i: { purpose?: string }) => i.purpose === "maskable",
      ),
    ).toBe(true);
    expect(new URL(manifest.start_url, urlManifest).origin).toBe(
      new URL(baseURL!).origin,
    );
  });
});
