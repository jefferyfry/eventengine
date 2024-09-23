import React from 'react';
import {
    AppBar,
    Button,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    TextField
} from "@mui/material";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import {Image} from 'mui-image'
import Box from "@mui/material/Box";
import {useParams} from "react-router";


type SessionParams = {
    sessionName: string;
};

export default function Event() {
    const [email, setEmail] = React.useState('');
    const [firstName, setFirstName] = React.useState('');
    const [lastName, setLastName] = React.useState('');
    const [company, setCompany] = React.useState('');
    const [openAddMessage, setOpenAddMessage] = React.useState(false);
    const [addMessage, setAddMessage] = React.useState("");
    const {sessionName} = useParams<SessionParams>();

    const handleSubmit = () => {
        addTeamMemberUser();
    };

    const handleCancelAddMessage = () => {
        setOpenAddMessage(false);
        setAddMessage("");
        window.location.href = "https://docs.lacework.com"
    }

    const addTeamMemberUser = async () => {
        const response = await fetch(process.env.REACT_APP_API_URL+"/api/register/" + sessionName, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
            },
            body: JSON.stringify({email: email, firstName: firstName, lastName: lastName, company: company})
        });

        if (!response.ok) {
            response.json().then((data) => {
                setAddMessage(data.message);
                setOpenAddMessage(true);
            })
        } else {
            setAddMessage("Check your email for access instructions!");
            setOpenAddMessage(true);
        }
    }

    return (
        <Box sx={{width: '100%'}}>
            <AppBar position="static">
                <Toolbar variant="dense">
                    <Image src="/images/FortiCNAPP-200.png" width="50px" style={{padding: 10}}/>
                    <Typography variant="h5" color="inherit" component="div" sx={{flexGrow: 1}} style={{padding: 25}}>
                        Lacework FortiCNAPP Event Engine
                    </Typography>
                </Toolbar>
                <Typography variant="h6" color="inherit" component="div" sx={{flexGrow: 1}} style={{paddingLeft: 25}}>
                    Attendee self-provisioning for your Lacework FortiCNAPP events
                </Typography>
            </AppBar>
            <Paper sx={{width: '100%', mb: 2}}>
                <Container maxWidth={"sm"} style={{padding: 20}}>
                    <div>Enter your email address, name & company to get access to Lacework!</div>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="email"
                        label="Email"
                        type="email"
                        fullWidth
                        error={email.length < 4}
                        helperText={email.length < 4 ? 'Min length > 3' : ''}
                        onChange={(event) => setEmail(event.target.value)}
                        variant="standard"
                    />
                    <TextField
                        autoFocus
                        margin="dense"
                        id="firstName"
                        label="First Name"
                        type="text"
                        fullWidth
                        error={firstName.length < 3}
                        helperText={firstName.length < 3 ? 'Min length > 2' : ''}
                        onChange={(event) => setFirstName(event.target.value)}
                        variant="standard"
                    />
                    <TextField
                        autoFocus
                        margin="dense"
                        id="lastName"
                        label="Last Name"
                        type="text"
                        fullWidth
                        error={lastName.length < 3}
                        helperText={lastName.length < 3 ? 'Min length > 2' : ''}
                        onChange={(event) => setLastName(event.target.value)}
                        variant="standard"
                    />
                    <TextField
                        autoFocus
                        margin="dense"
                        id="company"
                        label="Company"
                        type="text"
                        fullWidth
                        error={company.length < 3}
                        helperText={company.length < 3 ? 'Min length > 2' : ''}
                        onChange={(event) => setCompany(event.target.value)}
                        variant="standard"
                    />
                    <Dialog open={openAddMessage}>
                        <DialogContent>
                            <DialogContentText>
                                {addMessage}
                            </DialogContentText>
                        </DialogContent>
                        <DialogActions>
                            <Button variant="contained" onClick={handleCancelAddMessage}>Ok</Button>
                        </DialogActions>
                    </Dialog>

                    <Button size="small" variant="contained" onClick={handleSubmit}>Submit</Button>
                </Container>
            </Paper>
        </Box>
    );
}
