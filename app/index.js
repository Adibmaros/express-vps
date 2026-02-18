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
// Ini akan mencoba koneksi setiap 5 detik jika database belum siap
const syncDatabase = async () => {
  let connected = false;
  let attempts = 0;

  while (!connected && attempts < 10) {
    try {
      await sequelize.authenticate();
      // 'alter: true' akan menyesuaikan tabel dengan model tanpa menghapus data yang ada
      await sequelize.sync({ alter: true });
      console.log("✅ Database & Tables synced successfully");
      connected = true;
    } catch (err) {
      attempts++;
      console.log(`❌ Attempt ${attempts}: Database not ready yet (EAI_AGAIN/ECONNREFUSED). Retrying in 5s...`);
      await new Promise((res) => setTimeout(res, 5000)); // Tunggu 5 detik
    }
  }

  if (!connected) {
    console.error("🛑 Could not connect to database after multiple attempts.");
  }
};

syncDatabase();

// --- ROUTES ---

app.get("/", (req, res) => {
  res.status(200).json({ message: "Welcome to Express API!", version: "1.1.0" });
});

app.get("/users", async (req, res) => {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/users", async (req, res) => {
  try {
    const { name, email } = req.body;
    const newUser = await User.create({ name, email });
    res.status(201).json(newUser);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Route lainnya tetap sama...
app.get("/users/:id", async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
