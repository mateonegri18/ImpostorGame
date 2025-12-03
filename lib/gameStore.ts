// src/lib/gameStore.ts

export type Player = {
  id: string;
  name: string;
};

export type Room = {
  code: string;
  hostId: string;
  players: Player[];
  word: string | null;
  impostorId: string | null;
  started: boolean;
  createdAt: number;
};

const rooms = new Map<string, Room>();

// 2 horas en ms
const ROOM_TTL_MS = 2 * 60 * 60 * 1000;

function normalizeCode(code: string | undefined | null): string {
  return (code || "").trim().toUpperCase();
}

function isExpired(room: Room): boolean {
  return Date.now() - room.createdAt > ROOM_TTL_MS;
}

function getValidRoom(code: string): Room | undefined {
  const key = normalizeCode(code);
  const room = rooms.get(key);

  if (!room) {
    console.log("getValidRoom:", key, "=> no existe");
    return undefined;
  }

  if (isExpired(room)) {
    console.log("getValidRoom:", key, "=> expirada, eliminando");
    rooms.delete(key);
    return undefined;
  }

  return room;
}

// Crear sala
export function createRoom(hostId: string, hostName: string): Room {
  const code = Math.random().toString(36).substring(2, 6).toUpperCase();

  const room: Room = {
    code,
    hostId,
    players: [{ id: hostId, name: hostName }],
    word: null,
    impostorId: null,
    started: false,
    createdAt: Date.now(),
  };

  rooms.set(code, room);
  console.log("Sala creada:", code);
  return room;
}

// Obtener sala (para APIs, polling, etc.)
export function getRoom(code: string): Room | undefined {
  const key = normalizeCode(code);
  const room = getValidRoom(key);
  console.log(
    "getRoom:",
    key,
    "=>",
    room ? "encontrada" : "no encontrada o expirada"
  );
  return room;
}

// Unirse a sala
export function joinRoom(
  code: string,
  playerId: string,
  name: string
): Room | null {
  const key = normalizeCode(code);
  const room = getValidRoom(key);
  if (!room) {
    console.log("joinRoom: sala no encontrada o expirada", key);
    return null;
  }

  const exists = room.players.find((p) => p.id === playerId);
  if (!exists) {
    room.players.push({ id: playerId, name });
  }

  console.log("joinRoom:", key, "jugadores:", room.players.length);
  return room;
}

// Iniciar partida
export function startGame(code: string, word: string): Room | null {
  const key = normalizeCode(code);
  const room = getValidRoom(key);
  if (!room) {
    console.log("startGame: sala no encontrada o expirada", key);
    return null;
  }

  if (!room.players || room.players.length === 0) {
    console.log("startGame: sala sin jugadores", key);
    return room;
  }

  const randomIndex = Math.floor(Math.random() * room.players.length);
  const impostor = room.players[randomIndex];

  room.word = word;
  room.impostorId = impostor.id;
  room.started = true;

  console.log(
    "Partida iniciada en sala",
    key,
    "impostor:",
    impostor.name,
    "palabra:",
    word
  );

  return room;
}

// Salir de sala: borra sala si queda vacía
export function leaveRoom(code: string, playerId: string): Room | null {
  const key = normalizeCode(code);
  const room = getValidRoom(key);
  if (!room) {
    console.log("leaveRoom: sala no encontrada o expirada", key);
    return null;
  }

  room.players = room.players.filter((p) => p.id !== playerId);

  if (room.players.length === 0) {
    rooms.delete(key);
    console.log("leaveRoom: sala vacía, eliminada", key);
    return null;
  }

  // Si el host se fue, reasignamos al primer jugador restante
  if (room.hostId === playerId) {
    room.hostId = room.players[0].id;
    console.log("leaveRoom: host reasignado a", room.players[0].name);
  }

  console.log("leaveRoom:", key, "jugadores restantes:", room.players.length);
  return room;
}
