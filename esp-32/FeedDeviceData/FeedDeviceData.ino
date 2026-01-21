#define BLYNK_PRINT Serial
#define BLYNK_TEMPLATE_ID "TMPL3HXGLadVP"
#define BLYNK_TEMPLATE_NAME "ioteehee"

#include "EmonLib.h"
#include <WiFi.h>
#include <WiFiClient.h>
#include <WiFiClientSecure.h>
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
const char* deviceID = "Bulb-60w";

WiFiClientSecure apiClient; // reused TLS client for batch posts

// ---------------- BATCHING ----------------
const size_t batchTarget = 20;              // target readings before flush
const unsigned long sampleIntervalMs = 500; // ~2 readings/sec
// calcVI blocks ~2s per run; set age high enough to gather ~20 samples (~40s)
const unsigned long maxBatchAgeMs = 60000;  // flush even if not full after this

struct DataPoint {
  float vrms;
  float irms;
  float apparentPower;
  float wh;
};

DataPoint dataBuffer[batchTarget];
size_t bufferCount = 0;
unsigned long lastBatchFlush = 0;

// ---------------- ENERGY ----------------
float wattHours = 0.0;
unsigned long lastmillis = 0;

// ---------------- BATCH HELPERS ----------------
void flushBatch(bool force) {
  if (bufferCount == 0) return;

  unsigned long now = millis();
  bool ageExceeded = (now - lastBatchFlush) >= maxBatchAgeMs;
  bool fullEnough = bufferCount >= batchTarget;
  if (!force && !ageExceeded && !fullEnough) return;

  if (WiFi.status() != WL_CONNECTED) return;  // Keep buffer for retry when back online

  HTTPClient http;
  http.setTimeout(7000); // allow more time to connect/post

  // Use secure client for HTTPS endpoint; trust on first use via setInsecure.
  if (!apiClient.connected()) {
    apiClient.setInsecure(); // disable cert validation; replace with cert pin if available
  }
  http.begin(apiClient, apiEndpoint);
  http.addHeader("Content-Type", "application/json");

  const size_t capacity = JSON_ARRAY_SIZE(batchTarget) + batchTarget * JSON_OBJECT_SIZE(5);
  DynamicJsonDocument doc(capacity);
  JsonArray arr = doc.to<JsonArray>();

  for (size_t i = 0; i < bufferCount; i++) {
    JsonObject obj = arr.createNestedObject();
    obj["device_id"] = deviceID;
    obj["vrms"] = dataBuffer[i].vrms;
    obj["irms"] = dataBuffer[i].irms;
    obj["apparent_power"] = dataBuffer[i].apparentPower;
    obj["wh"] = dataBuffer[i].wh;
  }

  String payload;
  serializeJson(doc, payload);

  int code = http.POST(payload);
  if (code > 0 && code < 400) {
    Serial.printf("Batch sent (%d readings), code: %d\n", bufferCount, code);
    bufferCount = 0;
    lastBatchFlush = now;
  } else {
    Serial.printf("Batch send failed, code: %d, error: %s\n", code, http.errorToString(code).c_str());
  }

  http.end();
}

void enqueueReading(float vrms, float irms, float power, float wh) {
  if (bufferCount >= batchTarget) {
    flushBatch(true);

    // Keep most recent readings if still full (e.g., WiFi down)
    if (bufferCount >= batchTarget) {
      for (size_t i = 1; i < batchTarget; i++) {
        dataBuffer[i - 1] = dataBuffer[i];
      }
      bufferCount = batchTarget - 1;
    }
  }

  if (bufferCount < batchTarget) {
    dataBuffer[bufferCount].vrms = vrms;
    dataBuffer[bufferCount].irms = irms;
    dataBuffer[bufferCount].apparentPower = power;
    dataBuffer[bufferCount].wh = wh;
    bufferCount++;
  }

  flushBatch(false);
}

// ---------------- TIMER EVENT ----------------
void myTimerEvent() {
  emon.calcVI(20, 2000);   // 20 AC cycles, 2s timeout

  unsigned long now = millis();
  float deltaHours = (now - lastmillis) / 3600000.0;
  lastmillis = now;

  float apparentPower = emon.apparentPower;
  wattHours += apparentPower * deltaHours;

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
  Blynk.virtualWrite(V2, apparentPower);
  Blynk.virtualWrite(V3, wattHours);

  // -------- BUFFER --------
  enqueueReading(emon.Vrms, emon.Irms, apparentPower, wattHours);
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
  lastBatchFlush = millis();
  timer.setInterval(sampleIntervalMs, myTimerEvent);
}

// ---------------- LOOP ----------------
void loop() {
  Blynk.run();
  timer.run();

  // Flush if WiFi just came back
  flushBatch(false);
}