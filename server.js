import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";

const app = express();
app.use(express.json());

// --- Función para obtener fechas desde la página de Uniquindío ---
async function obtenerFechas() {
  try {
    const url = "https://www.uniquindio.edu.co/actividades-por-subcategoria/4/consulta/";
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const fechas = [];

    // Buscar textos que tengan formato de fecha como dd/mm/yyyy o similar
    const regexFecha =
      /(\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b|\b\d{1,2}\s+de\s+[A-Za-záéíóúÁÉÍÓÚ]+\s+de\s+\d{4}\b)/g;

    $("body *").each((i, el) => {
      const texto = $(el).text().trim();
      const coincidencias = texto.match(regexFecha);
      if (coincidencias) {
        coincidencias.forEach((f) => fechas.push(f));
      }
    });

    // Eliminar duplicados
    return [...new Set(fechas)];
  } catch (error) {
    console.error("Error obteniendo fechas:", error.message);
    return [];
  }
}

// --- Webhook principal ---
app.post("/webhook", async (req, res) => {
  try {
    console.log("Solicitud recibida:", JSON.stringify(req.body, null, 2));

    // Detectar si viene de Dialogflow o Telegram
    const queryResult = req.body.queryResult || {};
    const intentName = queryResult.intent?.displayName?.toLowerCase() || "";
    const userQuery =
      queryResult.queryText?.toLowerCase() ||
      req.body.message?.text?.toLowerCase() ||
      "";

    console.log("Intent recibido:", intentName);
    console.log("Texto del usuario:", userQuery);

    // Detectar palabras clave
    const contienePalabraClave =
      userQuery.includes("fecha") || userQuery.includes("importante");

    // --- Lógica principal ---
    if (
      intentName === "fechas_importantes" ||
      intentName === "fechas importantes" ||
      intentName === "fechas" ||
      contienePalabraClave
    ) {
      const fechas = await obtenerFechas();
      const respuesta =
        fechas.length > 0
          ? `📅 Estas son las fechas importantes encontradas en la página:\n\n${fechas.join(
              "\n"
            )}`
          : "No se encontraron fechas en la página.";
      res.json({ fulfillmentText: respuesta });
    } else {
      res.json({
        fulfillmentText:
          "Puedo ayudarte con las fechas importantes de la Universidad del Quindío. ¿Quieres que te las muestre?"
      });
    }
  } catch (error) {
    console.error("Error en el webhook:", error);
    res.json({
      fulfillmentText:
        "Ocurrió un error procesando la solicitud del webhook. Intenta nuevamente."
    });
  }
});

// --- Endpoint de prueba ---
app.get("/", (req, res) => {
  res.send("✅ Webhook de la Universidad del Quindío activo y funcionando");
});

// --- Configuración del puerto (Render usa process.env.PORT) ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});
