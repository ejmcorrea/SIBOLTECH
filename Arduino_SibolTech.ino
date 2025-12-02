#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>

// Analog pins
const int pH_Pin = A0;
const int TDS_Pin = A1;
const int DO_Pin  = A2;

// BME280 object
Adafruit_BME280 bme;

// Calibration constants (update after calibration)
float pHSlope = 3.5;
float pHOffset = 0.0;
float TDSFactor = 500.0;
float DOFactor = 100.0;

// Function to read analog and average
float readAverage(int pin, int samples = 10) {
  float sum = 0;
  for (int i = 0; i < samples; i++) {
    sum += analogRead(pin) * (5.0 / 1023.0);
    delay(10);
  }
  return sum / samples;
}

void setup() {
  Serial.begin(9600);
  bool status = bme.begin(0x76); // Common I2C address: 0x76 or 0x77
  if (!status) {
    Serial.println("Could not find BME280 sensor!");
    while (1);
  }
}

void loop() {
  // Read pH
  float pHVoltage = readAverage(pH_Pin);
  float pHValue = pHSlope * pHVoltage + pHOffset;

  // Read TDS
  float TDSVoltage = readAverage(TDS_Pin);
  float TDSValue = TDSVoltage * TDSFactor;

  // Read DO
  float DOVoltage = readAverage(DO_Pin);
  float DOValue = DOVoltage * DOFactor;

  // Read BME280
  float temp = bme.readTemperature();   // Celsius
  float hum = bme.readHumidity();       // %

  // Print all values
  Serial.print("pH: "); Serial.print(pHValue);
  Serial.print(" | TDS: "); Serial.print(TDSValue); Serial.print(" ppm");
  Serial.print(" | DO: "); Serial.print(DOValue); Serial.print(" mg/L");
  Serial.print(" | Temp: "); Serial.print(temp); Serial.print(" C");
  Serial.print(" | Hum: "); Serial.print(hum); Serial.print(" %");

  delay(1000);
}
