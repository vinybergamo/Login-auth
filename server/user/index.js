require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();

app.use(express.json());

const User = require("../models/User");

app.get("/user", (req, res) => {
  try {
    res.status(200).json({ success: "Conectado com sucesso" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao conectar" });
  }
});

app.get("/user/:id", checkToken, async (req, res) => {
  const id = req.params.id;
  const user = await User.findById(id, "-password");

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.status(200).json({ user });
});

function checkToken(req, res, next) {
  const authHeader = req.headers["authorization"];

  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "User not authorized!" });
  }

  try {
    const secret = process.env.SECRET;
    jwt.verify(token, secret);
    next();
  } catch (error) {
    return res.status(400).json({ error: "Invalid token" });
  }
}

app.post("/auth/register", async (req, res) => {
  const { name, email, password, confirmpassword } = req.body;

  if (!name) {
    return res.status(422).json({ msg: "O nome é obrigatório!" });
  }

  if (!email) {
    return res.status(422).json({ msg: "O email é obrigatório!" });
  }

  if (!password) {
    return res.status(422).json({ msg: "A senha é obrigatória!" });
  }

  if (password !== confirmpassword) {
    return res.status(422).json({ msg: "As senhas não conferem!" });
  }

  // Verificar se o usuário existe

  const userExists = await User.findOne({ email: email });

  if (userExists) {
    return res.status(422).json({ msg: "Email already exists!" });
  }

  // Criar senha
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(password, salt);

  // Criar usuário
  const user = new User({
    name,
    email,
    password: passwordHash,
  });

  try {
    await user.save();

    return res.status(201).json({ msg: "Usuário criado com sucesso" });
  } catch (error) {
    res.status(500).json({ msg: error });
  }
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(422).json({ msg: "Email and password are required!" });
  }

  const user = await User.findOne({ email: email });

  if (!user) {
    return res.status(404).json({ msg: "User not found!" });
  }

  const checkPassword = await bcrypt.compare(password, user.password);

  if (!checkPassword) {
    return res.status(422).json({ msg: "Password incorrect!" });
  }

  try {
    const secret = process.env.SECRET;

    const token = jwt.sign(
      {
        userId: user._id,
      },
      secret
    );

    res.status(200).json({ msg: "Auth success", token });
  } catch (error) {
    res.status(500).json({ msg: error });
  }
});

const dbUser = process.env.DB_USER;
const dbPass = process.env.DB_PASS;
const port = process.env.PORT;

mongoose
  .connect(
    `mongodb+srv://${dbUser}:${dbPass}@cluster0.nwgbbi2.mongodb.net/loginJWT?retryWrites=true&w=majority`
  )
  .then(() => {
    app.listen(port);
    console.log("Conectado com sucesso na porta", port);
  })
  .catch((err) => console.log(err));
