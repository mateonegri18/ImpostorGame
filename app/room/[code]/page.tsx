"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

type Player = { id: string; name: string };

type Room = {
  code: string;
  hostId: string;
  players: Player[];
  word: string | null;
  impostorId: string | null;
  started: boolean;
  // futuro: podrías guardar esto en backend
  mode?: "online" | "local";
};

const DEFAULT_WORDS = [
  "Biblioteca",
  "Heladería",
  "PlayStation",
  "Parque de diversiones",
  "Playa",
  "Hospital",
  "Avión",
  "Pizza",
  "Cine",
  "Universidad",
];

function getPlayerId() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("playerId") || "";
}

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const code = params.code.toString().toUpperCase();

  const [room, setRoom] = useState<Room | null>(null);
  const [playerId, setPlayerId] = useState(() => getPlayerId());
  const [manualWordInput, setManualWordInput] = useState("");
  const [usedWords, setUsedWords] = useState<string[]>([]);
  const [mode, setMode] = useState<"online" | "local">("online");

  // Config pool de palabras
  const [useDefaultPool, setUseDefaultPool] = useState(true);
  const [playOnlyCustom, setPlayOnlyCustom] = useState(false);
  const [customWordsText, setCustomWordsText] = useState("");

  // Jugadores locales (modo pasar el teléfono)
  const [localPlayers, setLocalPlayers] = useState<Player[]>([]);
  const [newLocalPlayerName, setNewLocalPlayerName] = useState("");

  // Estado de revelación en modo local
  const [localOrder, setLocalOrder] = useState<Player[]>([]);
  const [localImpostorIndex, setLocalImpostorIndex] = useState<number | null>(null);
  const [currentLocalIndex, setCurrentLocalIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);

  const router = useRouter();

  // polling del estado de la sala
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const res = await fetch(`/api/rooms/${code}`);
        if (res.ok) {
          const data = await res.json();
          setRoom(data);
          // si en algún momento el backend guarda mode, lo usamos
          if (data.mode === "online" || data.mode === "local") {
            setMode(data.mode);
          }
        }
      } catch (err) {
        console.error("Error al traer la sala:", err);
      }
    };

    fetchRoom();
    const interval = setInterval(fetchRoom, 2000);
    return () => clearInterval(interval);
  }, [code]);

  const isHost = useMemo(() => room && room.hostId === playerId, [room, playerId]);
  const me = useMemo(() => room?.players.find((p) => p.id === playerId), [room, playerId]);
  const isImpostor = useMemo(() => room?.impostorId === playerId, [room, playerId]);

  const customWords = useMemo(
    () =>
      customWordsText
        .split("\n")
        .map((w) => w.trim())
        .filter(Boolean),
    [customWordsText]
  );

  const buildWordPool = () => {
    let pool: string[] = [];

    if (useDefaultPool && !playOnlyCustom) {
      pool = pool.concat(DEFAULT_WORDS);
    }

    if (playOnlyCustom || customWords.length > 0) {
      pool = pool.concat(customWords);
    }

    return pool;
  };

  const chooseSecretWord = (): string | null => {
    const pool = buildWordPool();
    const available = pool.filter((w) => !usedWords.includes(w));

    if (available.length === 0 && !manualWordInput.trim()) {
        return null;
    }

    if (available.length === 0) {
        return manualWordInput.trim();
    }

    const idx = Math.floor(Math.random() * available.length);
    return available[idx];
  };

  const startGameOnServer = async (chosenWord: string) => {
    try {
      const res = await fetch("/api/rooms/start", {
        method: "POST",
        body: JSON.stringify({ code, word: chosenWord }),
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Error HTTP en /api/rooms/start:", res.status, text);
        alert("No se pudo iniciar la partida. Revisá la consola.");
        return;
      }

      const data = await res.json();
      setRoom(data);
    } catch (err) {
      console.error("Error en handleStart:", err);
      alert("Ocurrió un error al iniciar la partida.");
    }
  };

  const handleStart = async () => {
    if (!room) return;
    if (!isHost) return;

    // validaciones
    if (mode === "local" && localPlayers.length < 3) {
    alert("Agregá al menos 3 jugadores para jugar en modo local.");
    return;
    }

    const chosenWord = chooseSecretWord();
    if (!chosenWord) {
    alert("Definí al menos una palabra (pool o manual) antes de iniciar.");
    return;
    }

    // 👉 registrar palabra usada para no repetirla en futuras partidas
    setUsedWords((prev) => (prev.includes(chosenWord) ? prev : [...prev, chosenWord]));

    // Configuro orden e impostor para modo local (pasar el teléfono)
    if (mode === "local") {
    const shuffled = [...localPlayers].sort(() => Math.random() - 0.5);
    setLocalOrder(shuffled);
    setCurrentLocalIndex(0);
    setIsRevealed(false);

    const impostorIndex = Math.floor(Math.random() * shuffled.length);
    setLocalImpostorIndex(impostorIndex);
    }

    await startGameOnServer(chosenWord);
  };


  const handleLeave = async () => {
    try {
      await fetch("/api/rooms/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, playerId }),
      });
    } catch (err) {
      console.error("Error al salir de la sala:", err);
    } finally {
      router.push("/");
    }
  };

  const handleAddLocalPlayer = () => {
    const name = newLocalPlayerName.trim();
    if (!name) return;

    setLocalPlayers((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name,
      },
    ]);
    setNewLocalPlayerName("");
  };

  const handleRemoveLocalPlayer = (id: string) => {
    setLocalPlayers((prev) => prev.filter((p) => p.id !== id));
  };

  const handleLocalCardTap = () => {
    if (!room) return;
    if (!localOrder.length) return;

    if (!isRevealed) {
        setIsRevealed(true);
    } else {
        // oculto y paso al siguiente
        if (currentLocalIndex < localOrder.length - 1) {
        setCurrentLocalIndex((prev) => prev + 1);
        setIsRevealed(false);
        } else {
        // último jugador: marca que todos ya vieron su rol
        setIsRevealed(false);
        setCurrentLocalIndex((prev) => prev + 1); // pasa a length
        }
    }
    };


  if (!room) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <p className="text-slate-300 animate-pulse text-sm">Cargando sala...</p>
      </main>
    );
  }

  const isLocalMode = mode === "local";
  const everyoneInLocalSawRole =
    isLocalMode && localOrder.length > 0 && currentLocalIndex === localOrder.length && !isRevealed;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-4xl space-y-6">
        {/* Header sala */}
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Sala {room.code}</h1>
            <p className="text-sm text-slate-400">
              {isHost ? "Sos el host de esta sala" : `Host: ${room.players.find((p) => p.id === room.hostId)?.name ?? "Desconocido"}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-emerald-500/60 text-emerald-300 text-xs">
              {room.started ? "Partida en curso" : "En espera"}
            </Badge>
            <Button variant="outline" size="sm" onClick={handleLeave} className="bg-red-500 border-red-500">
              Salir
            </Button>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-[2fr,1fr]">
          {/* Bloque principal: config / juego */}
          <section className="space-y-4">
            {!room.started ? (
              // PRE-JUEGO
              isHost ? (
                <Card className="border-slate-800/70 bg-gradient-to-br from-slate-900/80 to-slate-950/90 shadow-xl shadow-red-900/20">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-white">
                      <span>Configurar partida</span>
                      <Badge className="bg-red-600/80 text-xs">Host</Badge>
                    </CardTitle>
                    <CardDescription className="text-slate-400">
                      Elegí el modo de juego, la forma de usar las palabras y los jugadores si es local.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Modo de juego */}
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wide text-slate-400">Modo de juego</Label>
                      <Tabs value={mode} onValueChange={(val) => setMode(val as "online" | "local")} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 bg-slate-900/80">
                          <TabsTrigger value="online" className="data-[state=active]:bg-red-600/80">
                            Online
                          </TabsTrigger>
                          <TabsTrigger value="local" className="data-[state=active]:bg-red-600/80">
                            Local (pasar el teléfono)
                          </TabsTrigger>
                        </TabsList>
                        <TabsContent value="online" className="mt-3 text-xs text-slate-400">
                          Cada jugador entra con su teléfono usando el código de sala. El rol se muestra en su propio
                          dispositivo.
                        </TabsContent>
                        <TabsContent value="local" className="mt-3 text-xs text-slate-400">
                          Solo se usa <span className="font-semibold text-slate-200">este</span> teléfono. El juego va
                          pasando jugador por jugador revelando la palabra o impostor.
                        </TabsContent>
                      </Tabs>
                    </div>

                    {/* Pool de palabras */}
                    <div className="space-y-3">
                      <Label className="text-xs uppercase tracking-wide text-slate-400">Palabras del juego</Label>
                      <div className="space-y-2 rounded-lg border border-slate-800/80 bg-slate-900/80 p-3">
                        <div className="flex items-start gap-3 text-white">
                            <Checkbox
                                id="default-pool"
                                checked={useDefaultPool}
                                onCheckedChange={(v) => {
                                    const checked = Boolean(v);

                                    if (checked) {
                                    setUseDefaultPool(true);
                                    setPlayOnlyCustom(false);
                                    } else {
                                    if (!playOnlyCustom) return;
                                    setUseDefaultPool(false);
                                    }
                                }}
                            />
                          <div className="space-y-1">
                            <Label htmlFor="default-pool" className="text-sm">
                              Usar pool por defecto
                            </Label>
                            <p className="text-xs text-slate-400">
                              Palabras generales (lugares, objetos, etc.). Se mezclan con las tuyas si no elegís jugar
                              solo con tus palabras.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 text-white">
                            <Checkbox
                                id="only-custom"
                                checked={playOnlyCustom}
                                onCheckedChange={(v) => {
                                    const checked = Boolean(v);

                                    if (checked) {
                                    setPlayOnlyCustom(true);
                                    setUseDefaultPool(false);
                                    } else {
                                    if (!useDefaultPool) return;
                                    setPlayOnlyCustom(false);
                                    }
                                }}
                            />
                          <div className="space-y-1">
                            <Label htmlFor="only-custom" className="text-sm">
                              Jugar solo con mis palabras
                            </Label>
                            <p className="text-xs text-slate-400">
                              Ignora el pool por defecto y usa únicamente las palabras que agregues abajo.
                            </p>
                          </div>
                        </div>

                        <Separator className="my-2 bg-slate-800/70" />

                        <div className="space-y-1">
                          <Label htmlFor="custom-words" className="text-sm text-white">
                            Palabras personalizadas
                          </Label>
                          <Textarea
                            id="custom-words"
                            placeholder={"Una palabra o frase por línea\nEj: Biblioteca\nPlaya\nCine..."}
                            value={customWordsText}
                            onChange={(e) => setCustomWordsText(e.target.value)}
                            className="resize-none h-24 text-sm bg-slate-950/60 border-slate-800/80 text-gray-300"
                          />
                          <p className="text-[11px] text-slate-500">
                            Total en este pool:{" "}
                            <span className="text-slate-200 font-medium">{buildWordPool().length}</span>
                          </p>
                        </div>

                        <Separator className="my-2 bg-slate-800/70" />

                        <div className="space-y-1">
                          <Label htmlFor="manual-word" className="text-sm text-white">
                            Palabra fija (opcional)
                          </Label>
                          <Input
                            id="manual-word"
                            placeholder="Definí una palabra exacta (si se deja vacío se usa el pool aleatorio)"
                            value={manualWordInput}
                            onChange={(e) => setManualWordInput(e.target.value)}
                            className="bg-slate-950/60 border-slate-800/80 text-sm text-gray-300"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Jugadores locales */}
                    {isLocalMode && (
                      <div className="space-y-3">
                        <Label className="text-xs uppercase tracking-wide text-slate-400">
                          Jugadores (modo local)
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Nombre del jugador"
                            value={newLocalPlayerName}
                            onChange={(e) => setNewLocalPlayerName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddLocalPlayer();
                              }
                            }}
                            className="bg-slate-950/60 border-slate-800/80 text-sm text-gray-300"
                          />
                          <Button size="sm" onClick={handleAddLocalPlayer}>
                            Agregar
                          </Button>
                        </div>

                        <ScrollArea className="mt-1 h-32 rounded-md border border-slate-800/80 bg-slate-950/40">
                          <div className="p-2 space-y-1">
                            {localPlayers.length === 0 && (
                              <p className="text-xs text-slate-500">Todavía no agregaste jugadores.</p>
                            )}
                            {localPlayers.map((p, index) => (
                              <div
                                key={p.id}
                                className="flex items-center justify-between rounded-md px-2 py-1 text-sm bg-slate-900/90"
                              >
                                <span className="flex items-center gap-2">
                                  <span className="text-xs text-slate-500 w-4 text-right">{index + 1}.</span>
                                  <span className="text-gray-300">{p.name}</span>
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-slate-400 hover:text-red-400 hover:bg-red-900/30"
                                  onClick={() => handleRemoveLocalPlayer(p.id)}
                                >
                                  ✕
                                </Button>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>

                        <p className="text-[11px] text-slate-500">
                          Consejo: pediles que cierren los ojos mientras se muestra cada rol. Solo quien sostiene el
                          teléfono puede mirar.
                        </p>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex items-center justify-between pt-2">
                    <p className="text-xs text-slate-500">
                      Listos para jugar:{" "}
                      <span className="font-semibold text-slate-200">
                        {isLocalMode ? localPlayers.length : room.players.length}
                      </span>
                    </p>
                    <Button onClick={handleStart} disabled={room.started}>
                      Iniciar partida
                    </Button>
                  </CardFooter>
                </Card>
              ) : (
                // Vista NO HOST antes de empezar
                <Card className="border-slate-800/70 bg-gradient-to-br from-slate-900/80 to-slate-950/90 shadow-xl shadow-red-900/20">
                  <CardHeader>
                    <CardTitle>Esperando al host…</CardTitle>
                    <CardDescription className="text-slate-400">
                      El juego todavía no empezó. Apenas el host inicie la partida, se te mostrará tu rol.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-md border border-slate-800/70 bg-slate-950/40 p-3 text-sm">
                      <p className="font-medium text-slate-200 mb-1">¿Qué hago mientras tanto?</p>
                      <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
                        <li>Acordá con el grupo cuántos impostores habrá.</li>
                        <li>Definan si van a jugar más descriptivo o más críptico.</li>
                      </ul>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={handleLeave}>
                      Salir de la sala
                    </Button>
                  </CardFooter>
                </Card>
              )
            ) : // JUEGO INICIADO
            isLocalMode && isHost ? (
              // LOCAL - HOST: pasar el teléfono
              <Card className="border-slate-800/70 bg-gradient-to-br from-slate-900/80 to-slate-950/90 shadow-xl shadow-red-900/20">
                <CardHeader>
                  <CardTitle className="text-white">Revelar roles</CardTitle>
                  <CardDescription className="text-slate-400">
                    Pasá el teléfono al jugador que aparece en la tarjeta y pedile que toque para ver su rol.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {localOrder.length === 0 ? (
                    <p className="text-sm text-slate-400">
                      Todavía no se configuró el orden de jugadores. Volvé a iniciar la partida si el problema
                      persiste.
                    </p>
                  ) : everyoneInLocalSawRole ? (
                    <div className="space-y-3 text-center">
                      <p className="text-sm text-slate-200 font-medium">
                        Todos los jugadores ya vieron su rol 👀
                      </p>
                      <p className="text-xs text-slate-400">
                        ¡Ya pueden empezar la primera ronda de palabras! No muestres más esta pantalla.
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={handleLocalCardTap}
                      className={cn(
                        "w-full aspect-video rounded-2xl border-2 border-dashed border-slate-700/80",
                        "bg-slate-950/60 flex flex-col items-center justify-center",
                        "hover:border-red-500/70 hover:bg-slate-900/80 transition-colors"
                      )}
                    >
                      {!isRevealed ? (
                        <div className="space-y-2 text-center">
                          <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Jugador</p>
                          <p className="text-xl font-semibold text-gray-300">
                            {localOrder[currentLocalIndex]?.name ?? "Desconocido"}
                          </p>
                          <p className="mt-3 text-xs text-slate-400">
                            Tocá para revelar tu rol. Solo este jugador puede mirar.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2 text-center">
                          {localImpostorIndex === currentLocalIndex ? (
                            <>
                              <p className="text-xs uppercase tracking-[0.18em] text-red-400">Sos el impostor</p>
                              <p className="text-sm text-slate-200">
                                Tratá de disimular. Escuchá las pistas de los demás.
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-xs uppercase tracking-[0.18em] text-emerald-400">
                                Tu palabra secreta es
                              </p>
                              <p className="text-xl font-semibold text-slate-50">
                                {room.word ?? "Palabra desconocida"}
                              </p>
                              <p className="text-xs text-slate-400 mt-2">
                                Pensá en una pista que no sea demasiado obvia… pero que tampoco te delate.
                              </p>
                            </>
                          )}
                          <p className="mt-4 text-[11px] text-slate-500">
                            Tocá de nuevo para ocultar y pasar al siguiente jugador.
                          </p>
                        </div>
                      )}
                    </button>
                  )}
                </CardContent>
                <CardFooter className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                        Jugador{" "}
                        <span className="font-semibold text-slate-200">
                        {Math.min(currentLocalIndex + 1, localOrder.length)}/{localOrder.length || "?"}
                        </span>
                    </span>
                    <div className="flex items-center gap-2">
                        <span>Palabra lista. No la digas en voz alta 😉</span>
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-[10px]"
                            onClick={handleStart}
                        >
                            Nueva partida
                        </Button>
                    </div>
                </CardFooter>
              </Card>
            ) : (
              // ONLINE - cada jugador con su teléfono
              <Card className="border-slate-800/70 bg-gradient-to-br from-slate-900/80 to-slate-950/90 shadow-xl shadow-red-900/20">
                <CardHeader>
                  <CardTitle>Tu rol en esta partida</CardTitle>
                  <CardDescription className="text-slate-400">
                    No le muestres esta pantalla a nadie. Hablá en voz alta solo cuando llegue tu turno.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!me ? (
                    <p className="text-sm text-slate-400">
                      Todavía no estás registrado como jugador en esta sala. Reingresá con el código o consultá al host.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-5 text-center">
                        {isImpostor ? (
                          <>
                            <p className="text-xs uppercase tracking-[0.18em] text-red-400 mb-2">
                              Sos el impostor
                            </p>
                            <p className="text-lg font-semibold text-slate-50 mb-1">{me.name}</p>
                            <p className="text-sm text-slate-300">
                              Tu objetivo es pasar desapercibido. Escuchá las pistas de los demás y tratá de imitarlas.
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-xs uppercase tracking-[0.18em] text-emerald-400 mb-2">
                              Tu palabra secreta es
                            </p>
                            <p className="text-xl font-semibold text-slate-50 mb-1">
                              {room.word ?? "Palabra desconocida"}
                            </p>
                            <p className="text-sm text-slate-300">
                              Cuando llegue tu turno, decí una palabra o pista que demuestre que sabés la palabra… sin
                              revelarla del todo.
                            </p>
                          </>
                        )}
                      </div>

                      <div className="rounded-md border border-slate-800/80 bg-slate-950/40 p-3 text-xs text-slate-400 space-y-1">
                        <p className="font-medium text-slate-200">Tips rápidos</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>No muestres la pantalla a nadie.</li>
                          <li>Si sos impostor, mantené la calma y escuchá atentamente a los demás.</li>
                          <li>Si no lo sos, elegí pistas ambiguas pero coherentes.</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </CardContent>
                <Card className="border-slate-800/70 bg-gradient-to-br from-slate-900/80 to-slate-950/90 shadow-xl shadow-red-900/20"
                >
                    <CardFooter className="flex justify-center">
                        {isHost && (
                        <Button variant="outline" size="sm" onClick={handleStart}>
                            Nueva partida
                        </Button>
                        )}
                    </CardFooter>
                </Card>
              </Card>
            )}
          </section>

          {/* Panel lateral: jugadores */}

          <aside className="space-y-3">
            {!room.started && (
                <Card className="border-slate-800/70 bg-slate-950/80">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Jugadores en la sala</CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                    {room.players.length} conectado{room.players.length !== 1 && "s"}
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                    <ScrollArea className="h-56 rounded-md border border-slate-900/80 bg-slate-950/60">
                    <div className="p-2 space-y-1">
                        {room.players.length === 0 && (
                        <p className="text-xs text-slate-500">Todavía no hay jugadores conectados.</p>
                        )}
                        {room.players.map((p) => (
                        <div
                            key={p.id}
                            className={cn(
                            "flex items-center justify-between rounded-md px-2 py-1 text-xs",
                            "bg-slate-900/80 border border-slate-800/60"
                            )}
                        >
                            <span className="flex items-center gap-2">
                            <span
                                className={cn(
                                "h-2 w-2 rounded-full",
                                p.id === room.hostId ? "bg-red-500" : "bg-emerald-400"
                                )}
                            />
                            <span className={cn(p.id === playerId && "font-semibold text-slate-50")}>{p.name}</span>
                            </span>
                            <span className="text-[10px] text-slate-500">
                            {p.id === room.hostId ? "Host" : p.id === playerId ? "Vos" : "Jugador"}
                            </span>
                        </div>
                        ))}
                    </div>
                    </ScrollArea>
                </CardContent>
                </Card>
            )}

            <Card className="border-slate-800/70 bg-slate-950/80">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-white">Info de la ronda</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-slate-400">
                <div className="flex items-center justify-between">
                  <span>Modo actual</span>
                  <Badge variant="outline" className="border-red-600/60 text-red-300">
                    {isLocalMode ? "Local" : "Online"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Palabra definida</span>
                  <span className="text-slate-200 font-medium">
                    {room.started && room.word ? "Sí" : "Pendiente"}
                  </span>
                </div>
                <Separator className="my-2 bg-slate-800/80" />
                <p className="text-[11px]">
                  Recordá que después de revelar los roles, deben turnarse para decir una palabra relacionada con la
                  palabra secreta. Luego votan quién creen que es el impostor.
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </main>
  );
}
