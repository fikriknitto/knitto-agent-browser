---
label: Tambah Incident
variant: amber
defaults:
  url: ""
  judul: ""
  deskripsi: ""
  severity: ""
  status: ""
  services: ""
  service: ""
  status_service: ""
---
# Tambah Incident
1. pilih menu incidents.
2. Tunggu hingga halaman selesai dimuat.
3. Klik tombol atau shortcut dengan label "Tambah Incident".
4. Tunggu hingga modal/popup form tambah incident ditampilkan.
5. Verifikasi modal/popup form tambah incident terlihat dan siap diisi.
6. Isi field Judul dengan {judul}.
7. Isi field Deskripsi dengan {deskripsi}.
8. Pilih atau isi field Severity dengan {severity}.
9. Pilih atau isi field Status dengan {status}.
10. Untuk setiap entri array of object dalam {services}:
    a. Tambahkan baris service baru jika diperlukan.
    b. Isi field Service dengan nilai service dari entri tersebut.
    c. Isi field Status Service dengan nilai status_service dari entri tersebut.
11. Verifikasi seluruh field wajib telah terisi sesuai data yang dimasukkan.
12. **(Wajib)** Klik tombol **Simpan / Save / Submit** pada modal/popup — jangan tutup modal sebelum langkah ini.
13. Tunggu hingga proses penyimpanan selesai.
14. Verifikasi sukses (toast/pesan sukses atau data tersimpan) — modal tertutup hanya sebagai **akibat** simpan berhasil, bukan dengan menutup manual.
15. Verifikasi incident dengan {judul} muncul pada daftar incident atau halaman detail incident.
16. **Jangan** gunakan Escape untuk menutup modal. Jika perlu batal, klik Batal/Cancel, tombol X/Tutup, atau klik area backdrop di luar modal.
