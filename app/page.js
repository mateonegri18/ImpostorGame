"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Dither from "../components/Dither";
import ModalJoin from "../components/ModalJoin";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

function getOrCreatePlayerId() {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("playerId");
  if (!id) {
    if (crypto && crypto.randomUUID) {
      id = crypto.randomUUID();
    } else {
      id = Math.random().toString(36).substring(2);
    }
    localStorage.setItem("playerId", id);
  }
  return id;
}

export default function HomePage() {
  const router = useRouter();

  const [nombreJugador, setNombreJugador] = useState("");
  const [playerId, setPlayerId] = useState(() => getOrCreatePlayerId());
  const [openDialog, setOpenDialog] = useState(false);

  const openModal = () => setOpenDialog(true);
  const closeModal = () => setOpenDialog(false);

  const handleCreate = async () => {
    if (!nombreJugador || !playerId) return;

    try {
      const res = await fetch("/api/rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId,
          name: nombreJugador,
        }),
      });

      if (!res.ok) {
        console.error("Error al crear sala", await res.text());
        alert("No se pudo crear la sala. Intentá de nuevo.");
        return;
      }

      const data = await res.json();
      router.push(`/room/${data.code}`);
    } catch (error) {
      console.error("Error en handleCreate:", error);
      alert("Ocurrió un error al crear la sala.");
    }
  };

  const handleJoin = async (code) => {
    if (!nombreJugador || !playerId || !code) return;

    try {
      const res = await fetch("/api/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.toUpperCase(),
          playerId,
          name: nombreJugador,
        }),
      });

      if (!res.ok) {
        console.error("Error al unirse a sala", await res.text());
        alert("Sala no encontrada o error al unirse.");
        return;
      }

      const data = await res.json();
      closeModal();
      router.push(`/room/${data.code}`);
    } catch (error) {
      console.error("Error en handleJoin:", error);
      alert("Ocurrió un error al unirse a la sala.");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <Dither
          waveColor={[0.3, 0, 0]}
          disableAnimation={false}
          enableMouseInteraction={false}
          mouseRadius={0.3}
          colorNum={4}
          waveAmplitude={0.3}
          waveFrequency={3}
          waveSpeed={0.05}
        />
      </div>

      <main className="min-h-screen flex items-center justify-center relative z-10">
        <div className="w-[70vw] max-w-md min-w-[250px] h-auto rounded-lg border-red-800 border-y-2 border-x shadow-red-950 shadow-2xl bg-stone-900">
          <div className="grid w-full items-center justify-center p-6 gap-3">
            <h1 className="text-red-700 text-3xl text-center font-bold">
              Impostor:
            </h1>
            <h3 className="text-red-700 text-xl text-center pb-6">El Juego</h3>

            <Label className="text-white justify-center">Nombre Jugador</Label>
            <Input
              className="text-white bg-stone-800 text-center"
              placeholder="ingresar nombre"
              value={nombreJugador || ""}
              onChange={(e) => setNombreJugador(e.target.value)}
            />

            <br />

            <Button
              className="row-span-5 bg-gray-500"
              disabled={!nombreJugador}
              onClick={handleCreate}
            >
              Hostear partida
            </Button>

            <Button
              className="row-span-4 bg-gray-500"
              disabled={!nombreJugador}
              onClick={openModal}
            >
              Unirse a partida
            </Button>

            <ModalJoin
              open={openDialog}
              onClose={closeModal}
              onJoin={handleJoin}
            />
          </div>
          <div className="text-gray-500 text-left pl-2">created by @MateChola</div>
        </div>
      </main>
    </div>
  );
}
