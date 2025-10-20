import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../.env') });

interface Person {
  id: string;
  name: string;
  company?: string;
  role?: string;
  type: "forced_to_socialize" | "probably_uses_glasses";
  imageUrl: string;
  location: string;
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
  imageUrl: string;
  easterImageUrl?: string;
}

function modifyPeopleData(inputFile: string) {
    const fileName = `${inputFile}_data.json`;
    const inputPath = path.join(__dirname, `../lib/${fileName}`);
    const outputPath = path.join(__dirname, `../lib/${fileName.replace('.json', '_modified.json')}`);

    const fileContent = fs.readFileSync(inputPath, 'utf-8');
    const people: Person[] = JSON.parse(fileContent);

    const modifiedPeople: PersonEdit[] = people.map((person) => ({
        ...person,
        total: 1,
        sr: 1,
    }));

    // Write the modified data to output file
    fs.writeFileSync(outputPath, JSON.stringify(modifiedPeople, null, 2), 'utf-8');

    console.log(`✓ Modified ${modifiedPeople.length} people`);
    console.log(`✓ Output saved to: ${outputPath}`);
    console.log(`\nSample entries:`);
    console.log(JSON.stringify(modifiedPeople.slice(0, 2), null, 2));
}

// Run the script
modifyPeopleData('cto');