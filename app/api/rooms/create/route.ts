// app/api/rooms/create/route.ts
import { NextResponse } from "next/server";
import { createRoom } from "@/lib/gameStore";

type CreateBody = {
  playerId?: string;
  name?: string;
};

export async function POST(req: Request) {
  try {
    const { playerId, name } = (await req.json()) as CreateBody;

    if (!playerId || !name) {
      return NextResponse.json(
        { error: "Faltan datos (playerId o name)" },
        { status: 400 }
      );
    }

    const room = createRoom(playerId, name);
    return NextResponse.json(room);
  } catch (err) {
    console.error("Error en /api/rooms/create:", err);
    return NextResponse.json(
      { error: "Error interno al crear sala" },
      { status: 500 }
    );
  }
}
