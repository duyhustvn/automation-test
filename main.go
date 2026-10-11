package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Product struct {
	ID    string  `json:"id" bson:"_id"`
	Name  string  `json:"name" bson:"name" binding:"required"`
	Price float64 `json:"price" bson:"price" binding:"required"`
}

var (
	mongoClient     *mongo.Client
	productColl     *mongo.Collection
	redisClient     *redis.Client
	mongoURI        = getEnv("MONGO_URI", "mongodb://admin:changeme@localhost:27017/?authSource=admin")
	redisAddr       = getEnv("REDIS_ADDR", "localhost:6379")
	redisPassword   = getEnv("REDIS_PASSWORD", "changeme")
	dbName          = "inventory_db"
	collectionName  = "products"
	cacheExpiration = 10 * time.Minute
)

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

func initDatabases() error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// 1. Init MongoDB
	clientOpts := options.Client().ApplyURI(mongoURI)
	var err error
	mongoClient, err = mongo.Connect(ctx, clientOpts)
	if err != nil {
		return fmt.Errorf("không thể kết nối MongoDB: %w", err)
	}

	if err = mongoClient.Ping(ctx, nil); err != nil {
		return fmt.Errorf("ping MongoDB thất bại: %w", err)
	}
	productColl = mongoClient.Database(dbName).Collection(collectionName)
	log.Printf("MongoDB kết nối thành công: %s, DB: %s", mongoURI, dbName)

	// 2. Init Redis
	redisClient = redis.NewClient(&redis.Options{
		Addr:     redisAddr,
		Password: redisPassword,
	})

	if err = redisClient.Ping(ctx).Err(); err != nil {
		return fmt.Errorf("ping Redis thất bại: %w", err)
	}
	log.Printf("Redis kết nối thành công: %s", redisAddr)

	return nil
}

func main() {
	if err := initDatabases(); err != nil {
		log.Fatalf("Lỗi khởi tạo DB: %v", err)
	}

	r := gin.Default()

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer cancel()

		mongoErr := mongoClient.Ping(ctx, nil)
		redisErr := redisClient.Ping(ctx).Err()

		c.JSON(http.StatusOK, gin.H{
			"status": "ok",
			"mongo":  mongoErr == nil,
			"redis":  redisErr == nil,
		})
	})

	// Create Product
	r.POST("/api/products", func(c *gin.Context) {
		var product Product
		if err := c.ShouldBindJSON(&product); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if product.ID == "" {
			product.ID = fmt.Sprintf("prod_%d", time.Now().UnixNano())
		}

		ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
		defer cancel()

		// Lưu vào MongoDB
		_, err := productColl.InsertOne(ctx, product)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "lỗi lưu MongoDB: " + err.Error()})
			return
		}

		// Lưu vào Redis cache
		dataBytes, _ := json.Marshal(product)
		cacheKey := fmt.Sprintf("product:%s", product.ID)
		if err := redisClient.Set(ctx, cacheKey, string(dataBytes), cacheExpiration).Err(); err != nil {
			log.Printf("Cảnh báo: không thể ghi Redis cache: %v", err)
		}

		c.JSON(http.StatusCreated, product)
	})

	// Get Product by ID (Cache-Aside pattern)
	r.GET("/api/products/:id", func(c *gin.Context) {
		id := c.Param("id")
		cacheKey := fmt.Sprintf("product:%s", id)

		ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
		defer cancel()

		// 1. Kiểm tra trong Redis cache
		cachedData, err := redisClient.Get(ctx, cacheKey).Result()
		if err == nil {
			var cachedProduct Product
			if json.Unmarshal([]byte(cachedData), &cachedProduct) == nil {
				c.Header("X-Cache", "HIT")
				c.JSON(http.StatusOK, cachedProduct)
				return
			}
		}

		// 2. Cache MISS -> Query MongoDB
		var product Product
		filter := bson.M{"_id": id}
		err = productColl.FindOne(ctx, filter).Decode(&product)
		if err != nil {
			if errors.Is(err, mongo.ErrNoDocuments) {
				c.JSON(http.StatusNotFound, gin.H{"error": "không tìm thấy sản phẩm"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "lỗi query MongoDB: " + err.Error()})
			return
		}

		// 3. Set vào Redis cache cho các lần gọi sau
		dataBytes, _ := json.Marshal(product)
		_ = redisClient.Set(ctx, cacheKey, string(dataBytes), cacheExpiration).Err()

		c.Header("X-Cache", "MISS")
		c.JSON(http.StatusOK, product)
	})

	// Delete Product
	r.DELETE("/api/products/:id", func(c *gin.Context) {
		id := c.Param("id")
		ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
		defer cancel()

		// Xóa khỏi MongoDB
		filter := bson.M{"_id": id}
		res, err := productColl.DeleteOne(ctx, filter)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "lỗi xóa MongoDB: " + err.Error()})
			return
		}
		if res.DeletedCount == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "không tìm thấy sản phẩm"})
			return
		}

		// Xóa khỏi Redis
		cacheKey := fmt.Sprintf("product:%s", id)
		_ = redisClient.Del(ctx, cacheKey).Err()

		c.JSON(http.StatusOK, gin.H{"message": "xóa thành công", "id": id})
	})

	port := getEnv("PORT", "8088")
	log.Printf("Server đang chạy tại http://localhost:%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Lỗi khởi động server: %v", err)
	}
}
