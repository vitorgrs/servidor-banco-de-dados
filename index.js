// server.js
const { Client } = require('pg');
const express = require('express');
const cors = require('cors');
const app = express();

// Configuração do CORS
app.use(cors());
app.use(express.json()); 


const client = new Client({
    user: 'postgres',
    host: 'monorail.proxy.rlwy.net',
    database: 'railway',
    password: 'af--BC64gE-1A3gECdGEFgC5d6fgDfdE',
    port: 59355,
});

client.connect().catch((eror) => console.log(eror))


app.post('/inserirResposta', async (req, res) => {
  const { denuncia, data, relato, logradouro, complemento, cidade, bairro, descricaoLocal, contatos } = req.body;
  console.log(denuncia)

  const query = 'INSERT INTO denuncias(id, tipo_de_denuncia, data_do_ocorrido, relato, logradouro, complemento, cidade, bairro, descricao_do_local, contato) VALUES (DEFAULT,$1, $2, $3, $4, $5, $6, $7, $8, $9)';
  const values = [denuncia, data, relato, logradouro, complemento, cidade, bairro, descricaoLocal, contatos];

  try {
    const result = await client.query(query, values);
    console.log('Resposta inserida com sucesso:', result);
    res.status(200).send('Resposta inserida com sucesso');
  } catch (error) {
    console.error('Erro ao inserir denuncia:', error);
    res.status(500).send('Erro ao inserir resposta');
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor está ouvindo na porta ${PORT}`);
});