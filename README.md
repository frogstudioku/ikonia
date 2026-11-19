# Ikonia

Pustaka ikon (outline dan solid) yang bisa dicari berdasarkan makna, dengan tombol **"Generate an icon with AI"** yang memakai Claude untuk membuat ikon baru kapan saja.

```
site/            website statis (GitHub Pages)
  index.html     halaman utama
  icons.json     data ikon
  config.js      isi WORKER_URL di sini
  lib/icon.js    validasi + pemanggil Claude (dipakai browser, Worker, dan skrip)
worker/index.js  proxy kecil (Cloudflare Worker) yang menyimpan API key
scripts/         generate ikon massal dari terminal
.github/workflows/
  pages.yml           deploy otomatis ke GitHub Pages
  generate-icons.yml  generate ikon massal dari tab Actions
```

Kunci API tidak boleh ada di kode website, karena GitHub Pages bersifat publik. Karena itu tombol generate di website memanggil Worker, dan Worker yang memanggil Claude.

## 1. Deploy website ke GitHub Pages

1. Buat repo baru di GitHub, lalu upload semua isi folder ini (atau `git push`) ke branch `main`.
2. Buka **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Buka tab **Actions**. Workflow *Deploy site to GitHub Pages* berjalan otomatis. Setelah hijau, situs aktif di `https://USERNAME.github.io/NAMA-REPO/`.

Pencarian dan galeri ikon sudah jalan di tahap ini. Tombol generate butuh langkah 2.

## 2. Aktifkan generate AI di website (Cloudflare Worker)

1. Buat akun gratis di Cloudflare, lalu buat API key di console.anthropic.com.
2. Edit `wrangler.toml`, ganti `ALLOWED_ORIGIN` dengan alamat situsmu, tanpa path dan tanpa garis miring di akhir. Contoh: `https://username.github.io`. Kalau pakai domain sendiri, isi keduanya dipisah koma.
3. Di terminal, dalam folder repo:
   ```bash
   npx wrangler login
   npx wrangler secret put ANTHROPIC_API_KEY   # tempel API key saat diminta
   npx wrangler deploy
   ```
4. Salin URL Worker yang muncul (`https://ikonia-worker.xxx.workers.dev`) ke `site/config.js`:
   ```js
   export const WORKER_URL = "https://ikonia-worker.xxx.workers.dev";
   ```
5. Commit dan push. Situs ter-deploy ulang otomatis.

**Batasi biaya** (penting, karena setiap klik generate memakai API):
- Di console.anthropic.com, pasang batas pengeluaran bulanan.
- Di Cloudflare, buka dashboard situsmu dan tambahkan *Rate limiting rule* untuk URL Worker. Worker sudah punya pembatas bawaan (10 permintaan per 10 menit per IP), tetapi itu hanya pelengkap.

Ikon yang dibuat lewat tombol tersimpan **di browser pengunjung itu saja**. Untuk memasukkannya ke pustaka permanen, pakai langkah 3.

## 3. Generate ikon permanen (massal)

**Dari GitHub:**
1. **Settings → Secrets and variables → Actions → New repository secret**, nama `ANTHROPIC_API_KEY`.
2. Tab **Actions → Generate icons with AI → Run workflow**, isi misalnya `rocket, coffee, shield, umbrella`.
3. Ikon baru masuk ke `site/icons.json` lewat commit otomatis, lalu situs ter-deploy ulang.

**Dari terminal:**
```bash
ANTHROPIC_API_KEY=sk-ant-... node scripts/generate-icons.mjs "rocket, coffee, shield"
```
Perlu Node 18 atau lebih baru.

## Keamanan dan kualitas

- Semua ikon dari AI divalidasi di `site/lib/icon.js` (hanya perintah path SVG, panjang dibatasi, nama ketat). Hasil yang aneh ditolak, jadi tidak ada kode berbahaya yang bisa masuk.
- Kualitas gaya ikon AI bisa bervariasi. Cek hasilnya di galeri sebelum dipertahankan. Ikon yang jelek tinggal dihapus dari `site/icons.json`.
- Untuk mengubah gaya ikon (tebal garis, tingkat detail), edit `STYLE_PROMPT` di `site/lib/icon.js`.

## Server MCP

Bagian "Use it in your agent" di halaman masih contoh (`ikonia-mcp` belum ada). Jika ingin server MCP asli, ia cukup membaca `icons.json` dan menyediakan tool `search_icons`, plus `generate_icon` yang memanggil `generateIcon()` dari `site/lib/icon.js`.

## Lisensi

MIT.
