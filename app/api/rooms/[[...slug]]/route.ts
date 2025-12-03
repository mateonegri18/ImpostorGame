import { NextResponse } from "next/server";
import {
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  startGame,
} from "@/lib/gameStore";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

type HandlerContext = {
  params: {
    slug?: string[];
  };
};

function jsonNoStore<T>(
  data: T,
  init?: ResponseInit | number
): NextResponse<T> {
  const response =
    typeof init === "number"
      ? NextResponse.json(data, { status: init })
      : NextResponse.json(data, init);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function normalizeSlug(ctx: HandlerContext): string[] {
  const slug = ctx.params?.slug ?? [];
  return slug.filter((segment) => Boolean(segment));
}

export async function GET(_req: Request, ctx: HandlerContext) {
  const slug = normalizeSlug(ctx);
  if (slug.length !== 1) {
    return jsonNoStore(
      { error: "Debe especificar el código de la sala" },
      { status: 400 }
    );
  }

  const code = slug[0]!;
  const room = getRoom(code);
  if (!room) {
    return jsonNoStore({ error: "Sala no encontrada" }, { status: 404 });
  }

  return jsonNoStore(room);
}

export async function POST(req: Request, ctx: HandlerContext) {
  const slug = normalizeSlug(ctx);
  const action = slug[0];

  const body = await req
    .json()
    .catch(() => ({} as Record<string, unknown>));

  switch (action) {
    case "create": {
      const { playerId, name } = body as {
        playerId?: string;
        name?: string;
      };

      if (!playerId || !name) {
        return jsonNoStore(
          { error: "Faltan datos (playerId o name)" },
          { status: 400 }
        );
      }

      const room = createRoom(playerId, name);
      return jsonNoStore(room);
    }
    case "join": {
      const { code, playerId, name } = body as {
        code?: string;
        playerId?: string;
        name?: string;
      };

      if (!code || !playerId || !name) {
        return jsonNoStore(
          { error: "Faltan datos (code, playerId o name)" },
          { status: 400 }
        );
      }

      const room = joinRoom(code, playerId, name);
      if (!room) {
        return jsonNoStore({ error: "Sala no encontrada" }, { status: 404 });
      }

      return jsonNoStore(room);
    }
    case "leave": {
      const { code, playerId } = body as {
        code?: string;
        playerId?: string;
      };

      if (!code || !playerId) {
        return jsonNoStore(
          { error: "Faltan datos (code o playerId)" },
          { status: 400 }
        );
      }

      const room = leaveRoom(code, playerId);
      if (!room) {
        return jsonNoStore(
          { message: "Sala eliminada o no encontrada" },
          { status: 200 }
        );
      }

      return jsonNoStore(room);
    }
    case "start": {
      const { code, word, numImpostors } = body as {
        code?: string;
        word?: string;
        numImpostors?: number;
      };

      if (!code || !word) {
        return jsonNoStore(
          { error: "Faltan código o palabra" },
          { status: 400 }
        );
      }

      const impostorCount =
        typeof numImpostors === "number" && !Number.isNaN(numImpostors)
          ? numImpostors
          : 1;

      const room = startGame(code, word, impostorCount);

      if (!room) {
        return jsonNoStore({ error: "Sala no encontrada" }, { status: 404 });
      }

      return jsonNoStore(room);
    }
    default:
      return jsonNoStore({ error: "Operación no encontrada" }, { status: 404 });
  }
}
