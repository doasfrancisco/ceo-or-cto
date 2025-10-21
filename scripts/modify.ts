import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

interface Person {
  id: string;
  name: string;
  company: string;
  role?: string;
  type: "forced_to_socialize" | "probably_uses_glasses";
  location: string;
  total: number;
  sr: number;
  imageUrl: string;
  easterImageUrl?: string;
}

interface PersonEdit {
  id: string;
  name: string;
  company?: string;
  role?: string;
  type: "forced_to_socialize" | "probably_uses_glasses";
  location: string;
  total: number;
  sr: number;
  linkedInUrl: string;
  imageUrl: string;
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

function modifyPeopleData(inputFile: string) {
    const fileName = `${inputFile}_data.json`;
    const csvFileName = `${inputFile}_profiles.csv`;

    const inputPath = path.join(__dirname, `../lib/${fileName}`);
    const csvPath = path.join(__dirname, csvFileName);
    const outputPath = path.join(__dirname, `../lib/${fileName.replace('.json', '_modified.json')}`);

    // Read JSON file
    const fileContent = fs.readFileSync(inputPath, 'utf-8');
    const people: Person[] = JSON.parse(fileContent);

    // Read CSV file
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const csvLines = csvContent.split('\n').filter(line => line.trim());
    const csvDataLines = csvLines.slice(1); // Skip header

    // Transform Person[] to PersonEdit[] by adding linkedInUrl from CSV
    const modifiedPeople: PersonEdit[] = people.map((person, index) => {
        const csvLine = csvDataLines[index];
        const [id, name, company, profileUrl] = parseCSVLine(csvLine);

        console.log(`Processing ${person.name}: ${profileUrl}`);

        return {
            ...person,
            linkedInUrl: profileUrl,
        };
    });

    // Write the modified data to output file
    fs.writeFileSync(outputPath, JSON.stringify(modifiedPeople, null, 2), 'utf-8');

    console.log(`✓ Modified ${modifiedPeople.length} people`);
    console.log(`✓ Output saved to: ${outputPath}`);
    console.log(`\nSample entries:`);
    console.log(JSON.stringify(modifiedPeople.slice(0, 2), null, 2));
}

// Run the script
modifyPeopleData('cto');