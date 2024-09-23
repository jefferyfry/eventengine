package main

import (
	"context"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jefferyfry/eventengine/controllers"
	"github.com/jefferyfry/eventengine/routes"
	services2 "github.com/jefferyfry/eventengine/services"
	"log"
	"net/http"
	"os"
)

var (
	server *gin.Engine
	ctx    context.Context

	sessionService         services2.SessionService
	sessionController      controllers.SessionController
	sessionRouteController routes.SessionRouteController
)

func init() {
	sessionService = services2.NewSessionServiceImpl(ctx)
	sessionController = controllers.NewSessionController(sessionService)
	sessionRouteController = routes.NewSessionRouteController(sessionController)
	server = gin.Default()
}

func main() {
	startServer()
}

func startServer() {
	corsConfig := cors.DefaultConfig()
	corsConfig.AllowOrigins = []string{"http://localhost:8080", "http://localhost:3000", "https://ee.laceworkalliances.com", "https://accounts.google.com"}
	corsConfig.AllowCredentials = true

	server.Use(cors.New(corsConfig))

	routerHealth := server.Group("/healthz")
	routerHealth.GET("/status", func(ctx *gin.Context) {
		ctx.JSON(http.StatusOK, gin.H{"status": "success", "message": "ok"})
	})
	routerApi := server.Group("/api")
	sessionRouteController.SessionRoute(routerApi)
	serverPort := os.Getenv("eventengine_serverPort")
	log.Fatal(server.Run(":" + serverPort))
}
