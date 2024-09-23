package controllers

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/jefferyfry/eventengine/models"
	"github.com/jefferyfry/eventengine/services"
	"io"
	"log"
	"net/http"
	"net/http/httputil"
	"os"
	"strings"
	"time"
)

const (
	INSTANCE_TYPE_CUSTOM  string = "CUSTOM"
	INSTANCE_TYPE_DEFAULT string = "DEFAULT"
)

var (
	defaultLwUrl         = os.Getenv("eventengine_def_instance_url")
	defaultLwAccessKeyID = os.Getenv("eventengine_def_access_key_id")
	defaultLwSecretKey   = os.Getenv("eventengine_def_secret_key")
	defaultLwSubAcct     = os.Getenv("eventengine_def_sub_acct")
)

type AccessTokenReqPayload struct {
	KeyId      string `json:"keyId"`
	ExpiryTime int    `json:"expiryTime"`
}

type AccessTokenRspPayload struct {
	ExpiresAt string `json:"expiresAt"`
	Token     string `json:"token"`
}

type RegisterUserReq struct {
	Email     string `json:"email" binding:"required"`
	FirstName string `json:"firstName" binding:"required"`
	LastName  string `json:"lastName" binding:"required"`
	Company   string `json:"company" binding:"required"`
}

type PostTeamUsersReq struct {
	Type    string `json:"type"`
	Name    string `json:"name"`
	Email   string `json:"email"`
	Company string `json:"company"`
}

type PostTeamUsersRsp struct {
	Data TeamUsers `json:"data"`
}

type TeamUsers struct {
	Name          string       `json:"name"`
	Company       string       `json:"company,omitempty"`
	Email         string       `json:"email"`
	UserGuid      string       `json:"userGuid"`
	UserEnabled   int          `json:"userEnabled"`
	Type          string       `json:"type"`
	UserGroups    []UserGroups `json:"userGroups,omitempty"`
	LastLoginTime int          `json:"lastLoginTime"`
	OrgAccess     string       `json:"lastLoginTime"`
}

type UserGroups struct {
	UserGroupGuid string `json:"userGroupGuid"`
	UserGroupName string `json:"userGroupName"`
}

type PostUserGroupsReq struct {
	UserGuids []string `json:"userGuids"`
}

type PostUserGroupsRsp struct {
	UserGuids      []string `json:"userGuids"`
	UserGroupGuids []string `json:"userGroupGuids"`
}

type GetTeamUsersRsp struct {
	Data []TeamUsers `json:"data"`
}

type Sessions struct {
	Sessions []string `json:"sessions" binding:"required"`
}

type SessionController struct {
	sessionService services.SessionService
}

func NewSessionController(sessionService services.SessionService) SessionController {
	sessionController := SessionController{sessionService}
	sessionController.StartCleanupCron()
	return sessionController
}

func (s SessionController) GetSessions(context *gin.Context) {
	sessions, err := s.sessionService.GetAllSessions()
	if err != nil {
		log.Printf("Error retrieving sessions.: %s", err)
		context.JSON(http.StatusInternalServerError, gin.H{"message": "Error retrieving sessions. " + err.Error(), "error": err})
		context.Abort()
		return
	}
	context.JSON(http.StatusOK, sessions)
	return
}

func (s SessionController) GetDefaultInstance(context *gin.Context) {
	context.String(http.StatusOK, "%s", defaultLwUrl)
	return
}

func (s SessionController) GetSessionByName(context *gin.Context) {
	if context.Param("name") != "" {
		session, err := s.sessionService.GetSessionByName(context.Param("name"))
		if err != nil {
			context.JSON(http.StatusInternalServerError, gin.H{"message": "Error retrieving the session. " + err.Error(), "error": err})
			context.Abort()
			return
		}
		context.JSON(http.StatusOK, session)
		return
	}
	context.JSON(http.StatusBadRequest, gin.H{"message": "Missing session name parameter."})
}

func (s SessionController) AddSession(context *gin.Context) {
	var session models.Session
	if err := context.ShouldBindJSON(&session); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"message": "Invalid request parameters. " + err.Error(), "error": err.Error()})
		return
	}
	newSession, err := s.sessionService.AddSession(&session)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"message": "Error adding session. " + err.Error(), "error": err})
		context.Abort()
		return
	}
	context.JSON(http.StatusOK, newSession)
	return
}

func (s SessionController) UpdateSession(context *gin.Context) {
	sessionName := context.Param("name")
	if sessionName == "" {
		context.JSON(http.StatusBadRequest, gin.H{"message": "Missing session name."})
		return
	}
	var session models.Session
	if err := context.ShouldBindJSON(&session); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"message": "Invalid request parameters. " + err.Error(), "error": err.Error()})
		return
	}
	newSession, err := s.sessionService.UpdateSession(sessionName, &session)
	if err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"message": "Error adding session. " + err.Error(), "error": err})
		context.Abort()
		return
	}
	context.JSON(http.StatusOK, newSession)
	return
}

