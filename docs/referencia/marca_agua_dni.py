#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.9"
# dependencies = ["pymupdf>=1.24"]
# ///
"""
Añade una marca de agua a la copia de un DNI (PDF o imagen JPG/PNG).

Todo se procesa en local: el documento no se envía a ningún sitio.

La marca se dibuja en diagonal y repetida sobre toda la página, y después
la página entera se convierte en una imagen. Así la marca queda "quemada"
en los píxeles: no se puede borrar con un editor de PDF (no queda como capa
ni anotación aparte). El PDF resultante tampoco conserva texto seleccionable
ni los metadatos del original.

Uso:
    uv run marca_agua_dni.py "DNI.pdf"
    uv run marca_agua_dni.py "DNI.pdf" --referencia "CUPS ES0031XXXXXXXXXXXXXX"
    uv run marca_agua_dni.py --help
"""

import argparse
import datetime
import math
import sys
from pathlib import Path

import pymupdf

DESTINATARIO = "E-DISTRIBUCIÓN"
FINALIDAD = "Solo para cambio de datos personales de la instalación"


def construir_texto(destinatario, finalidad, referencia, fecha):
    partes = [f"Copia para {destinatario}", finalidad]
    if referencia:
        partes.append(referencia)
    partes += [fecha, "No válida para otro uso"]
    return " · ".join(partes)


def abrir(ruta):
    doc = pymupdf.open(ruta)
    if doc.needs_pass:
        sys.exit(f"'{ruta}' está protegido con contraseña; quítala antes.")
    if not doc.is_pdf:
        # Imagen (JPG, PNG...): convertirla a PDF de una página.
        doc = pymupdf.open("pdf", doc.convert_to_pdf())
    return doc


def dibujar_marca(pagina, texto, opacidad):
    r = pagina.rect
    fuente = pymupdf.Font("helv")
    tam = max(7.0, min(r.width, r.height) / 45)
    linea = texto + "     "
    largo = fuente.text_length(linea, fontsize=tam)
    centro = pymupdf.Point(r.x0 + r.width / 2, r.y0 + r.height / 2)
    # Se rellena un cuadrado que cubre la página incluso después de girarlo.
    radio = math.hypot(r.width, r.height)
    fila = linea * (int(2 * radio / largo) + 2)
    paso = tam * 2.6

    escritor = pymupdf.TextWriter(r, opacity=opacidad, color=(0.1, 0.1, 0.1))
    y, i = centro.y - radio, 0
    while y < centro.y + radio:
        # Filas alternas desplazadas para que no quede ningún hueco alineado.
        x = centro.x - radio - (i % 2) * largo / 2
        escritor.append((x, y), fila, font=fuente, fontsize=tam)
        y += paso
        i += 1
    escritor.write_text(pagina, morph=(centro, pymupdf.Matrix(30)))


def marcar(entrada, salida, texto, opacidad, dpi, color):
    origen = abrir(entrada)
    resultado = pymupdf.open()
    espacio = pymupdf.csRGB if color else pymupdf.csGRAY

    for pagina in origen:
        r = pagina.rect
        # 1) Página original -> imagen (respeta la rotación de la página).
        imagen = pagina.get_pixmap(dpi=dpi)
        # 2) Imagen + marca de agua en una página temporal.
        temporal = pymupdf.open()
        hoja = temporal.new_page(width=r.width, height=r.height)
        hoja.insert_image(hoja.rect, pixmap=imagen)
        dibujar_marca(hoja, texto, opacidad)
        # 3) Todo junto -> una sola imagen, que es lo único que va al PDF final.
        plana = hoja.get_pixmap(dpi=dpi, colorspace=espacio)
        nueva = resultado.new_page(width=r.width, height=r.height)
        nueva.insert_image(nueva.rect, stream=plana.tobytes("jpeg", jpg_quality=85))

    resultado.set_metadata({})
    resultado.del_xml_metadata()
    resultado.save(salida, garbage=4, deflate=True)
    return resultado.page_count


def main():
    hoy = datetime.date.today().strftime("%d/%m/%Y")
    p = argparse.ArgumentParser(description="Añade una marca de agua a la copia de un DNI.")
    p.add_argument("entrada", type=Path, help="PDF o imagen del DNI")
    p.add_argument("-o", "--salida", type=Path,
                   help="fichero de salida (por defecto: '<nombre> - marca de agua.pdf')")
    p.add_argument("--destinatario", default=DESTINATARIO, help=f"por defecto: {DESTINATARIO}")
    p.add_argument("--finalidad", default=FINALIDAD, help=f"por defecto: {FINALIDAD}")
    p.add_argument("--referencia", help="CUPS o nº de solicitud del trámite (opcional)")
    p.add_argument("--fecha", default=hoy, help=f"por defecto: hoy ({hoy})")
    p.add_argument("--texto", help="texto completo de la marca (sustituye a los anteriores)")
    p.add_argument("--opacidad", type=float, default=0.4, help="de 0 a 1 (por defecto: 0.4)")
    p.add_argument("--dpi", type=int, default=200, help="resolución (por defecto: 200)")
    p.add_argument("--color", action="store_true",
                   help="mantener el color (por defecto se genera en escala de grises)")
    args = p.parse_args()

    if not args.entrada.is_file():
        sys.exit(f"No existe el fichero '{args.entrada}'.")
    salida = args.salida or args.entrada.with_name(f"{args.entrada.stem} - marca de agua.pdf")
    if salida.resolve() == args.entrada.resolve():
        sys.exit("La salida no puede ser el mismo fichero que la entrada.")

    texto = args.texto or construir_texto(args.destinatario, args.finalidad,
                                          args.referencia, args.fecha)
    paginas = marcar(args.entrada, salida, texto, args.opacidad, args.dpi, args.color)
    print(f"Marca de agua: {texto}")
    print(f"Guardado en: {salida} ({paginas} página{'s' if paginas != 1 else ''})")


if __name__ == "__main__":
    main()
