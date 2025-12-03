// app/api/rooms/leave/route.ts
import { NextResponse } from "next/server";
import { leaveRoom } from "@/lib/gameStore";

type LeaveBody = {
  code?: string;
  playerId?: string;
};

export async function POST(req: Request) {
  try {
    const { code, playerId } = (await req.json()) as LeaveBody;

    if (!code || !playerId) {
      return NextResponse.json(
        { error: "Faltan datos (code o playerId)" },
        { status: 400 }
      );
    }

    const room = leaveRoom(code, playerId);

    // Si room es null acá puede ser: sala no existía o fue eliminada por quedar vacía
    if (!room) {
      return NextResponse.json(
        { message: "Sala eliminada o no encontrada" },
        { status: 200 }
      );
    }

    return NextResponse.json(room);
  } catch (err) {
    console.error("Error en /api/rooms/leave:", err);
    return NextResponse.json(
      { error: "Error interno al salir de la sala" },
      { status: 500 }
    );
  }
}
