const express = require("express");
const path = require("path");
const chatHandler = require("./api/chat");
const publicToolsHandler = require("./api/public-tools");

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.all("/api/chat", (req, res) => chatHandler(req, res));
app.all("/api/public-tools", (req, res) => publicToolsHandler(req, res));
app.use(express.static(path.join(__dirname)));

const port = Number(process.env.PORT || 10000);
app.listen(port, "0.0.0.0", () => console.log(`AI Maroc listening on ${port}`));
