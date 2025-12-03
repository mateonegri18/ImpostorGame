// app/api/rooms/[code]/route.ts
import { NextResponse } from "next/server";
import { getRoom } from "@/lib/gameStore";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type Params = {
  code: string;
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<Params> } | { params: Params }
) {
  try {
    // Soporta ambas formas: params directo o como Promise
    const params =
      ctx.params instanceof Promise ? await ctx.params : ctx.params;

    const { code } = params;

    const room = getRoom(code);
    if (!room) {
      const response = NextResponse.json(
        { error: "Sala no encontrada" },
        { status: 404 }
      );
      response.headers.set("Cache-Control", "no-store");
      return response;
    }

    const response = NextResponse.json(room);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (err) {
    console.error("Error en /api/rooms/[code]:", err);
    const response = NextResponse.json(
      { error: "Error interno al obtener sala" },
      { status: 500 }
    );
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
}
