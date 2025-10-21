const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
app.use(bodyParser.json());

// Función para extraer fechas desde la web
async function obtenerFechas() {
  const url = "https://www.uniquindio.edu.co/actividades-por-subcategoria/4/consulta/";

  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    const fechas = [];

    // Aquí depende de cómo esté el HTML de esa página.
    // Por ejemplo, si las fechas están dentro de etiquetas <span class="fecha">:
    $("span, p, div").each((i, el) => {
      const texto = $(el).text();
      const regexFecha = /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g; // busca fechas como 21/10/2025
      const encontradas = texto.match(regexFecha);
      if (encontradas) {
        fechas.push(...encontradas);
      }
    });

    return fechas.length ? fechas : ["No se encontraron fechas en la página."];
  } catch (error) {
    console.error("Error al obtener fechas:", error.message);
    return ["Error al acceder al sitio web."];
  }
}

// Endpoint para Dialogflow
app.post("/webhook", async (req, res) => {
  const intentName = req.body.queryResult.intent.displayName;

 if ( intentName === "fechas_importantes" ||intentName === "fechas importantes" ||intentName === "fechas" ) {
    const fechas = await obtenerFechas();
    res.json({
      fulfillmentText: `Estas son las fechas encontradas en la página: ${fechas.join(", ")}`
    });
  } else {
    res.json({ fulfillmentText: "No entiendo tu solicitud." });
  }
});

// Render usa este puerto automáticamente
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor webhook activo en puerto ${PORT}`));
