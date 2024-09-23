import React from "react";
import {Outlet} from "react-router-dom";
import {Image} from "mui-image";
import Typography from "@mui/material/Typography";

const Layout = () => {
    return (
        <>
            <Typography variant="h6" color="inherit" component="div" sx={{flexGrow: 1, bgcolor: "#1A76D2"}} style={{paddingLeft: 25}}>
                <Image src="/images/Fortinet-logo-rgb-white.png" width="200px" style={{padding: 10}}/>
            </Typography>
            <Outlet />
        </>
    );
};

export default Layout;