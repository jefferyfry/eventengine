package models

import "time"

type Session struct {
	Name          string    `json:"name" binding:"required"`
	InstanceType  string    `json:"instanceType" binding:"required"`
	LwUrl         string    `json:"lwUrl"`
	LwSubAccount  string    `json:"lwSubAccount"`
	LwAccessKeyID string    `json:"lwAccessKeyID"`
	LwSecretKey   string    `json:"lwSecretKey"`
	LwUserGroup   string    `json:"lwUserGroup"`
	CreatedBy     string    `json:"createdBy"`
	UpdatedBy     string    `json:"updatedBy"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
	ExpiresAt     time.Time `json:"expiresAt" binding:"required"`
	RegCount      int       `json:"regCount"`
}
