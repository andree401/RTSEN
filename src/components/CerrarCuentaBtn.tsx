import React, { useState } from 'react';

type Step = 'INITIAL' | 'FIRST_CONFIRM' | 'SECOND_CONFIRM';

interface CerrarCuentaBtnProps {
  onDelete: () => void;
}

export default function CerrarCuentaBtn({ onDelete }: CerrarCuentaBtnProps) {
  const [step, setStep] = useState<Step>('INITIAL');

  const handleFirstClick = () => setStep('FIRST_CONFIRM');
  const handleCancel = () => setStep('INITIAL');
  const handleSecondClick = () => setStep('SECOND_CONFIRM');
  const handleFinalClick = () => {
    onDelete();
    setStep('INITIAL');
  };

  return (
    <div className="border border-red-300 bg-red-50 rounded-lg p-6 max-w-md">
      <h3 className="text-lg font-bold text-red-700 mb-2">Zona de Peligro</h3>
      
      {step === 'INITIAL' && (
        <>
          <p className="text-sm text-gray-700 mb-4">
            Al cerrar tu cuenta, perderás acceso a todos los datos.
          </p>
          <button
            onClick={handleFirstClick}
            className="bg-red-600 text-white px-4 py-2 rounded font-semibold hover:bg-red-700 transition"
          >
            Cerrar Cuenta
          </button>
        </>
      )}

      {step === 'FIRST_CONFIRM' && (
        <>
          <p className="text-sm text-red-700 font-semibold mb-4">
            ¿Estás seguro de que deseas cerrar tu cuenta?
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleSecondClick}
              className="bg-red-600 text-white px-4 py-2 rounded font-semibold hover:bg-red-700 transition"
            >
              Sí, continuar
            </button>
            <button
              onClick={handleCancel}
              className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400 transition"
            >
              Cancelar
            </button>
          </div>
        </>
      )}

      {step === 'SECOND_CONFIRM' && (
        <>
          <p className="text-sm text-red-700 font-bold mb-4">
            Esta acción es irreversible y eliminará todos tus datos. ¿Confirmas la eliminación definitiva?
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleFinalClick}
              className="bg-red-800 text-white px-4 py-2 rounded font-semibold hover:bg-red-900 transition"
            >
              Eliminar definitivamente
            </button>
            <button
              onClick={handleCancel}
              className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400 transition"
            >
              Cancelar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
