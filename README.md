# ESP8266 Firebase Micro:bit Extension

Ekstensi untuk menghubungkan micro:bit ke Firebase Realtime Database menggunakan modul WiFi ESP8266. Mendukung pengiriman data secara batch (Upload) dan pembacaan data (Download).

## Fitur Utama
- **Inisialisasi Cepat**: Setup ESP8266 dengan Pin Tx/Rx yang dapat disesuaikan.
- **Batch Upload**: Kirim banyak data sekaligus menggunakan format JSON (PATCH).
- **Read Data**: Membaca nilai (angka) dari Firebase secara real-time.
- **Optimasi SSL**: Koneksi lebih stabil dengan mengabaikan kalkulasi sertifikat yang berat bagi micro:bit.

## Blok yang Tersedia

### 1. Inisialisasi
Gunakan blok ini di `on start`:
- `Inisialisasi ESP8266: Tx [P1] Rx [P2] Baudrate [115200]`
- `Hubungkan WiFi: SSID [nama] Password [pass]`
- `Konfigurasi Firebase: API Key [key] URL [https://your-db.firebaseio.com]`

### 2. Mengirim Data (Batch)
- `Buat Data: Nama "suhu" Nilai [25]`
- `Gabung [data1] dengan [data2]`
- `Firebase Kirim Batch [jsonString]`

### 3. Membaca Data
- `Firebase Baca Nilai dari "saklar1"` (Mengembalikan angka)

## Contoh Penggunaan
```blocks
esp8266.init(SerialPin.P1, SerialPin.P2, BaudRate.BaudRate115200)
esp8266.connectWiFi("SSID_Wifi", "Password_Wifi")
esp8266.configureFirebase("API_KEY_ANDA", "https://project-id.firebaseio.com")

basic.forever(function () {
    let data = esp8266.buildJSON("suhu", input.temperature())
    esp8266.sendBatchData(data)
    
    let status = esp8266.readFirebaseValue("lampu")
    if (status == 1) {
        basic.showIcon(IconNames.Happy)
    } else {
        basic.showIcon(IconNames.Asleep)
    }
    basic.pause(5000)
})
```

## Lisensi
MIT
