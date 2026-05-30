import OpenAI from "openai";

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (_client) return _client;

  const apiKey = process.env.OPENAI_API_KEY ?? process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Passport OCR is disabled until you add a key to .env",
    );
  }

  const baseURL = process.env.OPENAI_BASE_URL ?? process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

  _client = new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });

  return _client;
}

/** Lazy OpenAI client — server starts without OPENAI_API_KEY; OCR fails at call time. */
export const openai = new Proxy({} as OpenAI, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
