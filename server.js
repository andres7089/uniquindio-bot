import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";

const app = express();
app.use(express.json());

// --------------------------------------------------------------------
// 🧠 Función para obtener fechas académicas desde la web de Uniquindío
// --------------------------------------------------------------------
async function obtenerFechas() {
  const url =
    "https://www.uniquindio.edu.co/actividades-por-subcategoria/4/consulta/";

  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  };

  const anioActual = new Date().getFullYear();
  console.log(`🌐 Obteniendo fechas académicas del año ${anioActual}...`);

  try {
    const { data } = await axios.get(url, { headers, timeout: 15000 });
    const $ = cheerio.load(data);

    // Extraer texto visible y eliminar ruido
    const textos = [];
    $("body *")
      .contents()
      .each((_, el) => {
        if (el.type === "text") {
          const t = $(el).text().trim();
          if (
            t &&
            !/(Tamaño de la letra|Accesibilidad|Campus Virtual|Buscar|Idioma|PQRSDF|Horario|Teléfono|Línea|Universidad del Quindío|Emisora|Carrera|atención)/i.test(
              t
            )
          ) {
            textos.push(t);
          }
        }
      });

    const actividades = [];
    let i = 0;
    while (i < textos.length) {
      const linea = textos[i];

      // Si no tiene números, probablemente sea el título
      if (!/\d/.test(linea) && linea.length > 5) {
        const titulo = linea;
        const fechas = [];
        i++;
        while (i < textos.length && /\d/.test(textos[i])) {
          fechas.push(textos[i]);
          i++;
        }
        if (fechas.length > 0) {
          actividades.push({ titulo, fechas });
        }
      } else {
        i++;
      }
    }

    // Agrupar por periodo
    const agrupadas = {};
    for (const act of actividades) {
      const { titulo, fechas } = act;
      for (let j = 0; j < fechas.length; j += 2) {
        const fechaTexto = fechas[j];
        const periodo = fechas[j + 1] || "N/A";
        if (!agrupadas[periodo]) agrupadas[periodo] = [];
        agrupadas[periodo].push({ titulo, fecha: fechaTexto });
      }
    }

    // Filtrar solo año actual
    const filtradas = Object.fromEntries(
      Object.entries(agrupadas).filter(([periodo, acts]) =>
        acts.some(
          (a) =>
            a.fecha.includes(anioActual.toString()) ||
            periodo.includes(anioActual.toString())
        )
      )
    );

    // Construir mensaje
    let resultado = `📅 *Fechas Académicas ${anioActual} (Modalidad Presencial)*\n\n`;
    for (const periodo of Object.keys(filtradas).sort()) {
      resultado += `📘 *Periodo ${periodo}*\n`;
      for (const { titulo, fecha } of filtradas[periodo]) {
        resultado += `🟢 *${titulo}*\n  • ${fecha}\n`;
      }
      resultado += "\n";
    }

    if (resultado.trim().length <= 50) {
      return `⚠️ No se encontraron fechas para el año ${anioActual}.`;
    }

    return resultado.trim();
  } catch (error) {
    console.error("❌ Error al obtener los datos:", error.message);
    return `❌ Error al obtener los datos: ${error.message}`;
  }
}

// --------------------------------------------------------------------
// 🪄 Webhook principal
// --------------------------------------------------------------------
app.post("/webhook", async (req, res) => {
  try {
    console.log("Solicitud recibida:", JSON.stringify(req.body, null, 2));

    const queryResult = req.body.queryResult || {};
    const intentName = queryResult.intent?.displayName?.toLowerCase() || "";
    const userQuery =
      queryResult.queryText?.toLowerCase() ||
      req.body.message?.text?.toLowerCase() ||
      "";

    console.log("Intent recibido:", intentName);
    console.log("Texto del usuario:", userQuery);

    const contienePalabraClave =
      userQuery.includes("fecha") || userQuery.includes("importante");

    if (
      intentName === "fechas_importantes" ||
      intentName === "fechas importantes" ||
      intentName === "fechas" ||
      contienePalabraClave
    ) {
      const respuesta = await obtenerFechas();
      res.json({ fulfillmentText: respuesta });
    } else {
      res.json({
        fulfillmentText:
          "Puedo ayudarte con las fechas académicas importantes de la Universidad del Quindío. ¿Deseas verlas?",
      });
    }
  } catch (error) {
    console.error("Error en el webhook:", error);
    res.json({
      fulfillmentText:
        "Ocurrió un error procesando tu solicitud. Intenta nuevamente.",
    });
  }
});

// --------------------------------------------------------------------
// 🔍 Endpoint raíz de prueba
// --------------------------------------------------------------------
app.get("/", (req, res) => {
  res.send("✅ Webhook de la Universidad del Quindío activo y funcionando");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en el puerto ${PORT}`);
});
