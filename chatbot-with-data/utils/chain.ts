import { initPinecone } from "@/utils/pinecone-client";
import { PineconeStore } from "@langchain/pinecone";
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";

const embeddings = new OpenAIEmbeddings();
const model = new ChatOpenAI({
    temperature: 0.2, 
    modelName: "gpt-4.1-mini", 
    streaming: true,
});


let vectorStore: PineconeStore | null = null;

async function setupVectorStore() {
  if (!vectorStore) {
    const pinecone = await initPinecone();
    const index = pinecone.Index(process.env.PINECONE_INDEX!);
    vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex: index,
      textKey: "text",
    });
  }
}

export async function createRagChain() {
  await setupVectorStore();

  if (!vectorStore) {
    throw new Error("VectorStore not initialized!");
  }

  const retriever = vectorStore.asRetriever({
    searchType: "mmr",
    k: 4
  });

  const qaPrompt = ChatPromptTemplate.fromMessages([
    ["system", `You are a literature expert. Using the following context, answer the user's question in a concise way (maximum 3).If the user asks for a specific quote, fragment, stanza or lines from a literary work in the public domain (e.g. Mihai Eminescu), you may provide it in full, as found in the context. Otherwise, Do not exceed the length of maximum 3 sentences, and make sure not to stop mid-sentence.Do not say "Nu pot accesa textul furnizat." and after that you start saying the answer. Be brief and to the point. Detail only if the user says so. If unsure, just say you don't know.`],
    new MessagesPlaceholder("chat_history"),
    ["human", "Question: {input}\n\nContext: {context}"],
  ]);

  const questionAnswerChain = await createStuffDocumentsChain({
    llm: model,
    prompt: qaPrompt,
  });

  const ragChain = await createRetrievalChain({
    retriever,
    combineDocsChain: questionAnswerChain,
  });

  return ragChain;
}

