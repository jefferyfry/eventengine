package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/jefferyfry/eventengine/controllers"
	"net/http"
	"os"
)

type SessionRouteController struct {
	sessionController controllers.SessionController
}

func NewSessionRouteController(sessionController controllers.SessionController) SessionRouteController {
	return SessionRouteController{sessionController}
}

func (rc *SessionRouteController) SessionRoute(rg *gin.RouterGroup) {
	routerSessions := rg.Group("/sessions")

	routerSessions.GET("/", rc.sessionController.GetSessions)
	routerSessions.GET("/:name", rc.sessionController.GetSessionByName)

	routerSessions.DELETE("/:name", rc.sessionController.DeleteSession)
	routerSessions.DELETE("/", rc.sessionController.DeleteSessions)
	routerSessions.POST("/", rc.sessionController.AddSession)
	routerSessions.POST("/ctfaddsession", ValidateCtfAddSession, rc.sessionController.AddSession)
	routerSessions.PUT("/:name", rc.sessionController.UpdateSession)
	routerSessions.GET("/defaultinstance", rc.sessionController.GetDefaultInstance)

	routerRegister := rg.Group("/register")
	routerRegister.POST("/:name", rc.sessionController.Register)
}

func ValidateCtfAddSession(context *gin.Context) {
	secret := os.Getenv("ctf_secret")
	ctfAuthorization := context.Request.Header.Get("Authorization")
	if ctfAuthorization == secret {
		return
	} else {
		context.AbortWithStatus(http.StatusUnauthorized)
	}
}
