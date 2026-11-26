# Viajecillo

Juego de geografía: te dan un país de origen (verde) y uno de destino (azul). Escribe países
(con autocompletado) hasta que la cadena de fronteras los conecte. Los países que añades salen en amarillo.

## Ejecutar
Necesita servir los archivos (no abrir el HTML con doble clic si tu navegador bloquea scripts locales; suele funcionar igual):

    cd viajecillo
    python3 -m http.server 8000      # o: npx serve .

y abre http://localhost:8000

Las banderas se cargan de flagcdn.com (si no hay internet, se omiten). Los datos del mapa van incluidos (`data.js`).
Para regenerar: `cd tools && npm i && node build-data.mjs`.
