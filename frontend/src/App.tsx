import React from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import './App.css';
import Layout from "./pages/layout";
import Sessions from "./pages/sessions";
import Event from "./pages/event";
import Login from "./pages/login";
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'

function App() {
  return (
      <LocalizationProvider dateAdapter={AdapterDayjs}>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Login />} />
                  <Route path="sessions" element={<Sessions />} />
                  <Route path="event/:sessionName" element={<Event />} />
                  <Route path="login" element={<Login />} />
              </Route>
            </Routes>
          </BrowserRouter>
      </LocalizationProvider>
  );
}

export default App;
