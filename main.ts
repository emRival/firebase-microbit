namespace esp8266 {
    let esp8266Initialized = false

    export function init(tx: SerialPin, rx: SerialPin, baudrate: BaudRate) {
        serial.redirect(tx, rx, baudrate)
        // NAIKKAN BUFFER agar JSON tidak terpotong
        serial.setTxBufferSize(256)
        serial.setRxBufferSize(512) 

        esp8266Initialized = false
        basic.pause(500) // Stabilisasi tenaga

        sendCommand("AT+RESTORE", "ready", 3000)
        sendCommand("ATE0", "OK", 500)
        
        // OPTIMASI: Matikan SSL Size & Verification (Mempercepat Handshake SSL)
        // Ini kunci agar ESP8266 tidak perlu menghitung sertifikat yang berat
        sendCommand("AT+CIPSSLCCONF=0", "OK", 500)
        
        esp8266Initialized = true
    }

    export function sendCommand(command: string, expected: string = null, timeout: number = 200): boolean {
        serial.writeString(command + "\r\n")
        if (expected == null) return true

        let timestamp = input.runningTime()
        while (input.runningTime() - timestamp < timeout) {
            let res = serial.readString()
            if (res.includes(expected)) return true
            if (res.includes("ERROR")) return false
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

    export function isWifiConnected(): boolean {
        // Mode cepat: Cek IP saja daripada cek status mendalam
        return sendCommand("AT+CIFSR", "OK", 500)
    }
}