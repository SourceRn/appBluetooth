'use client'

import React, { JSX, useState, useRef } from 'react'; // Agregamos useRef
import { Thermometer, Droplets, Bluetooth, Power, AlertCircle } from 'lucide-react';

export default function DHT11Monitor(): JSX.Element {
  const [connected, setConnected] = useState<boolean>(false);
  const [temperature, setTemperature] = useState<number | null>(null);
  const [humidity, setHumidity] = useState<number | null>(null);
  const [error, setError] = useState<string>('');
  
  // Referencias para mantener la conexión viva entre renderizados
  const portRef = useRef<any>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<string> | null>(null);
  const keepReading = useRef<boolean>(false);

  const connectSerial = async (): Promise<void> => {
    try {
      setError('');

      if (!("serial" in navigator)) {
        setError('Web Serial API no soportada. Usa Chrome o Edge en Desktop/Android.');
        return;
      }

      // 1. Solicitar puerto
      const port = await (navigator as any).serial.requestPort();
      
      // 2. Abrir puerto (Asegurate que coincida con el Serial.begin de Arduino, usualmente 9600)
      await port.open({ baudRate: 9600 });
      
      portRef.current = port;
      setConnected(true);
      keepReading.current = true;

      // 3. Iniciar lectura
      readLoop(port);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError('Error al conectar: ' + errorMessage);
      console.error(err);
    }
  };

  const readLoop = async (port: any) => {
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
    const reader = textDecoder.readable.getReader();
    readerRef.current = reader;

    let buffer = "";

    try {
      while (keepReading.current) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        if (value) {
          buffer += value;
          // Procesar líneas completas (buscamos salto de línea)
          const lines = buffer.split('\n');
          // Guardamos el fragmento incompleto para la siguiente vuelta
          buffer = lines.pop() || ""; 

          for (const line of lines) {
            parseData(line.trim());
          }
        }
      }
    } catch (error) {
      console.error("Error de lectura:", error);
      disconnect();
    } finally {
      reader.releaseLock();
    }
  };

  const parseData = (data: string) => {
    // Formato esperado de Arduino: "T:25.5,H:60.2"
    console.log("Recibido:", data);
    
    const tempMatch = data.match(/T:?([\d.]+)/i);
    const humMatch = data.match(/H:?([\d.]+)/i);
    
    if (tempMatch && tempMatch[1]) {
      setTemperature(parseFloat(tempMatch[1]));
    }
    if (humMatch && humMatch[1]) {
      setHumidity(parseFloat(humMatch[1]));
    }
  };

  const disconnect = async (): Promise<void> => {
    keepReading.current = false;
    
    if (readerRef.current) {
      await readerRef.current.cancel();
    }
    
    if (portRef.current) {
      await portRef.current.close();
      portRef.current = null;
    }
    
    setConnected(false);
    setTemperature(null);
    setHumidity(null);
  };

  // ... (El resto de tus funciones de color y renderizado se mantienen igual)
  const getTemperatureColor = (temp: number | null): string => {
    if (temp === null) return 'bg-gray-200';
    if (temp < 10) return 'bg-blue-500';
    if (temp < 20) return 'bg-cyan-500';
    if (temp < 25) return 'bg-green-500';
    if (temp < 30) return 'bg-yellow-500';
    if (temp < 35) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getHumidityColor = (hum: number | null): string => {
    if (hum === null) return 'bg-gray-200';
    if (hum < 30) return 'bg-orange-400';
    if (hum < 40) return 'bg-yellow-400';
    if (hum < 60) return 'bg-green-400';
    if (hum < 70) return 'bg-blue-400';
    return 'bg-blue-600';
  };

  const getTemperatureBarHeight = (temp: number | null): string => {
    if (temp === null) return '0%';
    const percentage: number = Math.min(Math.max((temp / 50) * 100, 0), 100);
    return `${percentage}%`;
  };

  const getHumidityBarWidth = (hum: number | null): string => {
    if (hum === null) return '0%';
    return `${Math.min(Math.max(hum, 0), 100)}%`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
          <h1 className="text-2xl font-bold text-gray-800 mb-4 text-center">
            Monitor DHT11 (Serial)
          </h1>
          
          {!connected ? (
            <button
              onClick={connectSerial}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <Bluetooth size={24} />
              Conectar Dispositivo
            </button>
          ) : (
            <button
              onClick={disconnect}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <Power size={24} />
              Desconectar
            </button>
          )}

          <div className="mt-4 flex items-center justify-center gap-2">
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
            <span className="text-sm text-gray-600">
              {connected ? 'Conectado' : 'Desconectado'}
            </span>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>
        
        {/* Aquí abajo van tus bloques de UI de Temperatura y Humedad tal cual los tenías */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
           {/* ... UI Temperatura ... */}
           <div className="flex items-center gap-3 mb-4">
            <div className="bg-red-100 p-3 rounded-xl">
              <Thermometer className="text-red-600" size={28} />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Temperatura</h2>
          </div>
          <div className="flex items-end gap-6">
            <div className="flex flex-col items-center">
              <div className="w-12 h-48 bg-gray-200 rounded-full overflow-hidden relative">
                <div 
                  className={`absolute bottom-0 w-full transition-all duration-500 ${getTemperatureColor(temperature)}`}
                  style={{ height: getTemperatureBarHeight(temperature) }}
                />
              </div>
            </div>
            <div className="flex-1">
              <div className="text-6xl font-bold text-gray-800">
                {temperature !== null ? temperature.toFixed(1) : '--'}
              </div>
              <div className="text-3xl text-gray-500 mt-1">°C</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
           {/* ... UI Humedad ... */}
           <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-100 p-3 rounded-xl">
              <Droplets className="text-blue-600" size={28} />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Humedad</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-baseline gap-2">
              <div className="text-6xl font-bold text-gray-800">
                {humidity !== null ? humidity.toFixed(1) : '--'}
              </div>
              <div className="text-3xl text-gray-500">%</div>
            </div>
            <div className="w-full h-12 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${getHumidityColor(humidity)}`}
                style={{ width: getHumidityBarWidth(humidity) }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}