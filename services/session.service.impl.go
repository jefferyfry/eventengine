package services

import (
	"context"
	"errors"
	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/service/dynamodb"
	"github.com/aws/aws-sdk-go/service/dynamodb/dynamodbattribute"
	"github.com/jefferyfry/eventengine/models"
	"log"
	"time"
)

type SessionServiceImpl struct {
	ctx context.Context
}

func NewSessionServiceImpl(ctx context.Context) SessionService {
	return &SessionServiceImpl{ctx}
}

func (s SessionServiceImpl) GetSessionByName(name string) (*models.Session, error) {
	db := db.GetDB()
	params := &dynamodb.GetItemInput{
		Key: map[string]*dynamodb.AttributeValue{
			"name": {
				S: aws.String(name),
			},
		},
		TableName:      aws.String("Sessions"),
		ConsistentRead: aws.Bool(true),
	}
	resp, err := db.GetItem(params)
	if err != nil {
		log.Println(err)
		return nil, err
	}
	if len(resp.Item) != 0 {
		var session *models.Session
		if err := dynamodbattribute.UnmarshalMap(resp.Item, &session); err != nil {
			log.Printf("FindAllSessions error with UnmarshalMap : %s", err)
			return nil, err
		}
		return session, nil
	}
	return nil, nil
}

func (s SessionServiceImpl) GetAllSessions() ([]models.Session, error) {
	db := db.GetDB()
	params := &dynamodb.ScanInput{
		TableName:      aws.String("Sessions"),
		ConsistentRead: aws.Bool(true),
	}
	resp, err := db.Scan(params)
	if err != nil {
		log.Println(err)
		return nil, err
	}
	var sessions []models.Session
	if err := dynamodbattribute.UnmarshalListOfMaps(resp.Items, &sessions); err != nil {
		log.Printf("FindAllSessions error with UnmarshalListOfMaps : %s", err)
		return nil, err
	}
	return sessions, nil
}

func (s SessionServiceImpl) AddSession(session *models.Session) (*models.Session, error) {
	sessionCheck, err := s.GetSessionByName(session.Name)
	if err != nil {
		return nil, err
	}
	if sessionCheck != nil {
		return nil, errors.New("Session already exists.")
	}
	db := db.GetDB()
	session.CreatedAt = time.Now()
	session.UpdatedAt = session.CreatedAt
	dymap, err := dynamodbattribute.MarshalMap(session)
	if err != nil {
		log.Fatalf("Got error marshalling new session item: %s", err)
	}

	input := &dynamodb.PutItemInput{
		Item:      dymap,
		TableName: aws.String("Sessions"),
	}

	_, err = db.PutItem(input)
	if err != nil {
		log.Printf("Got error calling PutItem: %s", err)
		return nil, err
	}

	return session, nil
}

func (s SessionServiceImpl) UpdateSession(name string, session *models.Session) (*models.Session, error) {
	db := db.GetDB()
	session.UpdatedAt = time.Now()

	input := &dynamodb.UpdateItemInput{
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":url": {
				S: aws.String(session.LwUrl),
			},
			":sub": {
				S: aws.String(session.LwSubAccount),
			},
			":key": {
				S: aws.String(session.LwAccessKeyID),
			},
			":sec": {
				S: aws.String(session.LwSecretKey),
			},
			":usr": {
				S: aws.String(session.LwUserGroup),
			},
			":exp": {
				S: aws.String(session.ExpiresAt.Format(time.RFC3339)),
			},
			":upd": {
				S: aws.String(session.UpdatedAt.Format(time.RFC3339)),
			},
			":upb": {
				S: aws.String(session.UpdatedBy),
			},
		},
		TableName: aws.String("Sessions"),
		Key: map[string]*dynamodb.AttributeValue{
			"name": {
				S: aws.String(name),
			},
		},
		ReturnValues: aws.String("ALL_NEW"),
		UpdateExpression: aws.String("set lwUrl = :url,lwSubAccount =:sub, lwAccessKeyID = :key," +
			"lwSecretKey = :sec, lwUserGroup = :usr, expiresAt = :exp,updatedAt = :upd,updatedBy = :upb"),
	}

	_, err := db.UpdateItem(input)
	if err != nil {
		log.Printf("Got error calling UpdateItem: %s", err)
		return nil, err
	}

	return session, nil
}

func (s SessionServiceImpl) DeleteSession(name string) error {
	db := db.GetDB()
	input := &dynamodb.DeleteItemInput{
		Key: map[string]*dynamodb.AttributeValue{
			"name": {
				S: aws.String(name),
			},
		},
		TableName: aws.String("Sessions"),
	}

	_, err := db.DeleteItem(input)
	if err != nil {
		log.Printf("Got error calling DeleteItem: %s", err)
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

func (s SessionServiceImpl) IncrementSessionRegCount(sessionName string) error {
	db := db.GetDB()

	input := &dynamodb.UpdateItemInput{
		ExpressionAttributeValues: map[string]*dynamodb.AttributeValue{
			":inc": {N: aws.String("1")},
		},
		TableName: aws.String("Sessions"),
		Key: map[string]*dynamodb.AttributeValue{
			"name": {
				S: aws.String(sessionName),
			},
		},
		ReturnValues:     aws.String("ALL_NEW"),
		UpdateExpression: aws.String("set regCount = regCount + :inc"),
	}

	_, err := db.UpdateItem(input)
	if err != nil {
		log.Printf("Got error calling UpdateItem: %s", err)
		return err
	}

	return nil
}
