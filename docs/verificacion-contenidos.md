# Verificación de contenidos (tarea 17)

Fecha: 2026-10-10. Todas las páginas se abrieron ese día. Los PDF y las imágenes se descargaron y se leyeron en local.

## 1. Fuentes (`src/contenido/fuentes.ts`)

| id | URL | ¿Responde? | Afirmación de la app que respalda | ¿La respalda? | Cita |
|---|---|---|---|---|---|
| `aepd-informe` | https://www.aepd.es/documento/2023-0048.pdf | Sí (PDF; texto extraído con `pdftotext`) | Buenas prácticas, «Pregunta antes si de verdad necesitan una copia» | Parcialmente. **Corregido** | «la solicitud del DNI con la toma de una copia del mismo sería, en principio, un tratamiento excesivo, y que no puede instaurarse por sistema, sino que habrá que analizar, caso por caso». El informe no dice que baste con enseñar el DNI ni con un certificado digital; se eliminó esa parte |
| `incibe-caso` | https://www.incibe.es/linea-de-ayuda-en-ciberseguridad/casos-reales/tras-ser-suplantado-con-su-dni-acaba-debiendo-impuestos-la-agencia-tributaria | Sí | Buenas prácticas, «Si sospechas un uso fraudulento, actúa» (denunciar). También la guía: INCIBE sugiere pixelar la fotografía | Sí | «Realizar una denuncia, por suplantación de identidad, ante las Fuerzas y Cuerpos de Seguridad del Estado»; recomienda «Pixelar la foto» y una «Marca de agua» que indique la finalidad |
| `incibe-017` | https://www.incibe.es/linea-de-ayuda-en-ciberseguridad | Sí | Buenas prácticas, «llama al 017, la línea de ayuda en ciberseguridad de INCIBE» | Sí | Servicio «nacional, gratuito, confidencial y personalizado»; el 017 es «un número gratuito, confidencial y fácil de recordar» |
| `ocu` | https://www.ocu.org/consumo-familia/derechos-consumidor/noticias/compartir-dni-con-seguridad/ | Sí | Solo una cara; marca de agua; blanco y negro; ocultar datos; formato aplanado; denunciar (buenas prácticas y explicaciones `color` y `ocultar`) | Sí | «No mandes las dos caras del DNI»; «Envía una versión en blanco y negro»; «Incluye un mensaje visible en la imagen que indique el motivo del envío y la fecha»; «Oculta las fechas de emisión y validez, el número CAN, el Código MRZ y el IDESP»; JPG porque «los datos tapados no se podrán recuperar»; «Presenta una denuncia ante la Policía». La OCU no menciona la firma (la respaldan Genbeta y Maldita) |
| `policia-genbeta` | https://www.genbeta.com/seguridad/policia-explica-como-compartir-imagen-tu-dni-internet-para-evitar-ser-victima-estafas | Sí | Blanco y negro (buenas prácticas y explicación `color`) | Parcialmente | Tres medidas: pixelar o borrar la firma y datos irrelevantes, marca de agua con la finalidad y blanco y negro (la Policía lo recomendó en TikTok). El artículo señala que el blanco y negro es **menos eficaz** que las otras dos medidas, pero indica claramente que es una copia. La redacción de la app es compatible |
| `maldita` | https://maldita.es/malditatecnologia/20240709/compartir-forma-segura-foto-dni-recop/ | Sí (página de ~575 kB; texto extraído con un script) | Marca de agua que cubra todo el documento; ocultar datos; «Envíala por canales oficiales» | Sí para marca de agua y ocultar. «Canales oficiales»: parcialmente. **Corregido** | «Pixelar o tachar la información no relevante [...] como la foto de nuestra cara, la firma, su validez, los nombres de nuestros padres o la dirección de nuestro domicilio. Poner una marca de agua, un mensaje que atraviese todo el DNI e indique la finalidad». La página **no** habla de redes sociales, nube ni chats; solo dice que el banco «nunca nos pedirá nuestros datos personales [...] a través de SMS, correos electrónicos, enlaces o llamadas telefónicas» y que para eso están la web o la app. Se reescribió la práctica con eso |
| `aeat-soporte` | https://sede.agenciatributaria.gob.es/Sede/ayuda/consultas-informaticas/firma-digital-sistema-clave-pin-tecnica/incidencias-tecnicas-clave-pin/obtencion-fecha-dni.html | Sí | Guía: «Algunos servicios lo usan para validar el documento» (número de soporte). Se cita en la guía, no en `buenasPracticas.ts` ni `explicaciones.ts` (`grep` sin resultados fuera de `fuentes.ts`) | Sí | Para Cl@ve se pide el número de soporte (en el anverso, bajo «NUM SOPORTE» en el DNI 4.0 y «NUM SOPORT» en el 3.0) y las fechas de validez y expedición |

Nota sobre `aeat-soporte`: la tabla de uso (`grep -rn "aeat-soporte" src`) solo la encuentra definida en `fuentes.ts`; la respalda la frase de la guía, pero ningún elemento la enlaza todavía. No se cambió la estructura.

Observaciones (sin cambios):
- OCU y Maldita recomiendan ocultar también las fechas o la validez; la guía las clasifica como «no ocultar». Es una decisión de diseño razonable porque la AEAT las pide para validar el documento (Cl@ve), pero conviene saber que las fuentes divergen.
- Las explicaciones sin fuente (`destinatario`, `finalidad`, `referencia`, `fecha`, `opacidad`, `densidad`, `formato`) son criterio de la propia app y no citan fuentes, así que no se verificaron.

