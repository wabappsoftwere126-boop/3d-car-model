export interface CarPartInfo {
  id: string;
  name: string;
  category: 'exterior' | 'interior' | 'powertrain' | 'chassis';
}

export interface PaintFinish {
  id: string;
  color: string;
  metalness: number;
  roughness: number;
  clearcoat: number;
}

export const PAINT_FINISHES: PaintFinish[] = [
  {
    id: 'ultra-red',
    color: '#9e131b',
    metalness: 0.62,
    roughness: 0.18,
    clearcoat: 1.0,
  },
  {
    id: 'pearl-white',
    color: '#e8eaed',
    metalness: 0.35,
    roughness: 0.16,
    clearcoat: 1.0,
  },
  {
    id: 'obsidian-black',
    color: '#111318',
    metalness: 0.68,
    roughness: 0.14,
    clearcoat: 1.0,
  },
  {
    id: 'quicksilver',
    color: '#8f98a3',
    metalness: 0.82,
    roughness: 0.18,
    clearcoat: 1.0,
  },
  {
    id: 'deep-blue',
    color: '#12325e',
    metalness: 0.65,
    roughness: 0.19,
    clearcoat: 1.0,
  },
];

export const PART_CATALOG: Record<string, CarPartInfo> = {
  body_shell: { id: 'body_shell', name: 'Aerodynamic Body Shell', category: 'exterior' },
  glass_roof: { id: 'glass_roof', name: 'Panoramic All-Glass Roof', category: 'exterior' },
  frunk_hood: { id: 'frunk_hood', name: 'Front Trunk & Aluminum Hood', category: 'exterior' },
  doors: { id: 'doors', name: 'Frameless Acoustic Doors', category: 'exterior' },
  headlights: { id: 'headlights', name: 'Matrix LED Headlights', category: 'exterior' },
  taillights: { id: 'taillights', name: 'Full-Width LED Taillights', category: 'exterior' },
  interior_cabin: { id: 'interior_cabin', name: 'Vegan Leather Cabin & Seats', category: 'interior' },
  center_display: { id: 'center_display', name: '17" Cinematic Touchscreen', category: 'interior' },
  steering_yoke: { id: 'steering_yoke', name: 'Steering Yoke & Pedals', category: 'interior' },
  battery_pack: { id: 'battery_pack', name: '4680 Structural Battery Pack', category: 'powertrain' },
  hv_cables: { id: 'hv_cables', name: 'High-Voltage Power Busbars', category: 'powertrain' },
  front_motor: { id: 'front_motor', name: 'Front Induction Drive Unit', category: 'powertrain' },
  rear_motor: { id: 'rear_motor', name: 'Rear Carbon-Sleeved Dual Motor', category: 'powertrain' },
  heat_pump: { id: 'heat_pump', name: 'Octovalve Thermal Radiator', category: 'powertrain' },
  brakes: { id: 'brakes', name: 'Cross-Drilled Rotors & Calipers', category: 'chassis' },
  suspension: { id: 'suspension', name: 'Double-Wishbone Coilover Suspension', category: 'chassis' },
  wheels: { id: 'wheels', name: '21" Turbine Alloy Wheels', category: 'chassis' },
  chassis_frame: { id: 'chassis_frame', name: 'Die-Cast Aluminum Unibody', category: 'chassis' },
};