func (s SessionController) DeleteSession(context *gin.Context) {
	sessionName := context.Param("name")
	if sessionName == "" {
		context.JSON(http.StatusBadRequest, gin.H{"message": "Missing session name."})
		return
	}

	if session, err := s.sessionService.GetSessionByName(sessionName); err != nil {
		context.JSON(http.StatusInternalServerError, gin.H{"message": "Error retrieving the session. " + err.Error(), "error": err})
		context.Abort()
		return
	} else {
		s.deleteTeamMemberUsersBySession(*session)
		if err := s.sessionService.DeleteSession(sessionName); err != nil {
			context.JSON(http.StatusInternalServerError, gin.H{"message": "Error deleting session. " + err.Error(), "error": err})
			context.Abort()
			return
		}
		log.Printf("Deleted session %s", sessionName)
	}

	context.JSON(http.StatusOK, gin.H{"message": "Session deleted."})
	return
}

func (s SessionController) DeleteSessions(context *gin.Context) {
	var sessions Sessions
	if err := context.ShouldBindJSON(&sessions); err != nil {
		context.JSON(http.StatusBadRequest, gin.H{"message": "Invalid payload parameters. " + err.Error(), "error": err.Error()})
		return
	}

	for _, sessionName := range sessions.Sessions {
		if session, err := s.sessionService.GetSessionByName(sessionName); err != nil {
			context.JSON(http.StatusInternalServerError, gin.H{"message": "Error retrieving the session. " + err.Error(), "error": err})
			context.Abort()
			return
		} else {
			s.deleteTeamMemberUsersBySession(*session)
			if err := s.sessionService.DeleteSession(sessionName); err != nil {
				context.JSON(http.StatusInternalServerError, gin.H{"message": "Error deleting session. " + err.Error(), "error": err})
				context.Abort()
				return
			}
		}
	}
	context.JSON(http.StatusOK, gin.H{"message": "Sessions deleted."})
	return
}

func (s SessionController) Register(context *gin.Context) {
	if context.Param("name") != "" {
		session, err := s.sessionService.GetSessionByName(context.Param("name"))
		if err != nil {
			context.JSON(http.StatusInternalServerError, gin.H{"message": "Error retrieving the session. " + err.Error(), "error": err})
			context.Abort()
			return
		}

		var registerUser RegisterUserReq
		if err := context.ShouldBindJSON(&registerUser); err != nil {
			context.JSON(http.StatusBadRequest, gin.H{"message": "Error binding request. " + err.Error(), "error": err.Error()})
			return
		}

		if session.InstanceType == INSTANCE_TYPE_DEFAULT {
			session.LwUrl = defaultLwUrl
			session.LwAccessKeyID = defaultLwAccessKeyID
			session.LwSecretKey = defaultLwSecretKey
			session.LwSubAccount = defaultLwSubAcct
		}

		if accessToken, err := createAccessToken(session.LwUrl, session.LwAccessKeyID, session.LwSecretKey); err == nil {
			if rspUsr, msg, err := addTeamMemberUser(session.Name, registerUser.Email, registerUser.FirstName, registerUser.LastName, registerUser.Company, session.LwUrl, accessToken, session.LwSubAccount); err != nil {
				context.JSON(http.StatusInternalServerError, gin.H{"message": "Error adding team member. " + err.Error(), "error": err.Error() + " " + msg})
				return
			} else { //LACEWORK_USER_GROUP_READ_ONLY_USER
				if session.LwUserGroup == "" {
					session.LwUserGroup = "LACEWORK_USER_GROUP_READ_ONLY_USER"
				}
				if _, msg, err := addTeamUserToUserGroup(rspUsr.Data.UserGuid, session.LwUserGroup, session.LwUrl, accessToken, session.LwSubAccount); err != nil {
					context.JSON(http.StatusInternalServerError, gin.H{"message": fmt.Sprintf("Error adding team member to group '%s'. %s %s", session.LwUserGroup, msg, err.Error()), "error": err.Error()})
					return
				}
			}
		} else {
			context.JSON(http.StatusInternalServerError, gin.H{"message": "Error creating access token. " + err.Error(), "error": err.Error()})
			return
		}
		s.sessionService.IncrementSessionRegCount(session.Name)
		context.JSON(http.StatusOK, registerUser)
		return
	}
	context.JSON(http.StatusBadRequest, gin.H{"message": "Missing session name parameter."})
}

