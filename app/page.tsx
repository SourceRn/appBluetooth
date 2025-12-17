'use client'

import React, { JSX, useState } from 'react';
import { Thermometer, Droplets, Bluetooth, Power, AlertCircle } from 'lucide-react';

interface SensorData {
  temperature: number | null;
  humidity: number | null;
}

export default function DHT11Monitor(): JSX.Element {
  const [device, setDevice] = useState<BluetoothDevice | null>(null);
  const [characteristic, setCharacteristic] = useState<BluetoothRemoteGATTCharacteristic | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [temperature, setTemperature] = useState<number | null>(null);
  const [humidity, setHumidity] = useState<number | null>(null);
  const [error, setError] = useState<string>('');

  const connectBluetooth = async (): Promise<void> => {
    try {
      setError('');
      
      if (!navigator.bluetooth) {
        setError('Web Bluetooth API no está disponible en este navegador. Usa Chrome en Android o computadora.');
        return;
      }

      // Buscar TODOS los dispositivos Bluetooth cercanos
      const device: BluetoothDevice = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '0000ffe0-0000-1000-8000-00805f9b34fb', // UUID común HC-05/HC-06
          '00001101-0000-1000-8000-00805f9b34fb'  // SPP (Serial Port Profile)
        ]
      });

      const server: BluetoothRemoteGATTServer | undefined = await device.gatt?.connect();
      
      if (!server) {
        throw new Error('No se pudo conectar al servidor GATT');
      }

      // Intentar conectar con el UUID estándar
      let service: BluetoothRemoteGATTService;
      let char: BluetoothRemoteGATTCharacteristic;
      
      try {
        service = await server.getPrimaryService('0000ffe0-0000-1000-8000-00805f9b34fb');
        char = await service.getCharacteristic('0000ffe1-0000-1000-8000-00805f9b34fb');
      } catch (err) {
        // Si falla, intentar con otro UUID común
        try {
          service = await server.getPrimaryService('00001101-0000-1000-8000-00805f9b34fb');
          const characteristics = await service.getCharacteristics();
          if (characteristics.length > 0) {
            char = characteristics[0];
          } else {
            throw new Error('No se encontraron características');
          }
        } catch (err2) {
          throw new Error('No se pudo conectar con los servicios del dispositivo. Asegúrate de seleccionar el HC-05 o HC-06.');
        }
      }

      await char.startNotifications();
      char.addEventListener('characteristicvaluechanged', handleData);

      setDevice(device);
      setCharacteristic(char);
      setConnected(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError('Error al conectar: ' + errorMessage);
      console.error(err);
    }
  };

  const disconnect = (): void => {
    if (device && device.gatt?.connected) {
      device.gatt.disconnect();
    }
    setConnected(false);
    setDevice(null);
    setCharacteristic(null);
    setTemperature(null);
    setHumidity(null);
  };

  const handleData = (event: Event): void => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const value: DataView | undefined = target.value;
    
    if (!value) return;
    
    const decodedValue: string = new TextDecoder().decode(value);
    
    // Formato esperado: "T:25.5,H:60.2" o similar
    const tempMatch: RegExpMatchArray | null = decodedValue.match(/T:?([\d.]+)/i);
    const humMatch: RegExpMatchArray | null = decodedValue.match(/H:?([\d.]+)/i);
    
    if (tempMatch && tempMatch[1]) {
      setTemperature(parseFloat(tempMatch[1]));
    }
    if (humMatch && humMatch[1]) {
      setHumidity(parseFloat(humMatch[1]));
    }
  };

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
            Monitor DHT11
          </h1>
          
          {!connected ? (
            <button
              onClick={connectBluetooth}
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

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-4">
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
              <div className="w-16 h-16 rounded-full bg-red-500 -mt-3 border-4 border-white shadow-lg" />
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

        <div className="mt-4 text-center text-sm text-gray-600">
          Actualización cada segundo
        </div>
      </div>
    </div>
  );
}