import { useEffect, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import { api } from '../api/client';

export function useLogisticsHub(onLogisticsChanged: () => void) {
  const [connected, setConnected] = useState(false);
  const callbackRef = useRef(onLogisticsChanged);
  callbackRef.current = onLogisticsChanged;

  useEffect(() => {
    const token = localStorage.getItem('matibox_token');
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${api.baseUrl}/hubs/logistics`, {
        accessTokenFactory: () => token || ''
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Warning)
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

    connection
      .start()
      .then(() => setConnected(true))
      .catch(() => setConnected(false));

    return () => {
      connection.stop();
    };
  }, []);

  return { connected };
}
