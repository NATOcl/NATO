/* Una lista de canciones con la fila compartida. La usan el modal y la ficha de
   álbum; lo único que cambia es qué pasa cuando algo cambia (el modal marca el
   borrador, la ficha marca "cambios sin guardar").

   `focusToken` se incrementa cada vez que se añade una canción: al cambiar, el
   foco salta al input de la última, que es lo que se va a escribir a
   continuación. Es el mismo truco que el `setTimeout(... focus())` de antes, sin
   el temporizador. */

import { useEffect, useRef } from "react";
import TrackRow from "./TrackRow.jsx";

export default function TrackList({ songs, onChange, focusToken = 0, emptyNode }) {
  const listRef = useRef(null);
  const lastToken = useRef(focusToken);

  useEffect(() => {
    if (focusToken === lastToken.current) return;
    lastToken.current = focusToken;
    const inputs = listRef.current?.querySelectorAll(".track-name");
    inputs?.[inputs.length - 1]?.focus();
  }, [focusToken]);

  const change = (index, patch) =>
    onChange(songs.map((song, i) => (i === index ? { ...song, ...patch } : song)));

  const remove = (index) =>
    onChange(songs.filter((_, i) => i !== index).map((song, i) => ({ ...song, position: i })));

  const move = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= songs.length) return;
    const next = [...songs];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next.map((song, i) => ({ ...song, position: i })));
  };

  if (!songs.length) return emptyNode || null;

  return (
    <div ref={listRef}>
      {songs.map((song, index) => (
        <TrackRow
          key={song.id}
          song={song}
          index={index}
          total={songs.length}
          onChange={change}
          onRemove={remove}
          onMove={move}
        />
      ))}
    </div>
  );
}