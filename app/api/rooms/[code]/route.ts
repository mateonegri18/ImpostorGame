// app/api/rooms/[code]/route.ts
import { NextResponse } from "next/server";
import { getRoom } from "@/lib/gameStore";

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
      return NextResponse.json(
        { error: "Sala no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(room);
  } catch (err) {
    console.error("Error en /api/rooms/[code]:", err);
    return NextResponse.json(
      { error: "Error interno al obtener sala" },
      { status: 500 }
    );
  }
}
