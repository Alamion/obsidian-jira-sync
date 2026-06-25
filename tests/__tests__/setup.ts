import { vi } from 'vitest';

vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(cb, 0));
vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
