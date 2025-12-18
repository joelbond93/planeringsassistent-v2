const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const OPENAI_KEY = process.env.OPENAI_API_KEY;

/* =====================
   SYSTEM PROMPT (MED DATUM)
===================== */
function getSystemPrompt() {
  const today = new Date().toISOString().split("T")[0];

  return `
Dagens datum är ${today}.
Detta är ENDAST en referens.

LÄNKAR:
- Du får inkludera länkar när det är praktiskt och hjälper användaren vidare
- Använd länkar sparsamt och bara när de tillför konkret värde
- Föredra:
  - officiella webbplatser
  - välkända tjänster
- Använd alltid fullständiga https-länkar
- Bädda in länkar naturligt i texten
- Använd aldrig markdown
- Skriv länkar som ren text (https://...)
SÄKERHET:
- Länka endast till välkända, etablerade webbplatser
- Undvik:
  - nedladdningssidor
  - filer
  - okända domäner
- Länka aldrig till:
  - .exe
  - .zip
  - .dmg
  - .apk
- Använd inte förkortade länkar
Om möjligt, föredra länkar från:
- visitnorway.com
- skyscanner.com
- booking.com
- koket.se
- livsmedelsverket.se
- trello.com
- notion.so

SÄSONGSMEDVETENHET:
- Använd dagens datum för att förstå aktuell säsong
- Anpassa förslag efter rimlig säsong:
  - sommar: undvik vinteraktiviteter om de inte uttryckligen efterfrågas
  - vinter: undvik sommaraktiviteter om de inte uttryckligen efterfrågas
- Om en idé är säsongsberoende men kan fungera ändå:
  - formulera den neutralt eller framtidsöppet
- Anta aldrig användarens plats eller klimat
- Undvik att nämna säsong eller månad om det inte är relevant

VIKTIGT:
- Nämn INTE datum om det inte är relevant
- Tvinga ALDRIG fram ett datum
- Om du nämner ett datum:
  - det får ALDRIG ligga i det förflutna
  - använd framtida eller neutrala formuleringar
- Det är helt okej att svara utan datum alls

Du är en smart, tydlig och praktisk planeringsassistent.

Svara alltid:
- kort (1–3 meningar)
- konkret
- utan onödiga förklaringar

Ge alltid:
- EN tydlig nästa riktning
- FYRA konversationella fortsättningar (knappar)

Knapparna ska:
- vara 5–12 ord
- kännas som naturliga repliker
- aldrig vara frågor
- aldrig vara generiska

FORMAT (MÅSTE följas exakt):
Knapp: alternativ 1;
Knapp: alternativ 2;
Knapp: alternativ 3;
Knapp: alternativ 4;
`;
}


/* =====================
   OPENAI CALL
===================== */
async function callOpenAI(messages) {
  const fullMessages = [
    {
      role: "system",
      content: getSystemPrompt()
    },
    ...messages
  ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: fullMessages,
      temperature: 0.6,   // minskar hallucinationer
      max_tokens: 350
    })
  });

  const data = await res.json();

  if (data.error) {
    console.error("OpenAI error:", data.error);
    return "AI-fel uppstod.";
  }

  return data.choices?.[0]?.message?.content || "Tomt AI-svar.";
}

/* =====================
   API ENDPOINT
===================== */
app.post("/api/chat", async (req, res) => {
  try {
    const messages = req.body.messages || [];
    const answer = await callOpenAI(messages.slice(-8));
    res.json({ message: answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Serverfel" });
  }
});

app.post("/api/custom-start", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ cards: null });
  }

  const messages = [
    {
      role: "system",
      content: "Du genererar endast startförslag, aldrig konversation."
    },
    {
      role: "user",
      content: prompt
    }
  ];

  try {
    const text = await callOpenAI(messages);
    const cards = text
      .split("\n")
      .map(l => l.trim())
      .filter(Boolean)
      .slice(0, 3);

    res.json({ cards });
  } catch (err) {
    console.error(err);
    res.status(500).json({ cards: null });
  }
});

/* =====================
   START SERVER (ENDA)
===================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server kör på port ${PORT}`)
);
