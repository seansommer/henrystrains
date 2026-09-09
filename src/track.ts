export const RAIL_HEIGHT = .3;
export const TRAIN_START = .86;
const COUNT = 1024, RX = 6.9, RZ = 4.55;
const samples = Array.from({ length: COUNT + 1 }, (_, i) => {
  const angle = i / COUNT * Math.PI * 2;
  return { x: RX * Math.sin(angle), z: RZ * Math.cos(angle), length: 0 };
});
for (let i = 1; i <= COUNT; i++) samples[i].length = samples[i - 1].length + Math.hypot(samples[i].x - samples[i - 1].x, samples[i].z - samples[i - 1].z);
export const TRACK_LENGTH = samples[COUNT].length;
export function trackPoint(distance: number) {
  const d = ((distance % TRACK_LENGTH) + TRACK_LENGTH) % TRACK_LENGTH;
  let low = 0, high = COUNT;
  while (high - low > 1) { const middle = (low + high) >> 1; if (samples[middle].length <= d) low = middle; else high = middle; }
  const a = samples[low], b = samples[high], t = (d - a.length) / (b.length - a.length);
  const angle = (low + t) / COUNT * Math.PI * 2;
  const dx = RX * Math.cos(angle), dz = -RZ * Math.sin(angle), size = Math.hypot(dx,dz);
  return { x: a.x + (b.x-a.x)*t, z: a.z + (b.z-a.z)*t, dx: dx/size, dz: dz/size, heading: Math.atan2(dx,dz) };
}

export function cameraFrame(aspect: number, close = false) {
  const width = close ? 15.2 : 21.2, height = close ? 8.7 : 14;
  const viewHeight = Math.max(height, width / Math.max(.25,aspect));
  return { width: viewHeight * aspect, height: viewHeight };
}
export function cameraPose(close:boolean) {
  return { target:[0,close?.6:0,close?2.9:.2] as const, offset:[close?7:9,close?8:13,close?15:17] as const };
}
