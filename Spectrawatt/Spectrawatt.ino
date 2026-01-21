#define BLYNK_PRINT Serial
#define BLYNK_TEMPLATE_ID "TMPL3HXGLadVP"
#define BLYNK_TEMPLATE_NAME "ioteehee"

#include "EmonLib.h"
#include <WiFi.h>
#include <WiFiClient.h>
#include <BlynkSimpleEsp32.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ---------------- OBJECTS ----------------
EnergyMonitor emon;
BlynkTimer timer;

// ---------------- CALIBRATION ----------------
// 🔥 FIXED: Voltage calibration doubled (120V → 240V issue)
#define vCalibration 213.6
#define currCalibration 0.52

// ---------------- BLYNK ----------------
char auth[] = "0cO_QnCFHs10T6hE6pY8VeiXV2a_ikZx";
char ssid[] = "Solace";
char pass[] = "damnbrodamn";

// ---------------- API ----------------
const char* apiEndpoint = "https://api.spectrawatt.upayan.dev/api/data";
const char* deviceID = "Sonnet";

// ---------------- ENERGY ----------------
float wattHours = 0.0;
unsigned long lastmillis = 0;

// ---------------- API SEND FUNCTION ----------------
void sendDataToAPI(float vrms, float irms, float power, float wh) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(apiEndpoint);
    http.addHeader("Content-Type", "application/json");

    StaticJsonDocument<256> doc;
    doc["device_id"] = deviceID;
    doc["vrms"] = vrms;
    doc["irms"] = irms;
    doc["apparent_power"] = power;
    doc["wh"] = wh;

    String payload;
    serializeJson(doc, payload);

    int code = http.POST(payload);
    Serial.println(code > 0 ? "API Sent" : "API Error");

    http.end();
  }
}

// ---------------- TIMER EVENT ----------------
void myTimerEvent() {
  emon.calcVI(20, 2000);   // 20 AC cycles, 2s timeout

  unsigned long now = millis();
  float deltaHours = (now - lastmillis) / 3600000.0;
  lastmillis = now;

  wattHours += emon.apparentPower * deltaHours;

  // -------- SERIAL OUTPUT --------
  Serial.print("Vrms: ");
  Serial.print(emon.Vrms, 2);
  Serial.print(" V\t");

  Serial.print("Irms: ");
  Serial.print(emon.Irms, 4);
  Serial.print(" A\t");

  Serial.print("Power: ");
  Serial.print(emon.apparentPower, 2);
  Serial.print(" W\t");

  Serial.print("Energy: ");
  Serial.print(wattHours, 6);
  Serial.println(" Wh");

  // -------- BLYNK --------
  Blynk.virtualWrite(V0, emon.Vrms);
  Blynk.virtualWrite(V1, emon.Irms);
  Blynk.virtualWrite(V2, emon.apparentPower);
  Blynk.virtualWrite(V3, wattHours);

  // -------- API --------
  sendDataToAPI(emon.Vrms, emon.Irms, emon.apparentPower, wattHours);
}

// ---------------- SETUP ----------------
void setup() {
  Serial.begin(115200);

  // ✅ ESP32 ADC FIX (CRITICAL)
  analogSetPinAttenuation(34, ADC_11db); // Current
  analogSetPinAttenuation(35, ADC_11db); // Voltage

  // Voltage pin = GPIO 35
  // Current pin = GPIO 34
  emon.voltage(35, vCalibration, 1.7);
  emon.current(34, currCalibration);

  Blynk.begin(auth, ssid, pass);

  lastmillis = millis();
  timer.setInterval(1000L, myTimerEvent);
}

// ---------------- LOOP ----------------
void loop() {
  Blynk.run();
  timer.run();
}