# Image Source Finder

Aplikasi web untuk **reverse image search**: unggah sebuah gambar, lalu lihat halaman web yang memuat gambar yang sama atau serupa. Pencarian dijalankan melalui **Google Lens** menggunakan **SerpApi**. Semua hasil berasal langsung dari respons API; aplikasi ini tidak membuat hasil, skor kemiripan, atau status sukses palsu.

- Frontend: React + TypeScript + Vite + Tailwind CSS
- Backend: Node.js + Express + TypeScript (Multer untuk upload)
- Pengujian: Vitest (+ Supertest untuk backend)
- Tanpa database, tanpa autentikasi, tanpa penyimpanan riwayat

## Daftar isi

1. [Cara kerja](#cara-kerja)
2. [Persyaratan](#persyaratan)
3. [Instalasi](#instalasi)
4. [Mendapatkan API key SerpApi](#mendapatkan-api-key-serpapi)
5. [Konfigurasi `.env`](#konfigurasi-env)
6. [Menjalankan (development)](#menjalankan-development)
7. [Build dan production](#build-dan-production)
8. [Typecheck, test, dan build](#typecheck-test-dan-build)
9. [Struktur proyek](#struktur-proyek)
10. [API backend](#api-backend)
11. [Keamanan dan privasi](#keamanan-dan-privasi)
12. [Troubleshooting](#troubleshooting)
13. [Status verifikasi](#status-verifikasi)

## Cara kerja

```
Browser ──(multipart, field "image")──▶ POST /api/search (Express)
                                          │ 1. validasi ekstensi, MIME, dan signature file
                                          │ 2. simpan sementara dengan nama acak
                                          │ 3. POST https://serpapi.com/image          → image_id
                                          │ 4. GET  https://serpapi.com/search
                                          │        ?engine=google_lens&type=all&image_id=…
                                          │ 5. normalisasi visual_matches, organic_results, related_content
                                          │ 6. hapus file sementara (blok finally)
Browser ◀────────── JSON ternormalisasi ──┘
```

Alur dan parameter mengikuti dokumentasi resmi SerpApi: [Image API](https://serpapi.com/image-api), [Google Lens API](https://serpapi.com/google-lens-api), dan [Search API](https://serpapi.com/search-api).

Hal penting dari dokumentasi tersebut yang memengaruhi aplikasi ini:

- **Image API hanya menerima file hingga 500 KB** (JPG/JPEG, PNG, WebP). Karena itu backend membatasi unggahan di 500.000 byte, dan frontend otomatis mengecilkan gambar yang lebih besar di browser (resize dan kompresi JPEG) sebelum dikirim. Gambar yang sudah muat dikirim apa adanya.
- `image_id` kedaluwarsa dalam **10 menit**. Aplikasi memakainya langsung dalam request yang sama.
- Penanda "Cocok persis" hanya muncul bila provider mengirim `exact_matches: true` pada sebuah `visual_matches`. Tidak ada persentase kemiripan karena provider tidak menyediakannya.
- Aplikasi tidak melakukan retry otomatis. Setiap pencarian memakai kuota SerpApi Anda.

## Persyaratan

- **Node.js 20 atau lebih baru** (diuji pada Node 22; backend memakai `fetch`, `FormData`, dan `AbortSignal.timeout` bawaan)
- npm 10 atau lebih baru
- Akun SerpApi dengan API key

## Instalasi

```bash
# dari folder proyek (workspace npm: frontend + backend)
npm install
```

File `package-lock.json` tidak disertakan di arsip ini; `npm install` akan membuatnya. Versi dependensi memakai rentang caret yang kompatibel satu sama lain.

## Mendapatkan API key SerpApi

1. Daftar atau masuk di <https://serpapi.com>.
2. Buka dashboard (<https://serpapi.com/dashboard>) dan salin **API key** Anda.
3. Periksa kuota paket Anda di halaman plan; setiap pencarian memakai kuota. Menurut dokumentasi, hasil cache (query dan parameter identik dalam 1 jam) tidak dihitung.

API key hanya dipakai di backend. Jangan menaruhnya di kode sumber, di frontend, atau di Git.

## Konfigurasi `.env`

```bash
cp .env.example backend/.env      # Windows PowerShell: Copy-Item .env.example backend/.env
```

Lalu isi `SERPAPI_API_KEY` di `backend/.env`.

| Variabel | Default | Keterangan |
| --- | --- | --- |
| `SERPAPI_API_KEY` | (kosong) | API key SerpApi. Bila kosong, aplikasi menampilkan "API belum dikonfigurasi" dan menolak pencarian dengan HTTP 503. |
| `PORT` | `3001` | Port backend. |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Origin frontend yang diizinkan CORS. Pisahkan dengan koma untuk lebih dari satu. |
| `MAX_UPLOAD_MB` | `0.5` | Batas unggahan backend dalam MB. Nilai di atas batas provider otomatis dipotong ke 500.000 byte. |

Opsional untuk frontend: bila frontend dan backend di-deploy terpisah, set `VITE_API_BASE_URL` (mis. `https://api.contoh.com`) saat build frontend. Itu bukan secret. Bila backend memakai port selain 3001 saat development, jalankan Vite dengan `API_PORT=<port>`.

## Menjalankan (development)

Satu perintah dari root (menjalankan backend dan frontend bersamaan):

```bash
npm run dev
```

- Frontend: <http://localhost:5173> (proxy `/api` ke backend)
- Backend: <http://localhost:3001> (`GET /api/health`)

Atau di dua terminal terpisah:

```bash
npm run dev -w backend     # terminal 1
npm run dev -w frontend    # terminal 2
```

## Build dan production

```bash
npm run build     # build frontend (frontend/dist) lalu kompilasi backend (backend/dist)
npm start         # menjalankan backend; otomatis menyajikan frontend/dist bila ada
```

Setelah itu buka <http://localhost:3001>. Pada mode ini frontend dan API satu origin, sehingga CORS tidak terlibat. Pastikan environment variable (atau `backend/.env`) terisi di server production.

## Typecheck, test, dan build

```bash
npm run typecheck   # tsc --noEmit untuk backend dan frontend
npm test            # vitest (backend lalu frontend)
npm run build       # typecheck frontend + vite build + kompilasi backend
```

ESLint **tidak dikonfigurasi** pada proyek ini, sehingga tidak ada script `lint`. Pemeriksaan statis dilakukan oleh `strict` TypeScript lewat `npm run typecheck`.

Cakupan test:

- Backend: validasi file (ekstensi, MIME, signature, file kosong), sanitasi URL, parsing konfigurasi, normalisasi respons (fixture sintetis berlabel, URL invalid, hasil kosong, duplikat, field null), klien SerpApi (request, error provider, timeout, tidak membocorkan API key ke log), service pencarian, dan route Express (503 belum dikonfigurasi, 400/413/415, sukses, error provider, rate limit, file sementara terhapus).
- Frontend: format ukuran, validasi file, perhitungan dimensi resize, dan parsing/penyaringan respons backend.

Fixture pada test adalah data sintetis berlabel dan tidak pernah dipakai sebagai hasil produksi.

## Struktur proyek

```
image-source-finder/
├── backend/
│   ├── src/
│   │   ├── routes/         health.ts, search.ts (Multer, rate limit, alur pencarian)
│   │   ├── services/       serpapiClient.ts, normalize.ts, searchService.ts
│   │   ├── middleware/     errorHandler.ts (format error konsisten)
│   │   ├── types/          tipe hasil dan respons
│   │   ├── utils/          errors.ts, fileValidation.ts, url.ts
│   │   ├── app.ts          konfigurasi Express (helmet, CORS, static)
│   │   ├── config.ts       parsing environment variable
│   │   └── server.ts       entry point
│   └── tests/
├── frontend/
│   └── src/
│       ├── components/     UploadZone, PreviewPanel, ResultCard, dll.
│       ├── pages/          HomePage.tsx
│       ├── hooks/          useImageSearch.ts
│       ├── services/       api.ts, imageOptimizer.ts
│       ├── types/ utils/
│       └── App.tsx, main.tsx, index.css
├── .env.example
├── .gitignore
└── package.json            workspace root
```

## API backend

### `GET /api/health`

```json
{ "status": "ok", "configured": true, "maxUploadBytes": 500000, "timestamp": "…" }
```

`configured` hanya boolean; API key tidak pernah ditampilkan.

### `POST /api/search`

`multipart/form-data` dengan satu field `image`. Respons sukses:

```json
{
  "success": true,
  "results": [
    {
      "id": "exact-1",
      "title": "…",
      "source": "…",
      "domain": "contoh.com",
      "link": "https://contoh.com/halaman",
      "thumbnail": "https://…",
      "image": "https://…",
      "snippet": "…",
      "matchType": "exact"
    }
  ],
  "related": [{ "query": "…", "link": "https://…" }],
  "meta": { "provider": "SerpApi Google Lens", "total": 1, "exactMatchCount": 1, "discarded": 0, "durationMs": 2300 }
}
```

`matchType`: `exact` (provider menandai `exact_matches: true`), `visual` (visual match biasa), `page` (dari `organic_results`). Field selain `id`, `link`, dan `matchType` bersifat opsional.

Respons gagal selalu berbentuk `{ "success": false, "error": { "code": "…", "message": "…" } }`:

| Kode | HTTP | Arti |
| --- | --- | --- |
| `NO_FILE` | 400 | Tidak ada file pada field `image` |
| `FILE_EMPTY` | 400 | File kosong |
| `INVALID_UPLOAD` | 400 | Unggahan tidak valid (mis. lebih dari satu file) |
| `UNSUPPORTED_TYPE` | 415 | Bukan JPG/PNG/WebP, atau isi file tidak cocok dengan ekstensi/MIME |
| `FILE_TOO_LARGE` | 413 | Melebihi batas ukuran |
| `RATE_LIMITED` | 429 | Lebih dari 10 pencarian per menit dari satu IP |
| `NOT_CONFIGURED` | 503 | `SERPAPI_API_KEY` belum diisi |
| `PROVIDER_AUTH_FAILED` | 502 | API key ditolak SerpApi |
| `PROVIDER_QUOTA_EXCEEDED` | 429 | Kuota/batas SerpApi tercapai |
| `PROVIDER_TIMEOUT` | 504 | SerpApi terlalu lama merespons |
| `PROVIDER_UNAVAILABLE` / `PROVIDER_ERROR` | 502 | SerpApi tidak terjangkau atau mengirim respons tak terduga |
| `INTERNAL_ERROR` | 500 | Kesalahan server tak terduga |

Pesan error ke browser berupa teks tetap yang aman; body error mentah dari provider hanya dicatat (tanpa API key) di log server.

## Keamanan dan privasi

- API key hanya dibaca dari environment backend; tidak ada di bundle frontend, log, respons API, maupun Git (`.env` ada di `.gitignore`, `.env.example` tanpa key).
- Validasi unggahan berlapis: ekstensi, MIME, lalu **magic bytes** file; batas ukuran di Multer; file kosong ditolak.
- File sementara memakai nama acak (UUID) di folder temp sistem, dihapus di blok `finally` (sukses maupun gagal). Sisa file lama dibersihkan saat server start. Tidak ada penyimpanan permanen.
- Hanya URL `http:`/`https:` yang diteruskan ke browser (disaring di backend dan sekali lagi di frontend); tautan eksternal memakai `target="_blank"` dan `rel="noopener noreferrer"`.
- `helmet` (termasuk Content-Security-Policy), CORS dibatasi ke `CLIENT_ORIGIN`, dan rate limit 10 permintaan/menit per IP pada `/api/search`.
- Gambar dikirim ke SerpApi dan Google Lens agar pencarian dapat berjalan. Pesan privasi ditampilkan di antarmuka dan footer.
- Tidak ada fitur untuk mengidentifikasi orang atau melacak lokasi dari gambar.
- Catatan: bila backend berada di balik reverse proxy, atur `app.set('trust proxy', …)` di `backend/src/app.ts`; tanpa itu rate limit melihat semua klien sebagai satu IP.

## Troubleshooting

| Gejala | Penyebab dan solusi |
| --- | --- |
| Banner "API belum dikonfigurasi" | `SERPAPI_API_KEY` kosong. Isi di `backend/.env`, lalu restart backend dan klik "Periksa lagi". |
| `PROVIDER_AUTH_FAILED` (API key tidak valid) | Key salah, ada spasi/tanda kutip berlebih, atau key dicabut. Salin ulang dari dashboard SerpApi. |
| `PROVIDER_QUOTA_EXCEEDED` (kuota habis) | Kuota bulanan atau batas per jam paket SerpApi tercapai. Cek halaman plan; tambah kuota atau tunggu reset. |
| "Gambar tidak dapat dikecilkan" / `FILE_TOO_LARGE` | Batas provider 500 KB. Browser mengecilkan otomatis; bila gagal (gambar sangat besar/rusak), potong atau kecilkan gambar secara manual. |
| `PROVIDER_TIMEOUT` atau pencarian lama | SerpApi/Google Lens lambat. Coba lagi; timeout upload 30 detik dan pencarian 60 detik. |
| Error CORS di konsol browser | Saat development, akses lewat <http://localhost:5173> (proxy). Bila akses dari origin lain, tambahkan ke `CLIENT_ORIGIN` dan restart backend. |
| "Server tidak dapat dihubungi" | Backend tidak berjalan atau port berbeda. Jalankan `npm run dev`; bila `PORT` diubah, jalankan Vite dengan `API_PORT=<port>`. |
| Hasil kosong | Lens tidak menemukan halaman untuk gambar itu. Coba resolusi lebih tinggi, potong ke objek utama, atau gambar lain. Ini hasil jujur dari provider, bukan error. |
| Thumbnail tidak muncul pada beberapa kartu | Domain pemilik thumbnail memblokir hotlink atau gambar sudah dihapus. Kartu tetap menampilkan judul dan tombol "Buka sumber". |
| `RATE_LIMITED` | Batas 10 pencarian/menit per IP. Tunggu sebentar. |

## Status verifikasi

Arsip ini dibuat di lingkungan **tanpa akses jaringan**, sehingga `npm install` tidak dapat dijalankan dan hal berikut **belum pernah dieksekusi oleh pembuat**:

- `npm install`, `npm run build` (Vite/tsc penuh), `npm run typecheck` penuh dengan paket terpasang, serta `vitest` yang sesungguhnya.
- Test route Express (`backend/tests/app.test.ts`, memakai Supertest) dan rendering antarmuka di browser.
- **Integrasi SerpApi dengan API key nyata.** Request dan parsing ditulis dari dokumentasi resmi dan diuji dengan fetch palsu serta fixture sintetis; belum diuji terhadap server SerpApi yang sebenarnya.

Yang sudah diverifikasi di lingkungan pembuat:

- Sintaks seluruh file TypeScript/TSX dapat di-parse tanpa error.
- Modul logika (utils, config, normalisasi, klien SerpApi, service pencarian, API frontend, optimizer) lolos typecheck mode `strict` dengan stub tipe Node minimal.
- 56 unit test untuk modul tersebut lolos (40 backend, 16 frontend) memakai shim `vitest` sederhana, termasuk satu bug validasi klien yang ditemukan dan sudah diperbaiki.

Saat pertama kali menjalankan di komputer Anda, urutan yang disarankan: `npm install` → `npm run typecheck` → `npm test` → `npm run build`. Bila ada kegagalan kecil pada langkah-langkah yang belum diverifikasi di atas, itu kemungkinan perbedaan versi paket.

## Catatan desain

Antarmuka hanya memakai hitam, putih, dan abu-abu netral, dan mengikuti mode terang/gelap sistem. Satu-satunya elemen dekoratif adalah siku bidik (viewfinder) di sudut area unggah dan pratinjau. Font Schibsted Grotesk dimuat dari Google Fonts; bila tidak tersedia, antarmuka memakai font sistem.

## Lisensi

MIT. Lihat `LICENSE`.
