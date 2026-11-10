
require("dotenv").config();

const express = require("express");
const session = require("express-session");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

let db;

// Configurações do Express
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sessão do usuário
app.use(
  session({
    secret: process.env.SESSION_SECRET || "saepvision_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000
    }
  })
);

// Permite acessar os arquivos HTML, CSS, JS e imagens da pasta principal
app.use(express.static(__dirname));

// Pasta onde as fotografias serão salvas
const uploadDir = path.join(__dirname, "img", "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuração do envio de imagens
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const nome = Date.now() + "-" +
      file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");

    cb(null, nome);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const permitidos = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp"
    ];

    if (permitidos.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Formato de imagem não permitido."));
    }
  }
});

// Verifica se o usuário está conectado
function exigirLogin(req, res, next) {
  if (!req.session.usuario) {
    return res.status(401).json({
      erro: "Faça login para continuar."
    });
  }

  next();
}

// Verifica se o usuário é fotógrafo
function exigirFotografo(req, res, next) {
  if (
    !req.session.usuario ||
    req.session.usuario.tipo !== "fotografo"
  ) {
    return res.status(403).json({
      erro: "Apenas fotógrafos podem publicar fotografias."
    });
  }

  next();
}

// CADASTRO
app.post("/api/cadastro", async (req, res) => {
  try {
    const { nome, email, senha, tipo } = req.body;

    if (!nome || !email || !senha ||
        !["usuario", "fotografo"].includes(tipo)) {
      return res.status(400).json({
        erro: "Preencha todos os campos corretamente."
      });
    }

    if (senha.length < 6) {
      return res.status(400).json({
        erro: "A senha deve ter pelo menos 6 caracteres."
      });
    }

    const [existente] = await db.query(
      "SELECT id FROM usuarios WHERE email = ?",
      [email]
    );

    if (existente.length > 0) {
      return res.status(409).json({
        erro: "Este e-mail já está cadastrado."
      });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const [resultado] = await db.query(
      `INSERT INTO usuarios (nome, email, senha, tipo)
       VALUES (?, ?, ?, ?)`,
      [nome, email, senhaHash, tipo]
    );

    req.session.usuario = {
      id: resultado.insertId,
      nome,
      email,
      tipo
    };

    res.status(201).json({
      mensagem: "Cadastro realizado com sucesso!",
      usuario: req.session.usuario
    });

  } catch (erro) {
    console.error(erro);
    res.status(500).json({
      erro: "Erro ao realizar cadastro."
    });
  }
});

// LOGIN
app.post("/api/login", async (req, res) => {
  try {
    const { email, senha } = req.body;

    const [usuarios] = await db.query(
      "SELECT * FROM usuarios WHERE email = ?",
      [email]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({
        erro: "Usuário não encontrado ou senha incorreta"
      });
    }

    const usuario = usuarios[0];

    const senhaCorreta = await bcrypt.compare(
      senha,
      usuario.senha
    );

    if (!senhaCorreta) {
      return res.status(401).json({
        erro: "Usuário não encontrado ou senha incorreta"
      });
    }

    req.session.usuario = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      tipo: usuario.tipo
    };

    res.json({
      mensagem: "Login realizado com sucesso!",
      usuario: req.session.usuario
    });

  } catch (erro) {
    console.error(erro);
    res.status(500).json({
      erro: "Erro ao fazer login."
    });
  }
});

// SAIR DA CONTA
app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ mensagem: "Você saiu da conta." });
  });
});

// USUÁRIO LOGADO
app.get("/api/eu", (req, res) => {
  res.json({
    usuario: req.session.usuario || null
  });
});

// LISTAR PUBLICAÇÕES E PESQUISAR FOTÓGRAFOS
app.get("/api/publicacoes", async (req, res) => {
  try {
    const busca = req.query.busca || "";
    const usuarioId = req.session.usuario?.id || 0;

    const [publicacoes] = await db.query(
      `SELECT
        p.id,
        p.titulo,
        p.localizacao,
        p.imagem,
        p.criado_em,
        u.id AS usuario_id,
        u.nome AS fotografo,
        (SELECT COUNT(*)
         FROM curtidas c
         WHERE c.publicacao_id = p.id) AS curtidas,
        (SELECT COUNT(*)
         FROM curtidas c
         WHERE c.publicacao_id = p.id
         AND c.usuario_id = ?) AS curtiu
       FROM publicacoes p
       JOIN usuarios u ON u.id = p.usuario_id
       WHERE u.tipo = 'fotografo'
       AND u.nome LIKE ?
       ORDER BY p.criado_em DESC`,
      [usuarioId, "%" + busca + "%"]
    );

    res.json(publicacoes);

  } catch (erro) {
    console.error(erro);
    res.status(500).json({
      erro: "Erro ao carregar publicações."
    });
  }
});

