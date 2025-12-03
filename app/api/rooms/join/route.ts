// app/api/rooms/join/route.ts
import { NextResponse } from "next/server";
import { joinRoom } from "@/lib/gameStore";

type JoinBody = {
  code?: string;
  playerId?: string;
  name?: string;
};

export async function POST(req: Request) {
  try {
    const { code, playerId, name } = (await req.json()) as JoinBody;

    if (!code || !playerId || !name) {
      return NextResponse.json(
        { error: "Faltan datos (code, playerId o name)" },
        { status: 400 }
      );
    }

    const room = joinRoom(code, playerId, name);
    if (!room) {
      return NextResponse.json(
        { error: "Sala no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(room);
  } catch (err) {
    console.error("Error en /api/rooms/join:", err);
    return NextResponse.json(
      { error: "Error interno al unirse a sala" },
      { status: 500 }
    );
  }
}
