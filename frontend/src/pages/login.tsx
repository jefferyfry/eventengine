import React from 'react';
import {AppBar, Button, Grid} from "@mui/material";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import {Image} from 'mui-image'
import Box from "@mui/material/Box";
import GoogleIcon from '@mui/icons-material/Google';


export default function Login() {

    const handleGo = () => {
        window.open(window.location.origin + "/sessions/","_self");
    };


    return (
        <Box sx={{width: '100%'}}>
            <AppBar position="static">
                <Toolbar variant="dense">
                    <Typography variant="h4" color="inherit" component="div" sx={{flexGrow: 1}} style={{padding: 25}}>
                        Event Engine
                    </Typography>
                </Toolbar>
                <Typography variant="h6" color="inherit" component="div" sx={{flexGrow: 1}} style={{paddingLeft: 25}}>
                    Attendee self-provisioning for your Event Engine events
                </Typography>
            </AppBar>
            <Grid
                container
                spacing={75}
                direction="column"
                alignItems="center"
                justifyContent="center"
                style={{ minHeight: '100vh' }}
            >

                <Grid item xs={3}>
                    <Button
                        sx={{ borderRadius: 10 }}
                        variant="contained"
                        startIcon={<GoogleIcon />}
                        onClick={handleGo}
                    >
                        Login with Google
                    </Button>
                </Grid>

            </Grid>
        </Box>
    );
}
