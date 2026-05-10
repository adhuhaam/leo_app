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

For BANGLADESH passports:
- The main data page shows: Surname + Given Name (combine as full name), Passport Number (e.g. B00779387), Date of Birth (e.g. 05 MAR 1988), Date of Issue (e.g. 30 APR 2023), Date of Expiry (e.g. 29 APR 2033)
- The personal data page (back page) shows: Name, Permanent Address
- Nationality field will say "BANGLADESHI" — map this to "bangladesh"
- Passport number starts with a letter then digits (e.g. B00779387, EH0789603)

For INDIAN passports:
- Surname + Given Name on data page (combine as full name)
- Passport Number starts with a letter then 7 digits
- Nationality field will say "INDIAN" — map this to "india"

Extract these fields from whichever page(s) are visible in the image:
- Full Name: combine Surname and Given Name (e.g. "MD JUBAER HOSSAIN")
- Passport Number: the passport document number
- Date of Birth: standardize to DD MMM YYYY or DD/MM/YYYY as found
- Date of Issue: standardize to DD MMM YYYY or DD/MM/YYYY as found
- Date of Expiry: standardize to DD MMM YYYY or DD/MM/YYYY as found
- Address: permanent address from personal data page, or place of birth if address not visible
- Nationality: MUST be exactly "bangladesh" or "india" (lowercase)

Respond ONLY with a valid JSON object in this exact format:
{
  "fullName": "...",
  "passportNumber": "...",
  "dateOfBirth": "...",
  "dateOfIssue": "...",
  "dateOfExpiry": "...",
  "address": "...",
  "nationality": "bangladesh"
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
