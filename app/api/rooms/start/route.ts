// app/api/rooms/start/route.ts
import { NextResponse } from "next/server";
import { startGame } from "@/lib/gameStore";

type StartBody = {
  code?: string;
  word?: string;
};

export async function POST(req: Request) {
  try {
    const { code, word } = (await req.json()) as StartBody;

    if (!code || !word) {
      return NextResponse.json(
        { error: "Faltan código o palabra" },
        { status: 400 }
      );
    }

    const room = startGame(code, word);

    if (!room) {
      return NextResponse.json(
        { error: "Sala no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(room);
  } catch (err) {
    console.error("Error en /api/rooms/start:", err);
    return NextResponse.json(
      { error: "Error interno al iniciar partida" },
      { status: 500 }
    );
  }
}
