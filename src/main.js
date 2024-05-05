const express = require("express");
const expressEjsLayout = require("express-ejs-layouts");
const path = require("path");

const API = express();

API.set("views", path.join(__dirname, "views"));
API.use(expressEjsLayout);
API.set("layout", "./layouts/default");
API.set("view engine", "ejs");

API.use("/", require("./router/index"));

module.exports = API