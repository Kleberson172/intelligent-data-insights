// Antes de correr este script, defina as variáveis de ambiente:
//   Windows (PowerShell):
//     $env:AI_INTEGRATIONS_OPENAI_API_KEY="a-sua-chave"
//     $env:AI_INTEGRATIONS_OPENAI_BASE_URL="https://generativelanguage.googleapis.com/v1beta/openai/"
//   Mac/Linux:
//     export AI_INTEGRATIONS_OPENAI_API_KEY="a-sua-chave"
//     export AI_INTEGRATIONS_OPENAI_BASE_URL="https://generativelanguage.googleapis.com/v1beta/openai/"
//
// NUNCA escreva a chave diretamente neste ficheiro - o repositório é público.

import OpenAI from "openai";

const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

if (!apiKey || !baseURL) {
  console.error(
    "ERRO: defina AI_INTEGRATIONS_OPENAI_API_KEY e AI_INTEGRATIONS_OPENAI_BASE_URL nas variaveis de ambiente antes de correr este script."
  );
  process.exit(1);
}

const client = new OpenAI({ apiKey, baseURL });

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
