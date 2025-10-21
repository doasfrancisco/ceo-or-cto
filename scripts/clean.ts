import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

interface Person {
  id: string;
  name: string;
  company: string;
  role: string;
  type: "forced_to_socialize" | "probably_uses_glasses";
  imageUrl: string;
  location: string;
  total: number;
  sr: number;
  linkedInUrl: string;
  easterImageUrl?: string;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function extractNameFromDescription(description: string): string {
  // Try to extract name from common patterns
  // Most descriptions start with role/position, so we'll use the LinkedIn ID as fallback
  return '';
}

function extractCompanyFromDescription(description: string): string {
  // Look for patterns like "at Company", "en Company", "@ Company"
  const patterns = [
    /(?:at|@|en)\s+([A-Z][^|,]+?)(?:\s*\||$|,)/i,
    /(?:CTO|CEO|Co-founder)\s+(?:at|@|en)\s+([^|,]+?)(?:\s*\||$)/i,
  ];

  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return '';
}

function linkedInIdToName(linkedInId: string): string {
  // Convert linkedin ID to a readable name
  // e.g., "jesus-rojas-alarcon" -> "Jesus Rojas Alarcon"
  return linkedInId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function cleanCSVAndConvertToJSON(type: string = 'ceo') {
  const lowerType = type.toLowerCase();

  const csvPath = path.join(__dirname, `${type}_profiles.csv`);
  const outputPath = path.join(__dirname, `../lib/${type}_data.json`);

  const storageAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || 'your-storage-account';
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'profiles';
  const blobBaseUrl = `https://${storageAccountName}.blob.core.windows.net/${containerName}`;

  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').filter(line => line.trim());

  const dataLines = lines.slice(1);

  const people: Person[] = dataLines.map((line, index) => {
    const [linkedInId, name, company, profileUrl] = parseCSVLine(line);

    return {
      id: linkedInId,
      name,
      company: company || '',
      role: lowerType === 'ceo' ? 'CEO' : 'CTO',
      type:  lowerType === 'ceo' ? 'forced_to_socialize' : 'probably_uses_glasses',
      imageUrl: `${blobBaseUrl}/${type}s/${linkedInId}.jpg`,
      location: 'Peru',
      total: 1,
      sr: 1,
      linkedInUrl: profileUrl,
    };
  }).filter((person): person is Person => person !== null);

  // Write JSON file
  fs.writeFileSync(outputPath, JSON.stringify(people, null, 2), 'utf-8');

  console.log(` Converted ${people.length} CTO profiles`);
  console.log(`=� Output saved to: ${outputPath}`);
  console.log(`\nSample entries:`);
  console.log(JSON.stringify(people.slice(0, 3), null, 2));
}

// Run the script
cleanCSVAndConvertToJSON('ceo');