func (s SessionController) StartCleanupCron() {
	job := cron.New()
	job.AddFunc("@hourly", func() {
		log.Printf("Delete sessions cronjob started %s", time.Now().UTC())
		//get all sessions
		sessions, err := s.sessionService.GetAllSessions()
		if err != nil {
			log.Printf("Error retrieving sessions.: %s", err)
			return
		}

		for _, session := range sessions {
			if session.ExpiresAt.Before(time.Now().UTC()) {
				s.deleteTeamMemberUsersBySession(session)
				//delete session
				if err := s.sessionService.DeleteSession(session.Name); err != nil {
					log.Printf("Error deleting session %s: %s", session.Name, err)
					continue
				}
			}
		}
	})
	log.Println("Started cron job to delete sessions and users.")
	job.Start()

}

func createAccessToken(laceworkUrl string, accessKeyId string, secretKey string) (string, error) {
	log.Printf("createAccessToken: laceworkUrl: %s, accessKeyId: %s, secretKey: %s", laceworkUrl, accessKeyId, secretKey)
	requestPayload := AccessTokenReqPayload{
		KeyId:      accessKeyId,
		ExpiryTime: 86400,
	}
	if payloadBytes, err := json.Marshal(requestPayload); err == nil {
		request, err := http.NewRequest(http.MethodPost, "https://"+laceworkUrl+"/api/v2/access/tokens", bytes.NewBuffer(payloadBytes))

		if err != nil {
			return "", err
		}

		request.Header.Add("X-LW-UAKS", secretKey)
		request.Header.Add("content-type", "application/json")

		if rsp, err := http.DefaultClient.Do(request); err == nil {
			defer rsp.Body.Close()
			rspData := AccessTokenRspPayload{}
			if err := json.NewDecoder(rsp.Body).Decode(&rspData); err == nil {
				log.Printf("AccessTokenRspPayload: %+v", rspData)
			} else {
				log.Printf("Unable to get response body: %v", err)
				return "", err
			}
			if rsp.StatusCode == http.StatusCreated {
				return rspData.Token, nil
			} else {
				return "", errors.New(fmt.Sprintf("Failed to get access token. Resp status is %d", rsp.Status))
			}
		} else {
			return "", err
		}
	} else {
		return "", err
	}
}

func addTeamMemberUser(session string, email string, firstName string, lastName string, company string, laceworkUrl string, accessToken string, subAccountName string) (*PostTeamUsersRsp, string, error) {
	requestPayload := PostTeamUsersReq{
		Type:    "StandardUser",
		Name:    firstName + " " + lastName,
		Email:   email,
		Company: company + "-" + session,
	}

	if payloadBytes, err := json.Marshal(requestPayload); err == nil {
		if rsp, err := sendApiReq(http.MethodPost, laceworkUrl, "/api/v2/TeamUsers", accessToken, bytes.NewBuffer(payloadBytes), subAccountName); err == nil {
			defer rsp.Body.Close()
			if body, err := io.ReadAll(rsp.Body); err != nil {
				return nil, fmt.Sprintf("Problem reading response body %v", err), err
			} else {
				var usrRsp PostTeamUsersRsp
				if errMarsh := json.Unmarshal(body, &usrRsp); errMarsh != nil {
					return nil, fmt.Sprintf("Problem unmarshalling %v", errMarsh), errMarsh
				} else {
					if rsp.StatusCode == http.StatusCreated {
						return &usrRsp, rsp.Status, nil
					} else {
						return nil, rsp.Status, errors.New(fmt.Sprintf("User with this email address already exists."))
					}
				}
			}
		} else {
			return nil, fmt.Sprintf("Problem sending request %v", err), err
		}
	} else {
		return nil, fmt.Sprintf("Problem marshalling request %v", err), err
	}
}

func addTeamUserToUserGroup(userGuid string, userGroup string, laceworkUrl string, accessToken string, subAccountName string) (*PostUserGroupsRsp, string, error) {
	requestPayload := PostUserGroupsReq{
		UserGuids: []string{userGuid},
	}

	if payloadBytes, err := json.Marshal(requestPayload); err == nil {
		if rsp, err := sendApiReq(http.MethodPost, laceworkUrl, "/api/v2/UserGroups/"+userGroup+"/addUsers", accessToken, bytes.NewBuffer(payloadBytes), subAccountName); err == nil {
			defer rsp.Body.Close()
			if body, err := io.ReadAll(rsp.Body); err != nil {
				return nil, fmt.Sprintf("Problem reading response body %v", err), err
			} else {
				var usrGrpRsp PostUserGroupsRsp
				if errMarsh := json.Unmarshal(body, &usrGrpRsp); errMarsh != nil {
					return nil, fmt.Sprintf("Problem unmarshalling %v", errMarsh), errMarsh
				} else {
					if rsp.StatusCode == http.StatusOK {
						return &usrGrpRsp, rsp.Status, nil
					} else {
						return nil, rsp.Status, errors.New(fmt.Sprintf("Failed sending add team member to user group request. Response status is %d", rsp.StatusCode))
					}
				}
			}
		} else {
			return nil, fmt.Sprintf("Problem sending request %v", err), err
		}
	} else {
		return nil, fmt.Sprintf("Problem marshalling request %v", err), err
	}
}

