#include "EmonLib.h"
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <cstring>

#define API_USE_TLS 1

// ---------------- OBJECTS ----------------
EnergyMonitor emon;

// ---------------- WIFI ----------------
const char ssid[] = "Solace";
const char pass[] = "damnbrodamn";

// ---------------- REST API ----------------
const char apiHost[] = "api.spectrawatt.upayan.dev";
const char apiPath[] = "/api/data";
const uint16_t apiPort = API_USE_TLS ? 443 : 80;
const char apiCaCert[] = ""; // Add the CA certificate for api.spectrawatt.upayan.dev; falls back to insecure if left empty
#if API_USE_TLS
WiFiClientSecure apiClient;
#else
WiFiClient apiClient;
#endif
HTTPClient httpClient;

const char deviceID[] = "Sonnet";
const float nominalVrms = 230.0;

// ---------------- CALIBRATION ----------------
#define CURRENT_PIN 34
#define currCalibration 0.52

// ---------------- TIMING ----------------
unsigned long lastSend = 0;
const unsigned long interval = 333; // ~3 Hz

bool postReading(float irms);

// ---------------- SETUP ----------------
void setup() {
  Serial.begin(115200);

#if API_USE_TLS
  if (strlen(apiCaCert) > 0) {
    apiClient.setCACert(apiCaCert);
  } else {
    apiClient.setInsecure(); // TLS without certificate validation; replace apiCaCert for full verification
  }
#endif

  analogSetPinAttenuation(CURRENT_PIN, ADC_11db);
  emon.current(CURRENT_PIN, currCalibration);

  WiFi.begin(ssid, pass);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi Connected");
  Serial.println("irms");
  Serial.print("API endpoint: ");
  Serial.print(API_USE_TLS ? "https://" : "http://");
  Serial.print(apiHost);
  Serial.println(apiPath);
}

// ---------------- LOOP ----------------
void loop() {
  if (millis() - lastSend >= interval) {
    lastSend = millis();

    float irms = emon.calcIrms(1480);
    Serial.println(irms, 4);

    postReading(irms);
  }
}

bool postReading(float irms) {
  if (WiFi.status() != WL_CONNECTED) {
    return false;
  }

  float apparentPower = nominalVrms * irms;

  StaticJsonDocument<192> doc;
  doc["device_id"] = deviceID;
  doc["irms"] = irms;
  doc["vrms"] = nominalVrms;
  doc["apparent_power"] = apparentPower;

  char payload[192];
  size_t len = serializeJson(doc, payload);

  String url = (API_USE_TLS ? "https://" : "http://");
  url += apiHost;
  if ((API_USE_TLS && apiPort != 443) || (!API_USE_TLS && apiPort != 80)) {
    url += ":";
    url += apiPort;
  }
  url += apiPath;

  httpClient.begin(apiClient, url);
  httpClient.addHeader("Content-Type", "application/json");
  int status = httpClient.POST((uint8_t*)payload, len);

  if (status > 0) {
    Serial.print("POST ");
    Serial.print(url);
    Serial.print(" -> ");
    Serial.println(status);
  } else {
    Serial.print("HTTP POST failed: ");
    Serial.println(httpClient.errorToString(status));
  }

  httpClient.end();
  return status >= 200 && status < 300;
}