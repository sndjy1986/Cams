import { Camera } from './types';

export const ALL_CAMERAS: Camera[] = [
  { 
    id: 'cam1',
    name: 'MM 2 ', 
    url: 'https://s20.us-east-1.skyvdn.com/rtplive/30302/chunklist_w1067583639.m3u8', 
    description: 'Mile Marker 2 - Just before GA Border',
    lat: 34.456,
    lng: -82.890,
    direction: 'NB'
  },
  { 
    id: 'cam2',
    name: 'MM 19 - Clemson Blvd', 
    url: 'https://s20.us-east-1.skyvdn.com/rtplive/30057/chunklist_w2092101538.m3u8', 
    description: 'Mile Marker 19 - Clemson Blvd - Closest Lanes are SB Traffic',
    lat: 34.573,
    lng: -82.711,
    direction: 'SB'
  },
  { 
    id: 'cam3',
    name: 'MM 21 - HWY 178', 
    url: 'https://s19.us-east-1.skyvdn.com/rtplive/30056/chunklist_w234287558.m3u8', 
    description: 'Mile Marker 21 - Highway 178 - Closest Lanes are NB Traffic',
    lat: 34.601,
    lng: -82.680,
    direction: 'NB'
  },
  { 
    id: 'cam4',
    name: 'MM 23 - Rest Area', 
    url: 'https://s18.us-east-1.skyvdn.com/rtplive/30055/chunklist_w1988576416.m3u8', 
    description: 'Mile Marker 23 - Rest Area - Closest Lanes are SB Traffic',
    lat: 34.620,
    lng: -82.650,
    direction: 'SB'
  },   
  { 
    id: 'cam5',
    name: 'MM 24', 
    url: 'https://s20.us-east-1.skyvdn.com/rtplive/30054/chunklist_w1763131792.m3u8', 
    description: 'Mile Marker 24 - Closest Lanes are NB Traffic',
    lat: 34.635,
    lng: -82.630,
    direction: 'NB'
  },
  { 
    id: 'cam6',
    name: 'MM 27 - HWY 81', 
    url: 'https://s19.us-east-1.skyvdn.com/rtplive/30053/chunklist_w682873545.m3u8', 
    description: 'Mile Marker 27 - Highway 81 - Closest Lanes are SB Traffic',
    lat: 34.660,
    lng: -82.600,
    direction: 'SB'
  }
];
