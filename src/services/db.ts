import Dexie, { type Table } from 'dexie';

export interface LocalSmokingBooth {
  id?: number;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  type: 'user' | 'official';
  createdAt: number;
}

export interface SavedRoute {
  id?: number;
  name: string;
  type: string;
  mode: string;
  distance: number;
  time: number;
  startPoint: { lat: number, lng: number };
  endPoint: { lat: number, lng: number };
  path: { lat: number, lng: number }[];
  createdAt: number;
}

export class FlowDatabase extends Dexie {
  smokingBooths!: Table<LocalSmokingBooth>;
  savedRoutes!: Table<SavedRoute>;

  constructor() {
    super('FlowDatabase');
    this.version(2).stores({
      smokingBooths: '++id, name, type, city, [latitude+longitude]',
      savedRoutes: '++id, name, type, mode, createdAt'
    });
  }
}

export const db = new FlowDatabase();
