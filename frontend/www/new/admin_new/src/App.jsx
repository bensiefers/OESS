import React from "react";
import ReactDOM from "react-dom";

import { AdminNavBar } from "./components/nav_bar/AdminNavBar.jsx";
import NavBar from "./components/nav_bar/NavBar.jsx";
import { PageContextProvider } from './contexts/PageContext.jsx';

import { Users } from "./pages/Users.jsx";
import { Device } from "./pages/Device.jsx";
import { Devices } from "./pages/Devices.jsx";
import { Workgroups } from "./pages/workgroups/Workgroups.jsx";

import { BrowserRouter as Router, Switch, Route, Redirect } from "react-router-dom";

import "./style.css";

const App = () => {
  return (
    <Router basename="/oess/new/admin">
      <PageContextProvider>

        <div className="oess-page-container">
          <div className="oess-page-navigation">
            <NavBar />
          </div>

          <div className="oess-side-navigation">
            <AdminNavBar />
          </div>

          <div className="oess-page-content">
            <Switch>
              <Route exact path="/">
                <Redirect to="/users" />
              </Route>
              <Route path="/users">
                <Users />
              </Route>
              <Route path="/workgroups">
                <Workgroups />
              </Route>
              <Route path="/devices/:id" component={Device} />
              <Route path="/devices">
                <Devices />
              </Route>
            </Switch>
          </div>
        </div>
      </PageContextProvider>
    </Router>
  );
};

let mountNode = document.getElementById("app");
ReactDOM.render(<App />, mountNode);