func (s SessionController) deleteTeamMemberUsersBySession(session models.Session) (string, error) {
	if session.InstanceType == INSTANCE_TYPE_DEFAULT {
		session.LwUrl = defaultLwUrl
		session.LwAccessKeyID = defaultLwAccessKeyID
		session.LwSecretKey = defaultLwSecretKey
		session.LwSubAccount = defaultLwSubAcct
	}
	if accessToken, err := createAccessToken(session.LwUrl, session.LwAccessKeyID, session.LwSecretKey); err == nil {
		if usrsRsp, msg, err := getSessionTeamMemberUsers(session.Name, session.LwUrl, accessToken, session.LwSubAccount); err == nil {
			delCt := 0
			for _, usr := range usrsRsp.Data {
				if delRsp, err := deleteTeamMemberUser(usr.UserGuid, session.LwUrl, accessToken, session.LwSubAccount); err != nil {
					log.Printf("Unable to delete user %v %v", usr, err)
				} else {
					log.Printf("Deleted user %v %s", usr, delRsp)
					delCt++
				}
			}
			return fmt.Sprintf("Deleted %d users", delCt), nil
		} else {
			return fmt.Sprintf("Problem unmarshalling %s %v", msg, err), err
		}
	} else {
		//access token issue
		return fmt.Sprintf("Error creating access token %v", err), err
	}
}

func deleteTeamMemberUser(userGuid string, laceworkUrl string, accessToken string, subAccountName string) (string, error) {
	if rsp, err := sendApiReq(http.MethodDelete, laceworkUrl, "/api/v2/TeamUsers/"+userGuid, accessToken, nil, subAccountName); err == nil {
		defer rsp.Body.Close()
		if rsp.StatusCode == http.StatusNoContent {
			return rsp.Status, nil
		} else {
			return rsp.Status, errors.New(fmt.Sprintf("Failed sending delete team member request. Response status is %d", rsp.StatusCode))
		}
	} else {
		return fmt.Sprintf("Problem sending request %v", err), err
	}
}

func getSessionTeamMemberUsers(session string, laceworkUrl string, accessToken string, subAccountName string) (*GetTeamUsersRsp, string, error) {
	if rsp, err := sendApiReq(http.MethodGet, laceworkUrl, "/api/v2/TeamUsers/", accessToken, nil, subAccountName); err == nil {
		defer rsp.Body.Close()
		if body, err := io.ReadAll(rsp.Body); err != nil {
			return nil, fmt.Sprintf("Problem reading response body %v", err), err
		} else if rsp.StatusCode == http.StatusOK {
			var usrsRsp GetTeamUsersRsp
			if errMarsh := json.Unmarshal(body, &usrsRsp); errMarsh != nil {
				return nil, fmt.Sprintf("Problem unmarshalling %v", errMarsh), errMarsh
			} else {
				var sessUsrs GetTeamUsersRsp
				for _, usr := range usrsRsp.Data {
					if strings.HasSuffix(usr.Company, session) {
						sessUsrs.Data = append(sessUsrs.Data, usr)
					}
				}
				log.Printf("Filtered users for %s %v", session, sessUsrs.Data)
				return &sessUsrs, rsp.Status, nil
			}
		} else {
			return nil, rsp.Status, errors.New(fmt.Sprintf("Failed sending add team member to user group request. Response status is %d", rsp.StatusCode))
		}
	} else {
		return nil, fmt.Sprintf("Problem sending request %v", err), err
	}
}

func sendApiReq(method string, laceworkUrl string, api string, accessToken string, payload io.Reader, subAccountName string) (*http.Response, error) {
	if request, err := http.NewRequest(method, "https://"+laceworkUrl+api, payload); err != nil {
		log.Printf("Error creating API post request: %v %v\n", err, payload)
		return nil, err
	} else {
		request.Header.Add("Authorization", accessToken)
		request.Header.Add("content-type", "application/json")

		if subAccountName != "" {
			request.Header.Add("Account-Name", subAccountName)
		}

		requestDump, err := httputil.DumpRequest(request, true)
		if err != nil {
			log.Println(err)
		}
		log.Printf("Sending request: %s", string(requestDump))

		return http.DefaultClient.Do(request)
	}
}
