import { useEffect, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { api } from '../api/client';

export function useLogisticsHub(onLogisticsChanged: () => void) {
  const [connected, setConnected] = useState(false);
  const callbackRef = useRef(onLogisticsChanged);
  callbackRef.current = onLogisticsChanged;

  useEffect(() => {
    const token = localStorage.getItem('matibox_token');
    let disposed = false;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${api.baseUrl}/hubs/logistics`, {
        accessTokenFactory: () => token || ''
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Error)
      .build();

    connection.on('LogisticsChanged', () => {
      callbackRef.current();
    });

    connection.onreconnecting(() => setConnected(false));
    connection.onreconnected(() => {
      setConnected(true);
      callbackRef.current();
    });
    connection.onclose(() => setConnected(false));

    const startTimer = window.setTimeout(() => {
      if (disposed) return;
      connection
        .start()
        .then(() => {
          if (!disposed) setConnected(true);
        })
        .catch(() => {
          if (!disposed) setConnected(false);
        });
    }, 0);

    return () => {
      disposed = true;
      window.clearTimeout(startTimer);
      if (connection.state !== signalR.HubConnectionState.Disconnected) {
        void connection.stop();
      }
    };
  }, []);

  return { connected };
}
