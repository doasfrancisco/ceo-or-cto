import { CosmosClient } from "@azure/cosmos";
import { Person } from "./types";

// Environment variables
const endpoint = process.env.COSMOS_DB_ENDPOINT || "";
const key = process.env.COSMOS_DB_KEY || "";
const databaseId = process.env.COSMOS_DB_DATABASE_ID || "ceo-or-cto";
const containerId = process.env.COSMOS_DB_CONTAINER_ID || "people";

// Create Cosmos client
let client: CosmosClient | null = null;

function getClient(): CosmosClient {
  if (!client) {
    if (!endpoint || !key) {
      throw new Error("CosmosDB credentials not configured");
    }
    client = new CosmosClient({ endpoint, key });
  }
  return client;
}

export async function getAllPeople(): Promise<Person[]> {
  try {
    const cosmosClient = getClient();
    const database = cosmosClient.database(databaseId);
    const container = database.container(containerId);

    const { resources: people } = await container.items
      .query("SELECT * FROM c")
      .fetchAll();

    return people as Person[];
  } catch (error) {
    console.error("Error fetching people from CosmosDB:", error);
    throw error;
  }
}

export async function getPeopleByLocation(location: string): Promise<Person[]> {
  try {
    const cosmosClient = getClient();
    const database = cosmosClient.database(databaseId);
    const container = database.container(containerId);

    const { resources: people } = await container.items
      .query({
        query: "SELECT * FROM c WHERE LOWER(c.location) = @location",
        parameters: [{ name: "@location", value: location.toLowerCase() }],
      })
      .fetchAll();

    return people as Person[];
  } catch (error) {
    console.error("Error fetching people by location from CosmosDB:", error);
    throw error;
  }
}

export async function getPersonById(id: string): Promise<Person | null> {
  try {
    const cosmosClient = getClient();
    const database = cosmosClient.database(databaseId);
    const container = database.container(containerId);

    const { resource: person } = await container.item(id, id).read();
    return person as Person || null;
  } catch (error) {
    console.error("Error fetching person by ID from CosmosDB:", error);
    return null;
  }
}

export async function updatePersonStatsFromTemp(
  id: string,
  totalTempIncrement: number,
  srTempIncrement: number
): Promise<void> {
  try {
    const cosmosClient = getClient();
    const database = cosmosClient.database(databaseId);
    const container = database.container(containerId);

    // Read current person from DB
    const { resource: person } = await container.item(id, id).read();

    if (!person) {
      console.error(`Person with id ${id} not found`);
      return;
    }

    // Sum temp values to permanent values
    const updatedPerson = {
      ...person,
      total: Number(person.total) + totalTempIncrement,
      sr: Number(person.sr) + srTempIncrement,
    };

    // Update in DB
    await container.item(id, id).replace(updatedPerson);
    console.log(
      `Updated person ${id}: total=${person.total}+${totalTempIncrement}=${updatedPerson.total}, SR=${person.sr}+${srTempIncrement}=${updatedPerson.sr}`
    );
  } catch (error) {
    console.error(`Error updating person ${id}:`, error);
    throw error;
  }
}
