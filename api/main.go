package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const maxPayloadBytes int64 = 1 << 20

// EnergyData represents the energy monitoring data from ESP32
type EnergyData struct {
	ID            primitive.ObjectID `json:"id,omitempty" bson:"_id,omitempty"`
	DeviceID      string             `json:"device_id" bson:"device_id"`
	Timestamp     time.Time          `json:"timestamp" bson:"timestamp"`
	Vrms          float64            `json:"vrms" bson:"vrms"`
	Irms          float64            `json:"irms" bson:"irms"`
	ApparentPower float64            `json:"apparent_power" bson:"apparent_power"`
	Wh            float64            `json:"wh" bson:"wh"`
}

type energyPayload struct {
	DeviceID      string      `json:"device_id"`
	Timestamp     string      `json:"timestamp,omitempty"`
	Vrms          json.Number `json:"vrms"`
	Irms          json.Number `json:"irms"`
	ApparentPower json.Number `json:"apparent_power"`
	Wh            json.Number `json:"wh"`
}

func parseRequiredNumber(raw json.Number, field string) (float64, error) {
	if raw == "" {
		return 0, fmt.Errorf("%s is required", field)
	}

	value, err := strconv.ParseFloat(raw.String(), 64)
	if err != nil {
		return 0, fmt.Errorf("invalid %s: %w", field, err)
	}
	if math.IsNaN(value) || math.IsInf(value, 0) {
		return 0, fmt.Errorf("%s must be a finite number", field)
	}
	return value, nil
}

func parseOptionalNumber(raw json.Number, field string) (float64, error) {
	if raw == "" {
		return 0, nil
	}
	return parseRequiredNumber(raw, field)
}

func parseTimestamp(ts string) (time.Time, error) {
	if strings.TrimSpace(ts) == "" {
		return time.Now().UTC(), nil
	}

	parsed, err := time.Parse(time.RFC3339, ts)
	if err != nil {
		return time.Time{}, fmt.Errorf("invalid timestamp: %w", err)
	}

	return parsed.UTC(), nil
}

// MongoDB client and collection
var (
	mongoClient      *mongo.Client
	energyCollection *mongo.Collection
)

// initMongoDB initializes MongoDB connection
func initMongoDB() error {
	mongoURI := os.Getenv("MONGODB_URI")
	if mongoURI == "" {
		mongoURI = "mongodb://localhost:27017"
		log.Println("MONGODB_URI not set, using default: mongodb://localhost:27017")
	} else {
		// Log URI without credentials for security
		log.Printf("Connecting to MongoDB (URI length: %d chars)", len(mongoURI))
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Create client options with retry and timeout settings
	clientOptions := options.Client().
		ApplyURI(mongoURI).
		SetServerSelectionTimeout(30 * time.Second).
		SetConnectTimeout(30 * time.Second).
		SetSocketTimeout(30 * time.Second).
		SetMaxPoolSize(50).
		SetMinPoolSize(10)

	log.Println("Attempting to connect to MongoDB...")
	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		log.Printf("MongoDB connection error: %v", err)
		return err
	}

	// Ping the database
	log.Println("Pinging MongoDB...")
	err = client.Ping(ctx, nil)
	if err != nil {
		log.Printf("MongoDB ping error: %v", err)
		return err
	}

	mongoClient = client
	dbName := os.Getenv("MONGODB_DATABASE")
	if dbName == "" {
		dbName = "spectrawatt"
	}
	energyCollection = client.Database(dbName).Collection("energy_data")

	log.Printf("✓ Connected to MongoDB successfully, Database: %s", dbName)

	// Create indexes
	indexModel := mongo.IndexModel{
		Keys: bson.D{
			{Key: "device_id", Value: 1},
			{Key: "timestamp", Value: -1},
		},
	}
	_, err = energyCollection.Indexes().CreateOne(ctx, indexModel)
	if err != nil {
		log.Printf("Warning: Could not create index: %v", err)
	}

	return nil
}

// HealthCheckHandler handles health check requests
func HealthCheckHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Check MongoDB connection
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	dbStatus := "connected"
	if err := mongoClient.Ping(ctx, nil); err != nil {
		dbStatus = "disconnected"
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"status":   "healthy",
		"time":     time.Now().Format(time.RFC3339),
		"database": dbStatus,
	})
}

