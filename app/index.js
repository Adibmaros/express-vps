require("dotenv").config();
const express = require("express");
const { Sequelize, DataTypes } = require("sequelize");
const swaggerUi = require("swagger-ui-express");

const app = express();
app.use(express.json());

// --- SWAGGER MANUAL DEFINITION (Lebih Aman dari Error Spasi) ---
const swaggerDocument = {
  openapi: "3.0.0",
  info: {
    title: "User Management API",
    version: "1.0.0",
    description: "API Documentation for Express MySQL Project",
  },
  servers: [{ url: "https://dev.adibmaros.my.id" }],
  paths: {
    "/users": {
      get: {
        tags: ["Users"],
        summary: "Dapatkan semua user",
        responses: { 200: { description: "Berhasil" } },
      },
      post: {
        tags: ["Users"],
        summary: "Tambah user baru",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  email: { type: "string" },
                },
              },
            },
          },
        },
        responses: { 201: { description: "Berhasil dibuat" } },
      },
    },
    "/users/{id}": {
      get: {
        tags: ["Users"],
        summary: "Dapatkan user by ID",
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Ditemukan" }, 404: { description: "Tidak ditemukan" } },
      },
      delete: {
        tags: ["Users"],
        summary: "Hapus user",
        parameters: [{ in: "path", name: "id", required: true, schema: { type: "integer" } }],
        responses: { 200: { description: "Dihapus" } },
      },
    },
  },
};

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// --- DATABASE ---
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  dialect: "mysql",
  logging: false,
});

const User = sequelize.define("User", {
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
});

// --- ROUTES ---
app.get("/", (req, res) => res.json({ status: "Running", docs: "/docs" }));

app.get("/users", async (req, res) => {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/users", async (req, res) => {
  try {
    const newUser = await User.create(req.body);
    res.status(201).json(newUser);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get("/users/:id", async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "Not found" });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete("/users/:id", async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "Not found" });
    await user.destroy();
    res.json({ message: "Deleted" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- INIT ---
const init = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    app.listen(process.env.PORT || 3000, () => console.log("🚀 Server Ready"));
  } catch (e) {
    console.log("DB Waiting...");
    setTimeout(init, 5000);
  }
};
init();
