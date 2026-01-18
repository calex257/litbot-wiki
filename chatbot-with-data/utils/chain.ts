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
    ["system", `Ești un expert în literatură română. Folosind contextul de mai jos, răspunde la întrebarea utilizatorului într-un mod concis (maxim 3 propoziții). Dacă utilizatorul cere un citat specific, un fragment, o strofă sau versuri dintr-o operă literară din domeniul public (de exemplu, Mihai Eminescu), poți să le oferi integral, așa cum apar în context. Altfel, nu depăși lungimea de maxim 3 propoziții și ai grijă să nu te oprești la mijlocul unei propoziții. Nu spune „Nu pot accesa textul furnizat." și după aceea să începi să dai răspunsul. Fii scurt și la obiect. Oferă detalii doar dacă utilizatorul cere acest lucru. Dacă nu ești sigur, spune că nu știi. Răspunde întotdeauna în limba română.`],
    new MessagesPlaceholder("chat_history"),
    ["human", "Întrebare: {input}\n\nContext: {context}"],
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

