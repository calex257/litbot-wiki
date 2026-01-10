import { Pinecone as PineconeClient } from '@pinecone-database/pinecone';


export const initPinecone = async () => {
  const client = new PineconeClient();
  return client;
};