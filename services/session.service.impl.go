package services

import (
	"context"
	"errors"
	"fmt"
	"github.com/jefferyfry/eventengine/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"log"
	"os"
	"time"
)

type SessionServiceImpl struct {
	ctx context.Context
}

func NewSessionServiceImpl(ctx context.Context) SessionService {
	return &SessionServiceImpl{ctx}
}

func (s SessionServiceImpl) GetSessionByName(name string) (*models.Session, error) {
	client := getMongoClient()
	defer func() {
		if err := client.Disconnect(context.TODO()); err != nil {
			log.Println(err)
		}
	}()
	filter := bson.D{{"name", name}}
	var session *models.Session
	err := client.Database("eventengine").Collection("sessions").FindOne(context.Background(), filter).Decode(&session)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil, errors.New(fmt.Sprintf("No session was found with the name %s\n", name))
	}
	if err != nil {
		return nil, err
	}
	return session, nil
}

func (s SessionServiceImpl) GetAllSessions() ([]models.Session, error) {
	client := getMongoClient()
	defer func() {
		if err := client.Disconnect(context.TODO()); err != nil {
			log.Println(err)
		}
	}()
	filter := bson.D{{}}
	var sessions []models.Session
	cursor, err := client.Database("eventengine").Collection("sessions").Find(context.Background(), filter)
	if err != nil {
		return nil, err
	}
	if err = cursor.All(context.TODO(), &sessions); err != nil {
		return nil, err
	}
	return sessions, nil
}

func (s SessionServiceImpl) AddSession(session *models.Session) (*models.Session, error) {
	sessionCheck, _ := s.GetSessionByName(session.Name)
	if sessionCheck != nil {
		return nil, errors.New("Session already exists.")
	}
	client := getMongoClient()
	defer func() {
		if err := client.Disconnect(context.TODO()); err != nil {
			log.Println(err)
		}
	}()

	session.CreatedAt = time.Now()
	session.UpdatedAt = session.CreatedAt
	_, err := client.Database("eventengine").Collection("sessions").InsertOne(context.TODO(), session)
	if err != nil {
		return nil, err
	}

	return session, nil
}

func (s SessionServiceImpl) UpdateSession(name string, session *models.Session) (*models.Session, error) {
	sessionCheck, err := s.GetSessionByName(session.Name)
	if err != nil {
		return nil, err
	}
	if sessionCheck == nil {
		return nil, errors.New("Session does not exist.")
	}
	client := getMongoClient()
	defer func() {
		if err := client.Disconnect(context.TODO()); err != nil {
			log.Println(err)
		}
	}()

	session.UpdatedAt = time.Now()
	filter := bson.D{{"name", name}}
	_, err = client.Database("eventengine").Collection("sessions").UpdateOne(context.TODO(), filter, session)
	if err != nil {
		return nil, err
	}

	return session, nil
}

func (s SessionServiceImpl) DeleteSession(name string) error {
	sessionCheck, err := s.GetSessionByName(name)
	if err != nil {
		return err
	}
	if sessionCheck == nil {
		errors.New("Session does not exist.")
	}
	client := getMongoClient()
	defer func() {
		if err := client.Disconnect(context.TODO()); err != nil {
			log.Println(err)
		}
	}()

	filter := bson.D{{"name", name}}
	_, err = client.Database("eventengine").Collection("sessions").DeleteOne(context.TODO(), filter)
	if err != nil {
		return err
	}

	return nil
}

func (s SessionServiceImpl) DeleteSessions(sessions []string) error {
	for _, session := range sessions {
		if err := s.DeleteSession(session); err != nil {
			return err
		}
	}
	return nil
}

func (s SessionServiceImpl) IncrementSessionRegCount(name string) error {
	session, err := s.GetSessionByName(name)
	if err != nil {
		return err
	}
	if session == nil {
		return errors.New("Session does not exist.")
	}
	client := getMongoClient()
	defer func() {
		if err := client.Disconnect(context.TODO()); err != nil {
			log.Println(err)
		}
	}()

	session.UpdatedAt = time.Now()
	session.RegCount += 1
	filter := bson.D{{"name", name}}
	_, err = client.Database("eventengine").Collection("sessions").UpdateOne(context.TODO(), filter, session)
	if err != nil {
		return err
	}

	return nil
}

func getMongoClient() *mongo.Client {
	credential := options.Credential{
		AuthSource:    "eventengine",
		AuthMechanism: "SCRAM-SHA-256",
		Username:      os.Getenv("mongo_usr"),
		Password:      os.Getenv("mongo_pwd"),
	}
	mongoHost := os.Getenv("mongo_host")
	clientOptions := options.Client().ApplyURI("mongodb://" + mongoHost + ":27017").SetAuth(credential)
	client, err := mongo.Connect(context.Background(), clientOptions)
	if err != nil {
		log.Fatalf("Error creating mongo client: %s", err)
	}
	return client
}
