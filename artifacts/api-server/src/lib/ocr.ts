import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "./logger";

export interface ExtractedPassportData {
  fullName: string | null;
  passportNumber: string | null;
  dateOfBirth: string | null;
  dateOfIssue: string | null;
  dateOfExpiry: string | null;
  address: string | null;
  nationality: string | null;
}

const EXTRACTION_PROMPT = `You are a passport OCR expert specializing in Bangladesh and Indian passports.
Extract the following fields from the passport image:
- Full Name (as printed on the passport)
- Passport Number
- Date of Birth (in DD/MM/YYYY or YYYY-MM-DD format)
- Date of Issue (in DD/MM/YYYY or YYYY-MM-DD format)
- Date of Expiry (in DD/MM/YYYY or YYYY-MM-DD format)
- Address (permanent address if visible)
- Nationality (must be one of: "bangladesh" or "india" based on the passport)

Respond ONLY with a valid JSON object in this exact format:
{
  "fullName": "...",
  "passportNumber": "...",
  "dateOfBirth": "...",
  "dateOfIssue": "...",
  "dateOfExpiry": "...",
  "address": "...",
  "nationality": "bangladesh" or "india"
}

If a field is not visible or cannot be determined, use null for that field.
Do not include any explanation or text outside the JSON.`;

export async function extractPassportData(
  imageBase64: string,
  mimeType: string = "image/jpeg"
): Promise<ExtractedPassportData> {
  logger.info("Starting passport OCR extraction");

  const response = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${imageBase64}`,
              detail: "high",
            },
          },
          {
            type: "text",
            text: EXTRACTION_PROMPT,
          },
        ],
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from OCR model");
  }

  logger.info({ content }, "OCR response received");

  // Extract JSON from the response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not parse JSON from OCR response");
  }

  const parsed = JSON.parse(jsonMatch[0]) as ExtractedPassportData;
  return parsed;
}
