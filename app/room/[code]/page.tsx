'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';

type Player = { id: string; name: string };
type Room = {
  code: string;
  hostId: string;
  players: Player[];
  word: string | null;
  impostorId: string | null;
  started: boolean;
};

function getPlayerId() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('playerId') || '';
}

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const code = params.code.toString().toUpperCase();
  const [room, setRoom] = useState<Room | null>(null);
  const [playerId, setPlayerId] = useState(() => getPlayerId());
  const [wordInput, setWordInput] = useState('');
  const router = useRouter();


  // polling del estado de la sala
  useEffect(() => {
    const fetchRoom = async () => {
      const res = await fetch(`/api/rooms/${code}`);
      if (res.ok) {
        const data = await res.json();
        setRoom(data);
      }
    };

    fetchRoom();
    const interval = setInterval(fetchRoom, 2000);

    return () => clearInterval(interval);
  }, [code]);

  if (!room) {
    return <p>Cargando sala...</p>;
  }

  const isHost = room.hostId === playerId;
  const me = room.players.find(p => p.id === playerId);
  const isImpostor = room.impostorId === playerId;

  const handleStart = async () => {
    if (!wordInput) {
        alert("Tenés que poner una palabra secreta");
        return;
    }

    try {
        const res = await fetch("/api/rooms/start", {
        method: "POST",
        body: JSON.stringify({ code, word: wordInput }),
        headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
        const text = await res.text();
        console.error("Error HTTP en /api/rooms/start:", res.status, text);
        alert("No se pudo iniciar la partida. Revisá la consola.");
        return;
        }

        const data = await res.json();
        console.log("Partida iniciada:", data);
        setRoom(data);
    } catch (err) {
        console.error("Error en handleStart:", err);
        alert("Ocurrió un error al iniciar la partida.");
    }
  };

  const handleLeave = async () => {
    try {
        const res = await fetch("/api/rooms/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, playerId }),
        });
        router.push("/");
    } catch (err) {
        console.error("Error al salir de la sala:", err);
    }
    };

  return (
    <main style={{ padding: 24 }}>
      <h1>Sala {room.code}</h1>
      <p>Vos sos: <strong>{me?.name ?? 'Desconocido'}</strong></p>

      <section style={{ marginTop: 16 }}>
        <h2>Jugadores</h2>
        <ul>
          {room.players.map(p => (
            <li key={p.id}>
              {p.name} {p.id === room.hostId && '(host)'}
            </li>
          ))}
        </ul>
      </section>

      {!room.started && (
        <section style={{ marginTop: 24 }}>
          {isHost ? (
            <>
              <h2>Configurar partida</h2>
              <label>
                Palabra secreta
                <input
                  value={wordInput}
                  onChange={e => setWordInput(e.target.value)}
                  style={{ marginLeft: 8 }}
                />
              </label>
              <button onClick={handleStart} style={{ marginLeft: 8 }}>
                Iniciar partida
              </button>
            </>
          ) : (
            <p>Esperando a que el host inicie la partida…</p>
          )}
          <button onClick={handleLeave} style={{ marginTop: 16 }}>
            Salir de la sala
          </button>
        </section>
      )}

      {room.started && (
        <section style={{ marginTop: 24, padding: 16, border: '1px solid #444', borderRadius: 8 }}>
          <h2>Tu rol</h2>
          {isImpostor ? (
            <p><strong>Sos el IMPOSTOR</strong>. Inventá una palabra que parezca que sabés 😉</p>
          ) : (
            <p><strong>Pueblerino</strong>. La palabra es: <strong>{room.word}</strong></p>
          )}

          <p style={{ marginTop: 12 }}>
            A partir de acá ustedes siguen hablando en la vida real: dicen sus palabras y votan quién es el impostor.
          </p>
          <button onClick={handleLeave} style={{ marginTop: 16 }}>
            Salir de la sala
          </button>
        </section>
      )}
    </main>
  );
}
