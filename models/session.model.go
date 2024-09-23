package models

import "time"

type Session struct {
	Name          string    `json:"name" binding:"required" bson:"name"`
	InstanceType  string    `json:"instanceType" bson:"instanceType" binding:"required"`
	LwUrl         string    `json:"lwUrl" bson:"lwUrl"`
	LwSubAccount  string    `json:"lwSubAccount" bson:"lwSubAccount"`
	LwAccessKeyID string    `json:"lwAccessKeyID" bson:"lwAccessKeyID"`
	LwSecretKey   string    `json:"lwSecretKey" bson:"lwSecretKey"`
	LwUserGroup   string    `json:"lwUserGroup" bson:"lwUserGroup"`
	CreatedBy     string    `json:"createdBy" bson:"createdBy"`
	UpdatedBy     string    `json:"updatedBy" bson:"updatedBy"`
	CreatedAt     time.Time `json:"createdAt" bson:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt" bson:"updatedAt"`
	ExpiresAt     time.Time `json:"expiresAt" bson:"expiresAt" binding:"required"`
	RegCount      int       `json:"regCount" bson:"regCount"`
}