// PUBLICAR FOTOGRAFIA
app.post(
  "/api/publicacoes",
  exigirFotografo,
  upload.single("imagem"),
  async (req, res) => {
    try {
      const { titulo, localizacao } = req.body;

      if (!titulo || !req.file) {
        return res.status(400).json({
          erro: "Informe o título e selecione uma imagem."
        });
      }

      const imagem = "/img/uploads/" + req.file.filename;

      await db.query(
        `INSERT INTO publicacoes
         (usuario_id, titulo, localizacao, imagem)
         VALUES (?, ?, ?, ?)`,
        [
          req.session.usuario.id,
          titulo,
          localizacao || "",
          imagem
        ]
      );

      res.status(201).json({
        mensagem: "Fotografia publicada!"
      });

    } catch (erro) {
      console.error(erro);
      res.status(500).json({
        erro: "Erro ao publicar fotografia."
      });
    }
  }
);

// CURTIR OU REMOVER CURTIDA
app.post(
  "/api/publicacoes/:id/curtir",
  exigirLogin,
  async (req, res) => {
    try {
      const publicacaoId = req.params.id;
      const usuarioId = req.session.usuario.id;

      const [existente] = await db.query(
        `SELECT id FROM curtidas
         WHERE usuario_id = ? AND publicacao_id = ?`,
        [usuarioId, publicacaoId]
      );

      let curtiu;

      if (existente.length > 0) {
        await db.query(
          `DELETE FROM curtidas
           WHERE usuario_id = ? AND publicacao_id = ?`,
          [usuarioId, publicacaoId]
        );

        curtiu = false;

      } else {
        await db.query(
          `INSERT INTO curtidas (usuario_id, publicacao_id)
           VALUES (?, ?)`,
          [usuarioId, publicacaoId]
        );

        curtiu = true;
      }

      const [total] = await db.query(
        `SELECT COUNT(*) AS quantidade
         FROM curtidas
         WHERE publicacao_id = ?`,
        [publicacaoId]
      );

      res.json({
        curtiu,
        curtidas: total[0].quantidade
      });

    } catch (erro) {
      console.error(erro);
      res.status(500).json({
        erro: "Erro ao registrar curtida."
      });
    }
  }
);

// VISUALIZAR PERFIL
app.get("/api/usuarios/:id", async (req, res) => {
  try {
    const [usuarios] = await db.query(
      `SELECT id, nome, tipo, foto_perfil, email
       FROM usuarios
       WHERE id = ?`,
      [req.params.id]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({
        erro: "Usuário não encontrado."
      });
    }

    const [publicacoes] = await db.query(
      `SELECT id, titulo, localizacao, imagem
       FROM publicacoes
       WHERE usuario_id = ?
       ORDER BY criado_em DESC`,
      [req.params.id]
    );

    res.json({
      usuario: usuarios[0],
      publicacoes
    });

  } catch (erro) {
    console.error(erro);
    res.status(500).json({
      erro: "Erro ao carregar perfil."
    });
  }
});

// EXCLUIR PUBLICAÇÃO
app.delete(
  "/api/publicacoes/:id",
  exigirLogin,
  async (req, res) => {
    try {
      const [resultado] = await db.query(
        `DELETE FROM publicacoes
         WHERE id = ? AND usuario_id = ?`,
        [
          req.params.id,
          req.session.usuario.id
        ]
      );

      if (resultado.affectedRows === 0) {
        return res.status(404).json({
          erro: "Publicação não encontrada ou não pertence a você."
        });
      }

      res.json({
        mensagem: "Publicação excluída."
      });

    } catch (erro) {
      console.error(erro);
      res.status(500).json({
        erro: "Erro ao excluir publicação."
      });
    }
  }
);

// TRATAMENTO DE ERROS
app.use((erro, req, res, next) => {
  console.error(erro);

  res.status(400).json({
    erro: erro.message || "Ocorreu um erro."
  });
});

// CONECTAR AO MYSQL E INICIAR O SERVIDOR
async function iniciarServidor() {
  try {
    db = await mysql.createPool({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "saepvision",
      waitForConnections: true,
      connectionLimit: 10
    });

    await db.query("SELECT 1");

    console.log("Banco de dados conectado!");

    app.listen(PORT, () => {
      console.log(`SAEPVision em http://localhost:${PORT}`);
    });

  } catch (erro) {
    console.error("Erro ao conectar ao MySQL:");
    console.error(erro.message);
  }
}

iniciarServidor();
