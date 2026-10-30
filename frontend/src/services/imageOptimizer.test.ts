import { describe, expect, it } from 'vitest';
import { candidateSides, fitDimensions } from './imageOptimizer';

describe('fitDimensions', () => {
  it('tidak memperbesar gambar yang sudah cukup kecil', () => {
    expect(fitDimensions(800, 600, 2048)).toEqual({ width: 800, height: 600 });
  });

  it('menskalakan sisi terpanjang dan menjaga rasio', () => {
    expect(fitDimensions(4000, 2000, 2000)).toEqual({ width: 2000, height: 1000 });
    expect(fitDimensions(1000, 3000, 1500)).toEqual({ width: 500, height: 1500 });
  });

  it('tidak pernah menghasilkan dimensi nol', () => {
    expect(fitDimensions(10000, 1, 100)).toEqual({ width: 100, height: 1 });
  });
});

describe('candidateSides', () => {
  it('dimulai dari ukuran asli (maks 2048) lalu turun', () => {
    expect(candidateSides(5000)).toEqual([2048, 1600, 1280, 1024, 800, 640, 480]);
    expect(candidateSides(1000)).toEqual([1000, 800, 640, 480]);
    expect(candidateSides(300)).toEqual([300]);
  });
});
