import React from "react";
import {Outlet} from "react-router-dom";
import {Image} from "mui-image";
import Typography from "@mui/material/Typography";

const Layout = () => {
    return (
        <>
            <Outlet/>
            <a href={process.env.REACT_APP_API_URL+"/static/wizexercise.txt"} target="_blank">Download wizexercise.txt</a>
        </>
    );
};

export default Layout;