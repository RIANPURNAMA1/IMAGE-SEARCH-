import { mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { createApp } from './app';
import { parseConfig } from './config';

// backend/.env (satu tingkat di atas src/ maupun dist/). Nilai dari environment proses tetap diutamakan.
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const config = parseConfig(process.env);

/** Bersihkan sisa file sementara dari proses yang berhenti mendadak. */
function removeStaleTempFiles(dir: string, maxAgeMs: number): void {
  mkdirSync(dir, { recursive: true });
  const cutoff = Date.now() - maxAgeMs;
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.upload')) continue;
    const filePath = path.join(dir, name);
    try {
      if (statSync(filePath).mtimeMs < cutoff) unlinkSync(filePath);
    } catch {
      // diabaikan: file mungkin sudah dihapus oleh proses lain
    }
  }
}

removeStaleTempFiles(config.tempDir, 60 * 60 * 1000);

const app = createApp({ config });

const server = app.listen(config.port, () => {
  console.log(`[server] Image Source Finder berjalan di http://localhost:${config.port}`);
  console.log(
    config.serpapiApiKey
      ? '[server] SERPAPI_API_KEY terdeteksi.'
      : '[server] PERINGATAN: SERPAPI_API_KEY belum diisi. Pencarian akan ditolak dengan status "API belum dikonfigurasi".',
  );
});

function shutdown(): void {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
