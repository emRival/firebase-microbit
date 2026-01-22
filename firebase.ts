namespace esp8266 {
    let firebaseApiKey = ""
    let firebaseHost = ""
    let firebasePath = "iot"

    export function configureFirebase(apiKey: string, databaseURL: string) {
        firebaseApiKey = apiKey
        // Langsung simpan host untuk hemat proses string nantinya
        firebaseHost = extractHost(databaseURL)
    }

    // FUNGSI BARU: Kirim banyak data sekaligus (Sangat Cepat)
    // Gunakan format JSON: "temp:25,hum:80" -> akan jadi {"temp":25,"hum":80}
    export function sendBatchData(jsonString: string) {
        let fullJson = "{" + jsonString + "}"
        sendFirebaseRaw(firebasePath, fullJson)
    }

    function sendFirebaseRaw(path: string, jsonData: string) {
        if (!isWifiConnected()) return

        // 1. Mulai Koneksi SSL - Gunakan timeout lebih pendek (2 detik)
        if (!sendCommand("AT+CIPSTART=\"SSL\",\"" + firebaseHost + "\",443", "OK", 2000)) return

        let requestPath = "/" + cleanPath(path) + ".json?auth=" + firebaseApiKey
        let httpRequest = "PATCH " + requestPath + " HTTP/1.1\r\n" +
                          "Host: " + firebaseHost + "\r\n" +
                          "Content-Length: " + jsonData.length + "\r\n" +
                          "Connection: close\r\n\r\n" + jsonData

        // 2. Kirim Data
        if (sendCommand("AT+CIPSEND=" + httpRequest.length, "OK", 500)) {
            serial.writeString(httpRequest)
            // Tunggu konfirmasi singkat saja
            getResponse("SEND OK", 1000)
        }
        
        // 3. Langsung tutup agar hemat memori
        sendCommand("AT+CIPCLOSE", "OK", 200)
    }

    export function readFirebaseValue(deviceName: string): number {
        if (!isWifiConnected()) return 0
        
        let host = firebaseHost
        if (!sendCommand("AT+CIPSTART=\"SSL\",\"" + host + "\",443", "OK", 2000)) return 0

        let requestPath = "/" + cleanPath(firebasePath + "/" + deviceName) + ".json?auth=" + firebaseApiKey
        let httpRequest = "GET " + requestPath + " HTTP/1.1\r\n" +
                          "Host: " + host + "\r\n" +
                          "Connection: close\r\n\r\n"

        if (!sendCommand("AT+CIPSEND=" + httpRequest.length, "OK", 500)) {
            sendCommand("AT+CIPCLOSE", "OK", 200)
            return 0
        }

        serial.writeString(httpRequest)
        let response = getResponse("+IPD", 1200) // Tunggu payload data
        sendCommand("AT+CIPCLOSE", "OK", 200)

        return parseStringToNumber(extractJsonFromResponse(response))
    }
    
     function extractHost(url: string): string {
        let host = url
        if (host.includes("https://")) {
            host = host.substr(8)
        }
        if (host.includes("http://")) {
            host = host.substr(7)
        }
        if (host.charAt(host.length - 1) == "/") {
            host = host.substr(0, host.length - 1)
        }
        return host
     }
    
      function cleanPath(path: string): string {
        if (path.charAt(0) == "/") {
            return path.substr(1)
        }
        return path
      }
    
      function extractJsonFromResponse(response: string): string {
        let jsonStart = response.indexOf("{")
        let jsonEnd = response.lastIndexOf("}")
        if (jsonStart != -1 && jsonEnd != -1) {
            return response.substr(jsonStart, jsonEnd - jsonStart + 1)
        }
        return ""
      }
    
      function parseStringToNumber(s: string): number {
        let num = 0
        let i = 0
        let isNegative = false
        
        // Handle negative sign
        if (s.charAt(0) == '-') {
            isNegative = true
            i = 1
        }
        
        // Parse integer part
        while (i < s.length) {
            let charCode = s.charCodeAt(i)
            if (charCode >= 48 && charCode <= 57) { // 0-9
                num = num * 10 + (charCode - 48)
            } else {
                break
            }
            i++
        }
        
        // Handle decimal part (optional)
        if (i < s.length && s.charAt(i) == '.') {
            i++
            let decimal = 0.1
            while (i < s.length) {
                let charCode = s.charCodeAt(i)
                if (charCode >= 48 && charCode <= 57) {
                    num = num + (charCode - 48) * decimal
                    decimal = decimal / 10
                } else {
                    break
                }
                i++
            }
        }
        
        return isNegative ? -num : num
    } 
    
    
}