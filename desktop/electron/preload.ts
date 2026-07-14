import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('angroupDesktop', {
  getApiBaseUrl: (): Promise<string> => ipcRenderer.invoke('config:get-api-base-url'),
  setApiBaseUrl: (url: string): Promise<boolean> => ipcRenderer.invoke('config:set-api-base-url', url),
});
