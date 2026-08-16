import React, { useRef, useState } from 'react';
import { api } from '../api';

/**
 * Subida de foto desde el celular o la computadora.
 *
 * El input tiene accept="image/*", que en un teléfono abre directamente la
 * galería y la cámara. Antes de enviar, la imagen se redimensiona y comprime
 * en el navegador: una foto de iPhone son 4-8 MB, y mandarla entera sería lento
 * con datos móviles y ocuparía mucho en la base. La dejamos en ~1200px de ancho
 * y JPEG al 82%, que para una ficha se ve bien y pesa cerca de 150 KB.
 */

const MAX_LADO = 1200;
const CALIDAD = 0.82;

function comprimirImagen(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('El archivo no parece ser una imagen válida.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_LADO || height > MAX_LADO) {
          if (width > height) {
            height = Math.round((height * MAX_LADO) / width);
            width = MAX_LADO;
          } else {
            width = Math.round((width * MAX_LADO) / height);
            height = MAX_LADO;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        // Fondo blanco: si el PNG tiene transparencia, al pasar a JPEG
        // quedaría negro sin esto.
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', CALIDAD));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function FotoUploader({ fotoUrl, onUploaded, onDeleted }) {
  const inputRef = useRef(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');

    if (!file.type.startsWith('image/')) {
      setError('Elegí un archivo de imagen (JPG, PNG o WEBP).');
      return;
    }

    setSubiendo(true);
    try {
      const dataUrl = await comprimirImagen(file);
      setPreview(dataUrl); // se ve al instante, sin esperar al servidor
      const res = await api.subirFotoComercio(dataUrl);
      onUploaded?.(res.foto_url);
      setPreview(null);
    } catch (err) {
      setError(err.message || 'No se pudo subir la imagen.');
      setPreview(null);
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = ''; // permite re-subir el mismo archivo
    }
  }

  async function borrar() {
    if (!window.confirm('¿Querés quitar la foto de tu ficha?')) return;
    setSubiendo(true);
    setError('');
    try {
      await api.borrarFotoComercio();
      onDeleted?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubiendo(false);
    }
  }

  const mostrando = preview || fotoUrl;

  return (
    <div>
      <label className="text-xs font-semibold text-ink-soft">Foto principal</label>

      {mostrando ? (
        <div className="relative mt-1.5">
          <img
            src={mostrando}
            alt="Foto del comercio"
            className="w-full h-40 object-cover rounded-xl"
            onError={(e) => { e.currentTarget.style.opacity = '0.3'; }}
          />
          {subiendo && (
            <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center text-white text-sm font-bold">
              Subiendo…
            </div>
          )}
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={subiendo}
              className="flex-1 text-xs font-bold bg-stone text-ink py-2.5 rounded-lg disabled:opacity-50"
            >
              Cambiar foto
            </button>
            <button
              type="button"
              onClick={borrar}
              disabled={subiendo}
              className="flex-1 text-xs font-bold bg-red-50 text-red-600 py-2.5 rounded-lg disabled:opacity-50"
            >
              Quitar
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={subiendo}
          className="w-full mt-1.5 border-2 border-dashed border-stone-dark rounded-xl py-8 flex flex-col items-center gap-2 text-ink-soft disabled:opacity-50"
        >
          <span className="text-3xl">{subiendo ? '⏳' : '📷'}</span>
          <span className="text-sm font-bold">
            {subiendo ? 'Subiendo…' : 'Subir foto'}
          </span>
          <span className="text-[11px]">Desde tu celular o computadora</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />

      {error && <div className="text-[11px] text-red-600 mt-1.5">{error}</div>}

      <p className="text-[11px] text-ink-soft mt-1.5 leading-relaxed">
        La imagen se achica automáticamente antes de subirse, así que podés usar una foto
        directo de tu celular sin preocuparte por el peso.
      </p>
    </div>
  );
}
