# Ikonia

Pustaka ikon (outline dan solid) yang bisa dicari berdasarkan makna, dengan tombol **"Generate an icon with AI"** yang memakai Claude untuk membuat ikon baru kapan saja.

```
site/            website statis (GitHub Pages)
  index.html     halaman utama
  icons.json     data ikon
  config.js      isi WORKER_URL di sini
  lib/icon.js    validasi + pemanggil Claude (dipakai browser, Worker, dan skrip)
worker/index.js  proxy kecil (Cloudflare Worker) yang menyimpan API key
scripts/         generate-icons.mjs (pakai API) dan add-icons.mjs (dari chat)
mcp/             server MCP (search_icons, get_icon, generate_icon)
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

## 2. Aktifkan generate AI di website (opsional, butuh saldo API)

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

## 3b. Tanpa saldo API: buat ikon lewat chat

Kalau tidak mau memakai API berbayar, minta Claude membuat ikon langsung di chat (claude.ai, sesuai batas paket akunmu), lalu masukkan hasilnya ke repo. Tombol generate di website bersembunyi sendiri selama `WORKER_URL` kosong, jadi website tetap rapi tanpa Worker.

1. Kirim prompt ini ke Claude (ganti daftar ikonnya):
   ```
   Buatkan ikon-ikon ini untuk pustaka ikon: pillow, bed, alarm, lamp.
   Balas HANYA dengan JSON array. Setiap ikon berbentuk:
   {"name":"kebab-case","tags":"6-12 sinonim huruf kecil dipisah spasi","f":["path bentuk tertutup"],"l":"path detail dalam atau kosong","x":"path garis terbuka atau kosong"}
   Aturan: viewBox 24x24, koordinat 2 sampai 22, stroke 1.75 dengan ujung bulat. "f" = bentuk tertutup (dipenuhi warna di gaya solid, maks 4), "l" = detail di dalam bentuk, "x" = garis luar yang tidak pernah diisi. Hanya perintah path M L H V C S Q T A Z. Tanpa teks atau elemen SVG lain.
   Contoh: {"name":"lock","tags":"security password private","f":["M5 11h14v10H5z"],"l":"M12 15v2","x":"M8 11V8a4 4 0 0 1 8 0v3"}
   ```
2. Simpan balasannya ke file `new-icons.json` di folder repo.
3. Jalankan `node scripts/add-icons.mjs new-icons.json`. Skrip memvalidasi setiap ikon, menolak yang tidak valid, dan menambahkan sisanya ke `site/icons.json`.
4. Commit dan push `site/icons.json`. Situs ter-deploy ulang otomatis.

Alternatif lain tanpa saldo API: pakai Claude Code dengan langganan Claude, lalu minta langsung "tambahkan ikon X ke site/icons.json sesuai format yang ada".

## Keamanan dan kualitas

- Semua ikon dari AI divalidasi di `site/lib/icon.js` (hanya perintah path SVG, panjang dibatasi, nama ketat). Hasil yang aneh ditolak, jadi tidak ada kode berbahaya yang bisa masuk.
- Kualitas gaya ikon AI bisa bervariasi. Cek hasilnya di galeri sebelum dipertahankan. Ikon yang jelek tinggal dihapus dari `site/icons.json`.
- Untuk mengubah gaya ikon (tebal garis, tingkat detail), edit `STYLE_PROMPT` di `site/lib/icon.js`.

## 4. Server MCP untuk coding agent

Folder `mcp/` berisi server MCP asli dengan tiga tool:

| Tool | Fungsi |
|---|---|
| `search_icons` | cari ikon berdasarkan makna ("save to device" menemukan `download`) |
| `get_icon` | ambil kode siap tempel: SVG atau komponen React, outline atau solid, ukuran dan warna bisa diatur |
| `generate_icon` | buat ikon baru dengan Claude kalau tidak ada yang cocok, lalu simpan di komputermu (`~/.ikonia/icons.json`) |

`search_icons` dan `get_icon` bekerja offline dan gratis. Hanya `generate_icon` yang butuh `ANTHROPIC_API_KEY` dan memakai kredit API.

**Cara A, langsung dari repo (paling cepat):**
```bash
cd mcp && npm install
claude mcp add ikonia -- node /path/lengkap/ke/ikonia/mcp/server.js
```
Untuk Claude Desktop, Cursor, dan klien lain, tambahkan ke file konfigurasi MCP:
```json
{
  "mcpServers": {
    "ikonia": {
      "command": "node",
      "args": ["/path/lengkap/ke/ikonia/mcp/server.js"],
      "env": { "ANTHROPIC_API_KEY": "sk-ant-..." }
    }
  }
}
```
Baris `env` boleh dihapus kalau kamu tidak butuh `generate_icon`.

**Cara B, publish ke npm** (supaya orang lain cukup memakai `npx`):
```bash
cd mcp && npm install && npm test
npm login && npm publish     # nama "ikonia-mcp" mungkin sudah dipakai: ganti ke "@username/ikonia-mcp" dan publish dengan --access public
```
Setelah itu konfigurasinya menjadi `"command": "npx", "args": ["-y", "ikonia-mcp"]`, sama seperti contoh di halaman website. `npm publish` otomatis menyalin `icons.json` terbaru dari `site/` lewat skrip `prepack`.

Ikon yang dibuat lewat `generate_icon` hanya ada di komputer pemakainya. Kalau mau ikon itu masuk pustaka publik, salin isinya ke `site/icons.json`.

## Lisensi

MIT.
