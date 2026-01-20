#include "EmonLib.h"
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <cstring>

#define MQTT_USE_TLS 1

// ---------------- OBJECTS ----------------
EnergyMonitor emon;

// ---------------- WIFI ----------------
const char ssid[] = "Solace";
const char pass[] = "damnbrodamn";

// ---------------- MQTT ----------------
const char mqttHost[] = "mqtt.upayan.dev";
#if MQTT_USE_TLS
const uint16_t mqttPort = 8883;
const char mqttCaCert[] = ""; // Add the CA certificate for mqtt.upayan.dev; falls back to insecure if left empty
WiFiClientSecure mqttNet;
#else
const uint16_t mqttPort = 1883;
WiFiClient mqttNet;
#endif
const char deviceID[] = "Sonnet";
const float nominalVrms = 230.0;

PubSubClient mqttClient(mqttNet);
String mqttTopic = String("spectrawatt/") + deviceID + "/energy";

// ---------------- CALIBRATION ----------------
#define CURRENT_PIN 34
#define currCalibration 0.52

// ---------------- TIMING ----------------
unsigned long lastSend = 0;
const unsigned long interval = 333; // ~3 Hz

bool ensureMqttConnected();
void publishReading(float irms);

// ---------------- SETUP ----------------
void setup() {
  Serial.begin(115200);

#if MQTT_USE_TLS
  if (strlen(mqttCaCert) > 0) {
    mqttNet.setCACert(mqttCaCert);
  } else {
    mqttNet.setInsecure(); // TLS without certificate validation; replace mqttCaCert for full verification
  }
#endif

  mqttClient.setServer(mqttHost, mqttPort);
  mqttClient.setBufferSize(256);

  analogSetPinAttenuation(CURRENT_PIN, ADC_11db);
  emon.current(CURRENT_PIN, currCalibration);

  WiFi.begin(ssid, pass);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nWiFi Connected");
  Serial.println("irms");
  Serial.print("MQTT broker: ");
  Serial.print(mqttHost);
  Serial.print(":");
  Serial.println(mqttPort);
}

// ---------------- LOOP ----------------
void loop() {
  if (!mqttClient.connected()) {
    ensureMqttConnected();
  }
  mqttClient.loop();

  if (millis() - lastSend >= interval) {
    lastSend = millis();

    float irms = emon.calcIrms(1480);
    Serial.println(irms, 4);

    publishReading(irms);
  }
}

bool ensureMqttConnected() {
  if (mqttClient.connected()) {
    return true;
  }

  Serial.println("Connecting to MQTT...");
  while (!mqttClient.connected()) {
    String clientId = String("spectrawatt-") + deviceID + "-" + String((uint32_t)millis(), HEX);

    if (mqttClient.connect(clientId.c_str())) {
      Serial.println("MQTT connected");
      break;
    }

    Serial.print("MQTT connect failed, rc=");
    Serial.print(mqttClient.state());
    Serial.println(". Retrying in 2s");
    delay(2000);
  }

  return mqttClient.connected();
}

void publishReading(float irms) {
  if (!mqttClient.connected() && !ensureMqttConnected()) {
    return;
  }

  float apparentPower = nominalVrms * irms;

  StaticJsonDocument<192> doc;
  doc["device_id"] = deviceID;
  doc["irms"] = irms;
  doc["vrms"] = nominalVrms;
  doc["apparent_power"] = apparentPower;

  char buffer[192];
  size_t len = serializeJson(doc, buffer);

  mqttClient.publish(mqttTopic.c_str(), (uint8_t*)buffer, len, false);
}