process.env.AI_INTEGRATIONS_OPENAI_API_KEY = "AIzaSyCMB0uPvAUAHSFIqIn7XpD6tNAqF0InRyk";
process.env.AI_INTEGRATIONS_OPENAI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/";

import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

try {
  const res = await client.chat.completions.create({
    model: "gemini-2.5-flash",
    messages: [{ role: "user", content: "ola" }],
  });
  console.log("SUCESSO:", res.choices[0].message.content);
} catch (err) {
  console.log("ERRO:", err.status, err.message);
  console.log(err);
}
