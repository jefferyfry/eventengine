package services

import (
	"github.com/jefferyfry/eventengine/models"
)

type SessionService interface {
	GetSessionByName(string) (*models.Session, error)
	GetAllSessions() ([]models.Session, error)
	AddSession(*models.Session) (*models.Session, error)
	UpdateSession(string, *models.Session) (*models.Session, error)
	DeleteSession(string) error
	DeleteSessions([]string) error
	IncrementSessionRegCount(string) error
}
