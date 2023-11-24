const { Client } = require('pg');
const express = require('express');
const cors = require('cors');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');

// Configuraçôes
app.use(cors());
app.use(express.json()); 
app.use(bodyParser.json());

const client = new Client({
    user: 'postgres',
    host: 'monorail.proxy.rlwy.net',
    database: 'railway',
    password: 'af--BC64gE-1A3gECdGEFgC5d6fgDfdE',
    port: 59355,
});

try {
  await client.connect();
  console.log('Conexão bem-sucedida ao banco de dados');
} catch (error) {
  console.error('Erro ao conectar ao banco de dados:', error);
  // Terminar o aplicativo ou tomar medidas apropriadas
}


app.post('/inserirResposta', async (req, res) => {
  const { denuncia, data, relato, logradouro, complemento, cidade, bairro, descricaoLocal, contatos } = req.body;
  console.log(denuncia)

  const query = 'INSERT INTO denuncias(tipo_de_denuncia, data_do_ocorrido, relato, logradouro, complemento, cidade, bairro, descricao_do_local, contato) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id';  
  const values = [denuncia, data, relato, logradouro, complemento, cidade, bairro, descricaoLocal, contatos];

  try {
    const result = await client.query(query, values);
    const idDaDenuncia = result.rows[0].id;
    res.status(200).json({ id: idDaDenuncia });
    console.log('Resposta inserida com sucesso:', result);
    console.log('Resposta inserida com sucesso. ID da denúncia:', idDaDenuncia);
    res.status(200).send('Resposta inserida com sucesso');
  } catch (error) {
    console.error('Erro ao inserir denuncia:', error);
    res.status(500).send('Erro ao inserir resposta');
  }
});
app.get('/obterDenuncia/:protocolo', async (req, res) => {
  const protocolo = req.params.protocolo;

  try {
    const result = await db.query('SELECT * FROM denuncias WHERE protocolo = $1', [protocolo]);
    
    if (result.rows.length > 0) {
      const denuncia = result.rows[0];
      res.status(200).json(denuncia);
    } else {
      res.status(404).send('Denúncia não encontrada');
    }
  } catch (error) {
    console.error('Erro ao obter denúncia do banco de dados:', error);
    res.status(500).send('Erro interno do servidor');
  }
});


/*
app.get('/feedback/:id', (req, res) => {
  const protocolo = req.params.id;
  const filePath = path.join( __dirname, 'feedback.html');  
  res.sendFile(filePath);
});

// Rota para obter os detalhes da denúncia com base no ID
app.get('/obterDenuncia/:id', async (req, res) => {
  const idDaDenuncia = req.params.id;
  const query = 'SELECT * FROM denuncias WHERE id = $1';
  const values = [idDaDenuncia];

  try {
    const result = await client.query(query, values);
    const denuncia = result.rows[0];

    if (denuncia) {
      // Retorna o JSON diretamente
      res.status(200).json(denuncia);
    } else {
      res.status(404).send('Denúncia não encontrada');
    }
  } catch (error) {
    console.error('Erro ao buscar dados da denúncia:', error);
    res.status(500).send('Erro ao buscar dados da denúncia');
  }
});
*/
process.on('SIGINT', async () => {
  try {
    await client.end();
    console.log('Conexão com o banco de dados encerrada');
    process.exit(0);
  } catch (err) {
    console.error('Erro ao encerrar a conexão com o banco de dados:', err);
    process.exit(1);
  }
});
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor está ouvindo na porta ${PORT}`);
});
