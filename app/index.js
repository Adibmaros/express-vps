require("dotenv").config();
const express = require("express");
const { Sequelize, DataTypes } = require("sequelize");

const app = express();
app.use(express.json());

// 1. Konfigurasi Koneksi dengan Pool agar lebih stabil
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  dialect: "mysql",
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

// 2. Definisi Model User
const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
  },
  {
    tableName: "users",
    timestamps: true,
  },
);

// 3. Fungsi Sinkronisasi dengan Retry Logic
// Ini akan terus mencoba koneksi selama database MySQL melakukan booting
const syncDatabase = async () => {
  let connected = false;
  let attempts = 0;

  while (!connected && attempts < 15) {
    try {
      await sequelize.authenticate();
      // 'alter: true' memastikan tabel dibuat/diperbarui otomatis
      await sequelize.sync({ alter: true });
      console.log("✅ Database & Tables synced successfully");
      connected = true;
    } catch (err) {
      attempts++;
      console.log(`❌ Attempt ${attempts}: MySQL not ready. Retrying in 5s...`);
      await new Promise((res) => setTimeout(res, 5000));
    }
  }

  if (!connected) {
    console.error("🛑 Final Failure: Could not connect to database.");
  }
};

syncDatabase();

// --- FULL ROUTES ---

// 1. Welcome Route
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Welcome to Express API!",
    version: "1.1.0",
    status: "Running",
  });
});

// 2. GET All Users
app.get("/users", async (req, res) => {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. GET User by ID
app.get("/users/:id", async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. POST Create User
app.post("/users", async (req, res) => {
  try {
    const { name, email } = req.body;
    const newUser = await User.create({ name, email });
    res.status(201).json(newUser);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 5. PUT Update User
app.put("/users/:id", async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    user.name = name;
    user.email = email;
    await user.save();
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 6. DELETE User
app.delete("/users/:id", async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    await user.destroy();
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
