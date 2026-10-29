// ==========================================
// 1. INISIALISASI DATABASE OFFLINE (LOCALSTORAGE)
// ==========================================
let dataProspekGlobal = JSON.parse(localStorage.getItem('crm_prospek')) || [];
let dataRiwayatGlobal = JSON.parse(localStorage.getItem('crm_riwayat')) || [];
let crmSettings = JSON.parse(localStorage.getItem('crm_settings')) || { pin: '1234', namaToko: 'Usaha Saya', target: 1000000000 };

let statusFilterAktif = 'Semua'; 

// ==========================================
// 2. SISTEM LOGIN & PENGATURAN TOKO
// ==========================================
document.getElementById('displayNamaToko').innerText = crmSettings.namaToko;
document.getElementById('setNamaToko').value = crmSettings.namaToko;
document.getElementById('setPin').value = crmSettings.pin;

function cekLogin() {
    const input = document.getElementById('inputPinLogin').value;
    if (input === crmSettings.pin) {
        document.getElementById('layar-login').style.display = 'none';
        document.getElementById('layar-utama').style.display = 'block';
        muatData();
    } else {
        alert("PIN Salah! Coba lagi.");
    }
}

function bukaSettings() { document.getElementById('modalSettings').style.display = 'block'; }
function tutupModal(id) { document.getElementById(id).style.display = 'none'; }

function simpanSettings() {
    crmSettings.namaToko = document.getElementById('setNamaToko').value;
    crmSettings.pin = document.getElementById('setPin').value;
    localStorage.setItem('crm_settings', JSON.stringify(crmSettings));
    document.getElementById('displayNamaToko').innerText = crmSettings.namaToko;
    alert("Profil Toko & PIN berhasil diperbarui!");
    tutupModal('modalSettings');
}

function editGoal() {
    let inputBaru = prompt("Masukkan angka Target Omset baru (Tanpa titik):", crmSettings.target);
    if (inputBaru !== null && !isNaN(inputBaru) && inputBaru !== "") {
        crmSettings.target = parseInt(inputBaru);
        localStorage.setItem('crm_settings', JSON.stringify(crmSettings));
        kalkulasiSemua();
    }
}

// ==========================================
// 3. FITUR BACKUP & RESTORE DATABASE OFFLINE
// ==========================================
function backupDatabase() {
    const semuaData = { prospek: dataProspekGlobal, riwayat: dataRiwayatGlobal, settings: crmSettings };
    const dataString = JSON.stringify(semuaData);
    const blob = new Blob([dataString], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Backup_CRM_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
}

function restoreDatabase() {
    const file = document.getElementById('inputFileRestore').files[0];
    if (!file) return alert("Pilih file backup (.json) terlebih dahulu!");
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const dataImport = JSON.parse(e.target.result);
            if(dataImport.prospek && dataImport.settings) {
                localStorage.setItem('crm_prospek', JSON.stringify(dataImport.prospek));
                localStorage.setItem('crm_riwayat', JSON.stringify(dataImport.riwayat));
                localStorage.setItem('crm_settings', JSON.stringify(dataImport.settings));
                alert("Database berhasil dipulihkan! Halaman akan dimuat ulang.");
                location.reload();
            } else {
                alert("File tidak valid!");
            }
        } catch(err) {
            alert("Gagal membaca file!");
        }
    };
    reader.readAsText(file);
}

// ==========================================
// 4. LOGIKA UTAMA (CRUD)
// ==========================================
function formatRupiah(angka) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka); }

function muatData() { kalkulasiSemua(); renderDaftar(); }

function kalkulasiSemua() {
    const data = dataProspekGlobal;
    document.getElementById('angkaTotal').innerText = data.length;
    document.getElementById('angkaProses').innerText = data.filter(item => item.status === 'Proses / Follow-up').length;
    document.getElementById('angkaDeal').innerText = data.filter(item => item.status === 'Deal / Closing').length;
    
    const totalOmset = data.reduce((t, i) => i.status === 'Deal / Closing' ? t + parseInt(i.nilai_transaksi) : t, 0);
    const totalMargin = data.reduce((t, i) => i.status === 'Deal / Closing' ? t + parseInt(i.margin_komisi) : t, 0);
    const totalPengeluaran = data.reduce((t, i) => i.status === 'Deal / Closing' ? t + parseInt(i.pengeluaran) : t, 0);
    
    document.getElementById('angkaProfit').innerText = formatRupiah(totalMargin - totalPengeluaran);
    document.getElementById('angkaOmsetKet').innerText = `Total Omset: ${formatRupiah(totalOmset)}`;

    document.getElementById('teksTarget').innerText = formatRupiah(crmSettings.target);
    let persentase = (totalOmset / crmSettings.target) * 100;
    if (persentase > 100) persentase = 100; 
    document.getElementById('barTarget').style.width = persentase + '%';
    document.getElementById('persenTarget').innerHTML = `Tercapai <b>${formatRupiah(totalOmset)}</b> (${persentase.toFixed(1)}%)`;

    const jB = data.filter(i => i.status === 'Prospek Baru').length;
    const jP = data.filter(i => i.status === 'Proses / Follow-up').length;
    const jD = data.filter(i => i.status === 'Deal / Closing').length;
    const mx = Math.max(jB, jP, jD, 1);

    document.getElementById('angkaBaru').innerText = jB; document.getElementById('barBaru').style.width = (jB / mx * 100) + '%';
    document.getElementById('angkaProsesFunnel').innerText = jP; document.getElementById('barProses').style.width = (jP / mx * 100) + '%';
    document.getElementById('angkaDealFunnel').innerText = jD; document.getElementById('barDeal').style.width = (jD / mx * 100) + '%';
}