// PostDataHandler handles incoming energy data from ESP32
func PostDataHandler(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	w.Header().Set("Content-Type", "application/json")

	// Handle preflight
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxPayloadBytes)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	decoder.UseNumber()

	var payload energyPayload
	if err := decoder.Decode(&payload); err != nil {
		var syntaxErr *json.SyntaxError
		var unmarshalTypeErr *json.UnmarshalTypeError
		var maxBytesErr *http.MaxBytesError

		switch {
		case errors.As(err, &maxBytesErr):
			http.Error(w, "Payload too large", http.StatusRequestEntityTooLarge)
		case errors.Is(err, io.EOF):
			http.Error(w, "Request body is empty", http.StatusBadRequest)
		case errors.As(err, &syntaxErr):
			http.Error(w, "Malformed JSON", http.StatusBadRequest)
		case errors.As(err, &unmarshalTypeErr):
			http.Error(w, fmt.Sprintf("Invalid type for %s", unmarshalTypeErr.Field), http.StatusBadRequest)
		default:
			http.Error(w, "Invalid JSON", http.StatusBadRequest)
		}
		return
	}

	deviceID := strings.TrimSpace(payload.DeviceID)
	if deviceID == "" {
		http.Error(w, "device_id is required", http.StatusBadRequest)
		return
	}

	vrms, err := parseRequiredNumber(payload.Vrms, "vrms")
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	irms, err := parseRequiredNumber(payload.Irms, "irms")
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	apparentPower, err := parseOptionalNumber(payload.ApparentPower, "apparent_power")
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	wh, err := parseOptionalNumber(payload.Wh, "wh")
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if apparentPower == 0 {
		apparentPower = vrms * irms
	}

	timestamp, err := parseTimestamp(payload.Timestamp)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	data := EnergyData{
		DeviceID:      deviceID,
		Timestamp:     timestamp,
		Vrms:          vrms,
		Irms:          irms,
		ApparentPower: apparentPower,
		Wh:            wh,
	}

	// Store data in MongoDB
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	result, err := energyCollection.InsertOne(ctx, data)
	if err != nil {
		log.Printf("Error inserting data: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	data.ID = result.InsertedID.(primitive.ObjectID)
	log.Printf("Received data from device %s: Vrms=%.2fV, Irms=%.4fA, Power=%.4fW, Wh=%.4f",
		data.DeviceID, data.Vrms, data.Irms, data.ApparentPower, data.Wh)

	// Send response
	response := map[string]interface{}{
		"status":  "success",
		"message": "Data received successfully",
		"data":    data,
	}
	json.NewEncoder(w).Encode(response)
}

// DeviceDataGroup represents data grouped by device
type DeviceDataGroup struct {
	DeviceID string       `json:"device_id"`
	Data     []EnergyData `json:"data"`
}

// GetDataHandler returns all stored energy data grouped by device
func GetDataHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Get all data sorted by timestamp descending (no limit)
	opts := options.Find().SetSort(bson.D{{Key: "timestamp", Value: -1}})

	cursor, err := energyCollection.Find(ctx, bson.M{}, opts)
	if err != nil {
		log.Printf("Error fetching data: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer cursor.Close(ctx)

	var results []EnergyData
	if err = cursor.All(ctx, &results); err != nil {
		log.Printf("Error decoding data: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	if results == nil {
		results = []EnergyData{}
	}

	// Group data by device_id
	deviceMap := make(map[string][]EnergyData)
	for _, data := range results {
		deviceMap[data.DeviceID] = append(deviceMap[data.DeviceID], data)
	}

	// Convert map to array of grouped data
	var groupedData []DeviceDataGroup
	for deviceID, dataList := range deviceMap {
		groupedData = append(groupedData, DeviceDataGroup{
			DeviceID: deviceID,
			Data:     dataList,
		})
	}

	// Sort by device_id for consistent ordering
	sort.Slice(groupedData, func(i, j int) bool {
		return groupedData[i].DeviceID < groupedData[j].DeviceID
	})

	if len(groupedData) == 0 {
		json.NewEncoder(w).Encode([]DeviceDataGroup{})
		return
	}

	json.NewEncoder(w).Encode(groupedData)
}

// GetLatestDataHandler returns the most recent data point
func GetLatestDataHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	opts := options.FindOne().SetSort(bson.D{{Key: "timestamp", Value: -1}})
	var latestData EnergyData
	err := energyCollection.FindOne(ctx, bson.M{}, opts).Decode(&latestData)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			http.Error(w, "No data available", http.StatusNotFound)
			return
		}
		log.Printf("Error fetching latest data: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(latestData)
}

// GetDeviceDataHandler returns data for a specific device
func GetDeviceDataHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	vars := mux.Vars(r)
	deviceID := vars["device_id"]

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	filter := bson.M{"device_id": deviceID}
	opts := options.Find().SetSort(bson.D{{Key: "timestamp", Value: -1}}).SetLimit(100)

	cursor, err := energyCollection.Find(ctx, filter, opts)
	if err != nil {
		log.Printf("Error fetching device data: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer cursor.Close(ctx)

	var deviceData []EnergyData
	if err = cursor.All(ctx, &deviceData); err != nil {
		log.Printf("Error decoding device data: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	if len(deviceData) == 0 {
		http.Error(w, "No data found for device", http.StatusNotFound)
		return
	}

	json.NewEncoder(w).Encode(deviceData)
}

// DeviceGroup represents data grouped by device
type DeviceGroup struct {
	DeviceID      string      `json:"device_id"`
	RecordCount   int         `json:"record_count"`
	LatestReading *EnergyData `json:"latest_reading"`
	FirstReading  *EnergyData `json:"first_reading"`
	AveragePower  float64     `json:"average_power"`
	MaxPower      float64     `json:"max_power"`
	TotalWh       float64     `json:"total_wh"`
}

// GetGroupedDataHandler returns data grouped by device ID
func GetGroupedDataHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Aggregation pipeline to group by device_id
	pipeline := mongo.Pipeline{
		{{Key: "$sort", Value: bson.D{{Key: "timestamp", Value: -1}}}},
		{{Key: "$group", Value: bson.D{
			{Key: "_id", Value: "$device_id"},
			{Key: "count", Value: bson.D{{Key: "$sum", Value: 1}}},
			{Key: "latest", Value: bson.D{{Key: "$first", Value: "$$ROOT"}}},
			{Key: "first", Value: bson.D{{Key: "$last", Value: "$$ROOT"}}},
			{Key: "avg_power", Value: bson.D{{Key: "$avg", Value: "$apparent_power"}}},
			{Key: "max_power", Value: bson.D{{Key: "$max", Value: "$apparent_power"}}},
			{Key: "total_wh", Value: bson.D{{Key: "$max", Value: "$wh"}}},
		}}},
		{{Key: "$sort", Value: bson.D{{Key: "_id", Value: 1}}}},
	}

	cursor, err := energyCollection.Aggregate(ctx, pipeline)
	if err != nil {
		log.Printf("Error aggregating data: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	defer cursor.Close(ctx)

	var results []bson.M
	if err = cursor.All(ctx, &results); err != nil {
		log.Printf("Error decoding aggregated data: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Transform results into DeviceGroup structs
	var deviceGroups []DeviceGroup
	for _, result := range results {
		var latest, first EnergyData

		// Decode latest reading
		latestBytes, _ := bson.Marshal(result["latest"])
		bson.Unmarshal(latestBytes, &latest)

		// Decode first reading
		firstBytes, _ := bson.Marshal(result["first"])
		bson.Unmarshal(firstBytes, &first)

		group := DeviceGroup{
			DeviceID:      result["_id"].(string),
			RecordCount:   int(result["count"].(int32)),
			LatestReading: &latest,
			FirstReading:  &first,
			AveragePower:  result["avg_power"].(float64),
			MaxPower:      result["max_power"].(float64),
			TotalWh:       result["total_wh"].(float64),
		}
		deviceGroups = append(deviceGroups, group)
	}

	if len(deviceGroups) == 0 {
		json.NewEncoder(w).Encode([]DeviceGroup{})
		return
	}

	json.NewEncoder(w).Encode(deviceGroups)
}

// CORSMiddleware adds CORS headers to all responses
func CORSMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// LoggingMiddleware logs all incoming requests
func LoggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		log.Printf("%s %s %s", r.Method, r.RequestURI, r.RemoteAddr)
		next.ServeHTTP(w, r)
		log.Printf("Completed in %v", time.Since(start))
	})
}

func main() {
	// Initialize MongoDB
	if err := initMongoDB(); err != nil {
		log.Fatalf("Failed to connect to MongoDB: %v", err)
	}
	defer func() {
		if err := mongoClient.Disconnect(context.Background()); err != nil {
			log.Printf("Error disconnecting from MongoDB: %v", err)
		}
	}()

	router := mux.NewRouter()

	// Apply middleware
	router.Use(CORSMiddleware)
	router.Use(LoggingMiddleware)

	// API routes
	router.HandleFunc("/", HealthCheckHandler).Methods("GET")
	router.HandleFunc("/health", HealthCheckHandler).Methods("GET")
	router.HandleFunc("/api/data", PostDataHandler).Methods("POST", "OPTIONS")
	router.HandleFunc("/api/data", GetDataHandler).Methods("GET")
	router.HandleFunc("/api/data/grouped", GetGroupedDataHandler).Methods("GET")
	router.HandleFunc("/api/data/latest", GetLatestDataHandler).Methods("GET")
	router.HandleFunc("/api/data/device/{device_id}", GetDeviceDataHandler).Methods("GET")

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	port = ":" + port

	log.Printf("Starting Spectrawatt API server on port %s", port)
	log.Printf("Endpoints:")
	log.Printf("  POST   /api/data - Submit energy data")
	log.Printf("  GET    /api/data - Get all energy data (latest 100)")
	log.Printf("  GET    /api/data/grouped - Get data grouped by device")
	log.Printf("  GET    /api/data/latest - Get latest data point")
	log.Printf("  GET    /api/data/device/{device_id} - Get data for specific device")
	log.Printf("  GET    /health - Health check")

	log.Fatal(http.ListenAndServe(port, router))
}
