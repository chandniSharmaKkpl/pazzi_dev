import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { ToastAndroid, Platform } from 'react-native';

const WS_URL = 'ws://116.203.83.167:8000/ws?token=ACCESS_TOKEN'; // Replace ACCESS_TOKEN dynamically

const WebSocketContext = createContext(null);

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider = ({ token, children }) => {
  console.log('WebSocketProvider rendered with token:', token);

  const [patrols, setPatrols] = useState([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeout = useRef(3000);
  const lastErrorToast = useRef(0);
  const fallbackInterval = useRef(null);

  // Toast helper (throttle to 1/minute)
  const showToast = (msg) => {
    const now = Date.now();
    if (now - lastErrorToast.current > 60000) {
      if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.LONG);
      // For iOS, use a custom Toast component or Expo's Toast
      lastErrorToast.current = now;
    }
  };

  // Fallback polling
  const startFallback = () => {
    if (fallbackInterval.current) return;
    fallbackInterval.current = setInterval(async () => {
      try {
        const res = await fetch('https://your-api.com/api/patrols');
        const data = await res.json();
        setPatrols(data);
      } catch {}
    }, 10000);
  };
  const stopFallback = () => {
    if (fallbackInterval.current) clearInterval(fallbackInterval.current);
    fallbackInterval.current = null;
  };

  // WebSocket connect logic
  const connect = () => {
    console.log('WebSocket connecting with token:', token);
    stopFallback();
    setConnected(false);
    console.log('WebSocket connecting with token:', token); // <-- Log the token before connecting
    wsRef.current = new WebSocket(`${WS_URL.replace('ACCESS_TOKEN', token)}`);
    wsRef.current.onopen = () => {
      reconnectTimeout.current = 3000;
      setConnected(true);
      wsRef.current?.send(JSON.stringify({ type: 'get_patrols' }));
    };
    wsRef.current.onmessage = (e) => {
      console.log('WebSocket message received:', e.data); // <-- This should log every message
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'all_patrols') {
          console.log('Received all_patrols:', msg.data);
          setPatrols(msg.data);
        }
        if (msg.type === 'updated_patrols') {
          console.log('Received updated_patrols:', msg.data);
          setPatrols((prev) =>
            prev.map((p) => {
              const updated = msg.data.find((u) => u.id === p.id);
              return updated ? { ...p, ...updated } : p;
            })
          );
        }
        if (msg.type === 'deleted_patrols') {
          console.log('Received deleted_patrols:', msg.data);
          setPatrols((prev) => prev.filter((p) => !msg.data.includes(p.id)));
        }
      } catch {}
    };
    wsRef.current.onerror = () => {
      showToast('WebSocket error. Retrying...');
      wsRef.current?.close();
    };
    wsRef.current.onclose = () => {
      setConnected(false);
      // Exponential backoff
      setTimeout(() => {
        reconnectTimeout.current = Math.min(reconnectTimeout.current * 2, 30000);
        connect();
      }, reconnectTimeout.current);
      startFallback();
    };
  };

  // Expose send function
  const send = (msg) => wsRef.current?.send(JSON.stringify(msg));

  useEffect(() => {
    console.log('WebSocketProvider useEffect, token:', token);
    if (!token) return;
    connect();
    return () => {
      wsRef.current?.close();
      stopFallback();
    };
  }, [token]);

  return (
    <WebSocketContext.Provider token={token} value={{ patrols, connected, send }}>
      {children}
    </WebSocketContext.Provider>
  );
};