function renderDaftar() {
    const wadah = document.getElementById('wadahDaftar');
    wadah.innerHTML = ''; 
    const tglHariIni = new Date().toISOString().split('T')[0];

    // Tampilkan dari yang paling baru diinput (reverse array)
    const dataTerbalik = [...dataProspekGlobal].reverse();

    dataTerbalik.forEach(item => {
        if (statusFilterAktif !== 'Semua' && item.status !== statusFilterAktif) return;

        const isHariIni = (item.tanggal_followup === tglHariIni && item.status !== 'Deal / Closing');
        const teksTgl = isHariIni ? `<span class="peringatan">• Follow-up Hari Ini</span>` : item.tanggal_followup;
        const profit = parseInt(item.margin_komisi) - parseInt(item.pengeluaran);

        wadah.innerHTML += `
            <div class="kartu-prospek pencarian-kartu">
                <div class="info-utama">
                    <div class="nama-klien">${item.nama} <span class="badge-status">${item.status}</span></div>
                    <div class="teks-detail"><span>📞 ${item.kontak}</span> &bull; <span>${item.sumber}</span></div>
                    
                    <div class="finansial-grid">
                        <div class="fin-item"><span>Nilai Transaksi:</span> <span class="fin-val">${formatRupiah(item.nilai_transaksi)}</span></div>
                        <div class="fin-item"><span>Margin/Komisi:</span> <span class="fin-val">${formatRupiah(item.margin_komisi)}</span></div>
                        <div class="fin-item"><span>Pengeluaran:</span> <span class="fin-val" style="color:#D66565;">- ${formatRupiah(item.pengeluaran)}</span></div>
                        <div class="fin-item"><span>Profit Bersih:</span> <span class="fin-val" style="color:#4CAF50;">${formatRupiah(profit)}</span></div>
                    </div>
                    <div class="teks-detail" style="margin-top:5px;">🗓️ Jadwal: ${teksTgl}</div>
                    ${item.catatan ? `<div class="teks-catatan">📝 ${item.catatan}</div>` : ''}
                    
                    <!-- FOTO BUKTI DARI BASE64 -->
                    ${item.foto_bukti ? `<img src="${item.foto_bukti}" class="foto-thumbnail" onclick="window.open('${item.foto_bukti}', '_blank')">` : ''}
                </div>
                <div class="aksi-grup">
                    <button class="btn-aksi" onclick="bukaRiwayat(${item.id}, '${item.nama}')">Riwayat</button>
                    <button class="btn-aksi" onclick="siapkanEdit(${item.id})">Edit</button>
                    <button class="btn-aksi del" onclick="hapusProspek(${item.id})">Hapus</button>
                </div>
            </div>`;
    });
}

// Konverter File Foto Menjadi Teks Base64 (Untuk disimpan di LocalStorage)
function getBase64(file) {
   return new Promise((resolve, reject) => {
     const reader = new FileReader();
     reader.readAsDataURL(file);
     reader.onload = () => resolve(reader.result);
     reader.onerror = error => reject(error);
   });
}

