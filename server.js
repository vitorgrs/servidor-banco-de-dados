// server.js
const { Pool } = require('pg');
const express = require('express');
const cors = require('cors');
const app = express();

// Configuração do CORS
app.use(cors());
app.use(express.json()); 

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

app.post('/inserirResposta', async (req, res) => {
  const { denuncia, data, relato, logradouro, complemento, cidade, bairro, descricaoLocal, contatos } = req.body;

  const query = 'INSERT INTO denuncias (id, tipo_de_denuncia, data_do_ocorrido, relato, logradouro, complemento, cidade, bairro, descricao_do_local, contato) VALUES (DEFAULT,$1, $2, $3, $4, $5, $6, $7, $8, $9)';
  const values = [denuncia, data, relato, logradouro, complemento, cidade, bairro, descricaoLocal, contatos];

  try {
    const result = await pool.query(query, values);
    console.log('Resposta inserida com sucesso:', result);
    res.status(200).send('Resposta inserida com sucesso');
  } catch (error) {
    console.error('Erro ao inserir denuncia:', error);
    res.status(500).send('Erro ao inserir resposta');
  }
});
app.options('/inserirResposta', cors());
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor está ouvindo na porta ${PORT}`);
});