## 2. Guía de ocultación (`src/contenido/guiaOcultar.ts`)

Fuente oficial: portal del DNI electrónico de la Policía Nacional, https://www.dnielectronico.es. Las páginas «Descripción DNI 3.0» (`pag=REF_103`) y «Descripción DNI 4.0» (`pag=REF_110`) son imágenes anotadas; se descargaron y se leyeron: `/img/DNI_PERSPECTIVA_3.jpg` y `/img/Imagen_DNI_4.0.JPG`.

| Dato | DNI 3.0 | DNI 4.0 | Qué afirma la app | Resultado |
|---|---|---|---|---|
| CAN | Sí, anverso («Número CAN», 6 cifras) | Sí, anverso («CAN», 6 cifras) | «código de 6 cifras de los DNI electrónicos» | Correcto. **Concretado** a «del anverso de los DNI 3.0 y 4.0» |
| Número de soporte | Sí, anverso («Número de soporte») | Sí, anverso («NUM SOPORTE»); AEAT lo confirma | Identifica la tarjeta, cambia con cada renovación; algunos servicios lo usan para validar | Correcto. La AEAT lo pide en Cl@ve. «Cambia con cada renovación»: lo dice una fuente no oficial (cohenyaguirre.es, vista en la búsqueda), coherente con que identifique la tarjeta física |
| Firma | Sí, anverso | Sí, anverso | Ocultarla evita que la copien | Correcto. Genbeta/Policía («Pixela o borra tu firma») e INCIBE la recomiendan ocultar. «Rara vez se compara» es opinión de la app, sin fuente |
| Nombre de los padres | Sí, reverso («Hijo/a de») | Sí, reverso («Hijo/a de») | «(en los DNI que los incluyen)» | Correcto. Se mantiene la salvedad por los DNI antiguos. Maldita cita los nombres de los padres entre los datos a ocultar |
| Lugar de nacimiento | Sí, reverso | Sí, reverso | Igual que los padres | Correcto |
| Domicilio | Sí, reverso («Domicilio» y «Lugar de domicilio») | Sí, reverso | Ocultable salvo que el trámite lo requiera | Correcto. Maldita lo cita entre los datos a ocultar |
| Fotografía | Sí, anverso | Sí, anverso | La entidad la exige; INCIBE sugiere pixelarla | Correcto. INCIBE: «Pixelar la foto». Maldita también la nombra |
| Zona de lectura mecánica | Sí, reverso (3 líneas «<<<», «Caracteres OCR») | Sí, reverso | «repite tus datos» | Correcto. **Ampliado**: las líneas contienen también el número de soporte (en la imagen oficial del 3.0, `IDESPBAA000589...`, y en la del 4.0, `IDESPCAA00000049999999R`), de modo que ocultar el soporte del anverso y dejar la zona visible no sirve. La OCU recomienda ocultar el «Código MRZ» |
| Datos que no se ocultan | Nombre, apellidos, número de DNI y fecha de validez, en el anverso | Igual | «te lo rechazarán» | Coherente con la AEAT (pide las fechas). Divergen OCU y Maldita (ver arriba). La fecha de nacimiento también está en el anverso |

Alcance: se usaron los ejemplares ficticios de la Policía Nacional (texto «ESPECIMEN»). No se comprobó la primera versión del DNIe (2006-2015), donde la AEAT usa «IDESP» para el número de soporte; la salvedad «en los DNI que los incluyen» y la mención a los DNI 3.0 y 4.0 cubren esa diferencia.

## 3. Cambios de texto

| Fichero | Antes | Después | Motivo |
|---|---|---|---|
| `src/contenido/buenasPracticas.ts` | «La AEPD considera excesivo pedirla solo para identificar a alguien; a veces basta con enseñar el DNI o identificarse con certificado digital.» | «La AEPD considera que pedir una copia del DNI es, en principio, un tratamiento excesivo: no puede exigirse por sistema y hay que valorar cada caso.» | Informe 0048/2023 |
| `src/contenido/buenasPracticas.ts` | «Envíala por canales oficiales.» / «Nunca por redes sociales, y no la dejes guardada en la nube ni en los chats.» | «Envíala solo por los canales oficiales de la entidad.» / «Un banco, por ejemplo, nunca pide datos personales por SMS, correo, enlaces ni llamadas, sino a través de su web o su app.» | Maldita no respalda lo anterior |
| `src/contenido/buenasPracticas.ts` | «Envíala solo por los canales oficiales de la entidad.» (una sola práctica, fuente `maldita`) | Dos prácticas: (a) «Envíala solo a quien la pidió y bórrala cuando ya no la necesites» (criterio propio de la app, **sin fuente**: no la respalda ninguna de las fuentes consultadas) y (b) «Desconfía de quien te pida datos haciéndose pasar por tu banco» (fuente `maldita`, fiel a la cita sobre SMS, correos, enlaces y llamadas) | Se había perdido «no la dejes guardada en la nube ni en los chats» al corregir la práctica |
| `src/contenido/guiaOcultar.ts` | CAN: «de los DNI electrónicos» | «del anverso de los DNI 3.0 y 4.0» | Portal oficial del DNI |
| `src/contenido/guiaOcultar.ts` | Zona de lectura mecánica: «repite tus datos» | «repite tus datos (también el número de soporte)» | Imágenes oficiales del DNI |

Ninguna prueba e2e comprueba estos textos (`grep` en `tests/`).