document.getElementById('formKlien').addEventListener('submit', async function(event) {
    event.preventDefault(); 
    
    // Ambil Data Foto
    let stringFoto = "";
    const file = document.getElementById('inputFoto').files[0];
    if (file) {
        // Peringatan ukuran jika > 2MB karena ini offline
        if(file.size > 2000000) return alert("Ukuran foto terlalu besar! Maksimal 2MB agar aplikasi tidak berat.");
        stringFoto = await getBase64(file);
    }

    const idEdit = document.getElementById('inputIdEdit').value;
    const dataBaru = {
        id: idEdit === "" ? Date.now() : parseInt(idEdit), // Gunakan timestamp sebagai ID unik
        nama: document.getElementById('inputNama').value, kontak: document.getElementById('inputKontak').value,
        status: document.getElementById('inputStatus').value, sumber: document.getElementById('inputSumber').value,
        nilai_transaksi: document.getElementById('inputNilai').value, margin_komisi: document.getElementById('inputMargin').value,
        pengeluaran: document.getElementById('inputPengeluaran').value, tanggal_followup: document.getElementById('inputFollowUp').value,
        catatan: document.getElementById('inputCatatan').value,
        foto_bukti: stringFoto
    };

    if (idEdit === "") {
        dataProspekGlobal.push(dataBaru);
        catatRiwayat(dataBaru.id, `Prospek dibuat. Sumber: ${dataBaru.sumber}`);
    } else {
        const index = dataProspekGlobal.findIndex(i => i.id === dataBaru.id);
        // Jika tidak upload foto baru saat edit, pertahankan foto lama
        if(stringFoto === "") dataBaru.foto_bukti = dataProspekGlobal[index].foto_bukti;
        
        dataProspekGlobal[index] = dataBaru;
        catatRiwayat(dataBaru.id, `Data di-update. Status: ${dataBaru.status}`);
    }

    // SIMPAN KE HP
    localStorage.setItem('crm_prospek', JSON.stringify(dataProspekGlobal));
    
    document.getElementById('formKlien').reset(); 
    document.getElementById('inputIdEdit').value = ""; 
    document.getElementById('btnSimpan').innerText = "+ Simpan Data";
    muatData(); 
});

function siapkanEdit(id) {
    const klien = dataProspekGlobal.find(i => i.id === id);
    document.getElementById('inputIdEdit').value = klien.id;
    document.getElementById('inputNama').value = klien.nama;
    document.getElementById('inputKontak').value = klien.kontak;
    document.getElementById('inputStatus').value = klien.status;
    document.getElementById('inputSumber').value = klien.sumber;
    document.getElementById('inputNilai').value = klien.nilai_transaksi;
    document.getElementById('inputMargin').value = klien.margin_komisi;
    document.getElementById('inputPengeluaran').value = klien.pengeluaran;
    document.getElementById('inputFollowUp').value = klien.tanggal_followup;
    document.getElementById('inputCatatan').value = klien.catatan;
    document.getElementById('btnSimpan').innerText = "Update Data";
    window.scrollTo(0,0);
}

function hapusProspek(id) {
    if (confirm("Hapus permanen?")) {
        dataProspekGlobal = dataProspekGlobal.filter(i => i.id !== id);
        dataRiwayatGlobal = dataRiwayatGlobal.filter(i => i.prospek_id !== id);
        localStorage.setItem('crm_prospek', JSON.stringify(dataProspekGlobal));
        localStorage.setItem('crm_riwayat', JSON.stringify(dataRiwayatGlobal));
        muatData();
    }
}

// LOGIKA RIWAYAT OFFLINE
function catatRiwayat(prospek_id, teks) {
    const r = {
        id: Date.now(), prospek_id: prospek_id, deskripsi: teks, 
        waktu: new Date().toLocaleString('id-ID', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'})
    };
    dataRiwayatGlobal.push(r);
    localStorage.setItem('crm_riwayat', JSON.stringify(dataRiwayatGlobal));
}

function bukaRiwayat(id, nama) {
    document.getElementById('modalRiwayat').style.display = "block";
    document.getElementById('namaRiwayatKlien').innerText = nama;
    document.getElementById('idKlienRiwayatAktif').value = id;
    
    const riwayatKlien = dataRiwayatGlobal.filter(i => i.prospek_id === id).reverse();
    const wadahT = document.getElementById('wadahTimeline');
    wadahT.innerHTML = '';
    
    if (riwayatKlien.length === 0) wadahT.innerHTML = '<p style="color:#999; font-size:13px;">Belum ada aktivitas.</p>';
    else {
        riwayatKlien.forEach(item => {
            wadahT.innerHTML += `<div class="timeline-item"><div class="timeline-waktu">${item.waktu}</div><p class="timeline-teks">${item.deskripsi}</p></div>`;
        });
    }
}

function simpanRiwayat() {
    const id = parseInt(document.getElementById('idKlienRiwayatAktif').value);
    const catatan = document.getElementById('inputCatatanRiwayat').value;
    if (catatan.trim() === "") return; 
    
    catatRiwayat(id, catatan);
    document.getElementById('inputCatatanRiwayat').value = "";
    bukaRiwayat(id, document.getElementById('namaRiwayatKlien').innerText); 
}

function filterTab(status, elemenTombol) {
    statusFilterAktif = status;
    const semuaTombol = document.getElementsByClassName('btn-tab');
    for (let i = 0; i < semuaTombol.length; i++) semuaTombol[i].classList.remove('aktif');
    elemenTombol.classList.add('aktif');
    renderDaftar(); 
}

function cariProspek() {
    const kataKunci = document.getElementById('inputCari').value.toLowerCase();
    const daftarKartu = document.getElementsByClassName('pencarian-kartu');
    for (let i = 0; i < daftarKartu.length; i++) {
        daftarKartu[i].style.display = daftarKartu[i].innerText.toLowerCase().includes(kataKunci) ? "flex" : "none"; 
    }
}