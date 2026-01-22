/**
 * Extension for ESP8266 Firebase Batch Update
 * Versi Lengkap: Kirim Batch & Baca Data
 */
//% weight=100 color=#ff8000 icon="\uf1eb" block="ESP8266 Firebase"
namespace esp8266 {
    let firebaseApiKey = ""
    let firebaseHost = ""
    let firebasePath = "iot"
    let esp8266Initialized = false

    // --- SETUP ---

    //% blockId=esp8266_init
    //% block="Inisialisasi ESP8266: Tx %tx Rx %rx Baudrate %baudrate"
    //% weight=100
    export function init(tx: SerialPin, rx: SerialPin, baudrate: BaudRate) {
        serial.redirect(tx, rx, baudrate)
        serial.setTxBufferSize(256)
        serial.setRxBufferSize(512) 
        esp8266Initialized = false
        basic.pause(500)
        sendCommand("AT+RESTORE", "ready", 3000)
        sendCommand("ATE0", "OK", 500)
        sendCommand("AT+CIPSSLCCONF=0", "OK", 500)
        esp8266Initialized = true
    }

    //% blockId=esp8266_connect_wifi
    //% block="Hubungkan WiFi: SSID %ssid Password %password"
    //% weight=95
    export function connectWiFi(ssid: string, password: string) {
        sendCommand("AT+CWMODE=1", "OK")
        sendCommand("AT+CWJAP=\"" + ssid + "\",\"" + password + "\"", "OK", 10000)
    }

    // --- FIREBASE CONFIG ---

    //% blockId=esp8266_configure_firebase
    //% block="Konfigurasi Firebase: API Key %apiKey URL %databaseURL"
    //% weight=90
    export function configureFirebase(apiKey: string, databaseURL: string) {
        firebaseApiKey = apiKey
        firebaseHost = extractHost(databaseURL)
    }

    //% blockId=esp8266_set_path
    //% block="Set Path Firebase %path"
    //% weight=89 path.defl="iot"
    export function setFirebasePath(path: string) {
        firebasePath = path
    }

    // --- SEND DATA (UPLOAD) ---

    //% blockId=esp8266_build_json
    //% block="Buat Data: Nama %key Nilai %value"
    //% weight=85
    export function buildJSON(key: string, value: number): string {
        return "\"" + key + "\":" + value
    }

    //% blockId=esp8266_join_json
    //% block="Gabung %data1 dengan %data2"
    //% weight=84
    export function joinJSON(data1: string, data2: string): string {
        return data1 + "," + data2
    }

    //% blockId=esp8266_firebase_send_batch
    //% block="Firebase Kirim Batch %jsonString"
    //% weight=80
    export function sendBatchData(jsonString: string) {
        let fullJson = "{" + jsonString + "}"
        sendFirebaseRaw(firebasePath, fullJson, "PATCH")
    }

    // --- READ DATA (DOWNLOAD) ---

    /**
     * Membaca nilai angka dari Firebase. Cocok untuk cek status saklar (0/1) atau suhu.
     */
    //% blockId=esp8266_read_firebase
    //% block="Firebase Baca Nilai dari %deviceName"
    //% weight=75
    export function readFirebaseValue(deviceName: string): number {
        if (!sendCommand("AT+CIFSR", "OK", 500)) return 0
        if (!sendCommand("AT+CIPSTART=\"SSL\",\"" + firebaseHost + "\",443", "OK", 2000)) return 0

        let requestPath = "/" + cleanPath(firebasePath + "/" + deviceName) + ".json?auth=" + firebaseApiKey
        let httpRequest = "GET " + requestPath + " HTTP/1.1\r\n" +
                          "Host: " + firebaseHost + "\r\n" +
                          "Connection: close\r\n\r\n"

        if (!sendCommand("AT+CIPSEND=" + httpRequest.length, "OK", 500)) {
            sendCommand("AT+CIPCLOSE", "OK", 200)
            return 0
        }

        serial.writeString(httpRequest)
        let response = getResponse("+IPD", 1200)
        sendCommand("AT+CIPCLOSE", "OK", 200)

        // Cari isi JSON setelah header HTTP
        let jsonVal = extractJsonFromResponse(response)
        return parseStringToNumber(jsonVal)
    }

    // --- HELPER INTERNAL ---

    function sendFirebaseRaw(path: string, jsonData: string, method: string) {
        if (!sendCommand("AT+CIFSR", "OK", 500)) return
        if (!sendCommand("AT+CIPSTART=\"SSL\",\"" + firebaseHost + "\",443", "OK", 2000)) return

        let requestPath = "/" + cleanPath(path) + ".json?auth=" + firebaseApiKey
        let httpRequest = method + " " + requestPath + " HTTP/1.1\r\n" +
                          "Host: " + firebaseHost + "\r\n" +
                          "Content-Length: " + jsonData.length + "\r\n" +
                          "Connection: close\r\n\r\n" + jsonData

        if (sendCommand("AT+CIPSEND=" + httpRequest.length, "OK", 500)) {
            serial.writeString(httpRequest)
            getResponse("SEND OK", 1000)
        }
        sendCommand("AT+CIPCLOSE", "OK", 200)
    }

    function extractHost(url: string): string {
        let host = url.replace("https://", "").replace("http://", "")
        if (host.charAt(host.length - 1) == "/") host = host.substr(0, host.length - 1)
        return host
    }

    function cleanPath(path: string): string {
        return path.charAt(0) == "/" ? path.substr(1) : path
    }

    function extractJsonFromResponse(response: string): string {
        let bodyStart = response.indexOf("\r\n\r\n")
        if (bodyStart == -1) return ""
        let body = response.substr(bodyStart + 4).trim()
        // Jika ada +IPD di depan, bersihkan
        if (body.includes(":")) {
            body = body.substr(body.indexOf(":") + 1)
        }
        return body
    }

    function parseStringToNumber(s: string): number {
        let str = s.trim().replace("\"", "") // hapus kutip jika ada
        let num = parseFloat(str)
        return isNaN(num) ? 0 : num
    }

    export function sendCommand(command: string, expected: string = null, timeout: number = 200): boolean {
        serial.writeString(command + "\r\n")
        if (expected == null) return true
        let timestamp = input.runningTime()
        while (input.runningTime() - timestamp < timeout) {
            let res = serial.readString()
            if (res.includes(expected)) return true
        }
        return false
    }

    export function getResponse(expected: string, timeout: number): string {
        let timestamp = input.runningTime()
        let buffer = ""
        while (input.runningTime() - timestamp < timeout) {
            let chunk = serial.readString()
            if (chunk.length > 0) {
                buffer += chunk
                if (buffer.includes(expected)) break
            }
        }
        return buffer
    }
}