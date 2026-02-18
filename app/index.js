require("dotenv").config();
const express = require("express");
const { Sequelize, DataTypes } = require("sequelize");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");

const app = express();
app.use(express.json());

// --- KONFIGURASI SWAGGER ---
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Express User API Documentation",
      version: "1.0.0",
      description: "Dokumentasi API untuk manajemen data User (CRUD)",
    },
    servers: [
      {
        url: `https://dev.adibmaros.my.id`,
        description: "Development Server",
      },
    ],
  },
  apis: ["./index.js"], // Lokasi file dengan anotasi dokumentasi
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// --- DATABASE CONNECTION & MODEL (Sama seperti sebelumnya) ---
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  dialect: "mysql",
  logging: false,
});

const User = sequelize.define(
  "User",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
  },
  { tableName: "users", timestamps: true },
);

const syncDatabase = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    console.log("✅ Database synced");
  } catch (err) {
    console.log("❌ Retrying database connection...");
    setTimeout(syncDatabase, 5000);
  }
};
syncDatabase();

// --- API DOCUMENTATION (ANOTASI) ---

/**
 * @openapi
 * /users:
 * get:
 * summary: Mendapatkan semua data user
 * responses:
 * 200:
 * description: Berhasil mengambil data.
 */
app.get("/users", async (req, res) => {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /users/{id}:
 * get:
 * summary: Mendapatkan user berdasarkan ID
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * responses:
 * 200:
 * description: Detail user ditemukan.
 * 404:
 * description: User tidak ditemukan.
 */
app.get("/users/:id", async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @openapi
 * /users:
 * post:
 * summary: Menambah user baru
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * name:
 * type: string
 * email:
 * type: string
 * responses:
 * 201:
 * description: User berhasil dibuat.
 */
app.post("/users", async (req, res) => {
  try {
    const { name, email } = req.body;
    const newUser = await User.create({ name, email });
    res.status(201).json(newUser);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @openapi
 * /users/{id}:
 * delete:
 * summary: Menghapus user
 * parameters:
 * - in: path
 * name: id
 * required: true
 * responses:
 * 200:
 * description: User dihapus.
 */
app.delete("/users/:id", async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    await user.destroy();
    res.status(200).json({ message: "User deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📖 Documentation: https://dev.adibmaros.my.id/docs`);
});
