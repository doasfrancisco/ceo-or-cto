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
