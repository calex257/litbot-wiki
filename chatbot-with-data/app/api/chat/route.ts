
import { NextRequest } from "next/server";
import { createRagChain } from "@/utils/chain";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { query, history } = await req.json();
  const ragChain = await createRagChain();

  const stream = new ReadableStream({
    async start(controller) {
      let isOpen = true;
      let fullAnswer = "";

      try {
        await ragChain.invoke(
          {
            input: query,
            chat_history: history.map((msg: any) => ({
              role: msg.role,
              content: msg.content,
            })),
          },
          {
            callbacks: [
              {
                handleLLMNewToken(token: string) {
                  if (!isOpen) return;
                  try {
                    controller.enqueue(token);
                    fullAnswer += token;
                  } catch {
                    isOpen = false;
                  }
                },
                handleLLMEnd() {
                  if (isOpen) {
                    try {
                      controller.close();
                      isOpen = false;
                    } catch {}
                  }
                },
                handleLLMError(e: any) {
                  if (isOpen) {
                    controller.error(e);
                    isOpen = false;
                  }
                }
              }
            ]
          }
        );
      } catch (e) {
        if (isOpen) {
          controller.error(e);
          isOpen = false;
        }
      }
    }
  });


  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
