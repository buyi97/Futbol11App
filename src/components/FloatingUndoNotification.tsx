import React, { useState, useEffect } from 'react';
import { RotateCcw, X, Trash2, CheckCircle } from 'lucide-react';
import { StorageService } from '../services/storage';
import { ApiService } from '../services/api';
import { AccionDeshacer } from '../types';

interface FloatingUndoNotificationProps {
  onRestaurado: () => void;
}

export const FloatingUndoNotification: React.FC<FloatingUndoNotificationProps> = ({
  onRestaurado
}) => {
  const [accion, setAccion] = useState<AccionDeshacer | null>(() => StorageService.getAccionDeshacer());
  const [restaurando, setRestaurando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [segundosRestantes, setSegundosRestantes] = useState<number>(20);

  useEffect(() => {
    const handleDeshacerActualizado = () => {
      const nuevaAccion = StorageService.getAccionDeshacer();
      setAccion(nuevaAccion);
      setSegundosRestantes(20);
    };

    window.addEventListener('futbol11-deshacer-actualizado', handleDeshacerActualizado);
    return () => {
      window.removeEventListener('futbol11-deshacer-actualizado', handleDeshacerActualizado);
    };
  }, []);

  // Temporizador de 20 segundos para que la opción permanezca disponible
  useEffect(() => {
    if (!accion) return;

    const timer = setInterval(() => {
      setSegundosRestantes(prev => {
        if (prev <= 1) {
          StorageService.limpiarAccionDeshacer();
          setAccion(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [accion]);

  if (!accion && !mensajeExito) return null;

  const handleDeshacer = async () => {
    if (!accion || restaurando) return;
    setRestaurando(true);
    try {
      await ApiService.restaurarAccionDeshacer(accion);
      setMensajeExito(`¡${accion.titulo} fue restaurado con éxito!`);
      setAccion(null);
      onRestaurado();
      setTimeout(() => {
        setMensajeExito(null);
      }, 3500);
    } catch (err) {
      console.error('Error restaurando acción:', err);
    } finally {
      setRestaurando(false);
    }
  };

  const handleCerrar = () => {
    StorageService.limpiarAccionDeshacer();
    setAccion(null);
  };

  if (mensajeExito) {
    return (
      <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 animate-bounce-short">
        <div className="bg-[#182a1f] border border-[#3ddc84] text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md">
          <CheckCircle className="w-5 h-5 text-[#3ddc84] shrink-0" />
          <span className="text-xs sm:text-sm font-bold tracking-wide">{mensajeExito}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      id="floating-undo-banner"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-50 animate-fadeIn"
    >
      <div className="bg-[#101b14] border border-[#e63946]/60 rounded-2xl p-4 shadow-2xl backdrop-blur-md shadow-black/80 flex flex-col gap-2 relative overflow-hidden">
        {/* Barra de progreso de tiempo restante */}
        <div
          className="absolute top-0 left-0 h-1 bg-[#3ddc84] transition-all duration-1000"
          style={{ width: `${(segundosRestantes / 20) * 100}%` }}
        />

        <div className="flex items-start justify-between gap-3 pt-0.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#e63946]/15 border border-[#e63946]/40 flex items-center justify-center shrink-0 text-[#e63946]">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                  {accion?.tipo === 'torneo' ? 'Torneo Eliminado' : 'Partido Eliminado'}
                </span>
                <span className="text-[11px] text-zinc-400 font-mono">
                  {segundosRestantes}s
                </span>
              </div>
              <h4 className="text-sm font-bold text-white tracking-wide mt-0.5">
                {accion?.titulo}
              </h4>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCerrar}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            title="Cerrar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[#9aa89f] line-clamp-2 pl-10">
          {accion?.descripcion}
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-1 mt-1 border-t border-[#243d2c]/60">
          <button
            type="button"
            onClick={handleCerrar}
            className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            Descartar
          </button>

          <button
            type="button"
            id="btn-deshacer-flotante"
            disabled={restaurando}
            onClick={handleDeshacer}
            className="px-4 py-2 bg-[#3ddc84] hover:bg-[#2bb46a] text-[#0f1712] text-xs font-bold uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-all shadow-lg shadow-[#3ddc84]/20 cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${restaurando ? 'animate-spin' : ''}`} />
            {restaurando ? 'Restaurando...' : 'DESHACER'}
          </button>
        </div>
      </div>
    </div>
  );
};
