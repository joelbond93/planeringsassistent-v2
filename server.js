const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const OPENAI_KEY = process.env.OPENAI_API_KEY;

async function callOpenAI(messages) {
  const fullMessages = [
    {
      role: "system",
      content: `
Du är en smart, tydlig och praktisk planeringsassistent.

Svara alltid:
- kort (1–3 meningar)
- konkret
- utan onödiga förklaringar

Ge alltid:
- EN tydlig nästa riktning
- FYRA konversationella fortsättningar (knappar)

Format (MÅSTE följas):
Knapp: alternativ 1;
Knapp: alternativ 2;
Knapp: alternativ 3;
Knapp: alternativ 4;
`
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
      max_tokens: 350
    })
  });

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "Tomt AI-svar.";
}

app.post("/api/chat", async (req, res) => {
  const messages = req.body.messages || [];
  const answer = await callOpenAI(messages.slice(-8));
  res.json({ message: answer });
});

app.listen(3000, () =>
  console.log("🚀 Server kör på http://localhost:3000")
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log("🚀 Server running on port", PORT)
);