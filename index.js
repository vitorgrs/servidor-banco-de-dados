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
/*
aapp.set('view engine', 'ejs'); // ou o motor de template que você está usando
app.set('views', path.join(__dirname, 'views')); // certifique-se de ajustar o caminho

// Rota para obter os detalhes da denúncia com base no ID
app.get('/denuncias/:id', async (req, res) => {
  const idDaDenuncia = req.params.id;
  const query = 'SELECT * FROM denuncias WHERE id = $1';
  const values = [idDaDenuncia];

  try {
    const result = await client.query(query, values);
    const denuncia = result.rows[0];

    // Renderiza a página feedback.html com os dados da denúncia
    res.render('feedback', { denuncia });
  } catch (error) {
    console.error('Erro ao buscar dados da denúncia:', error);
    res.status(500).send('Erro ao buscar dados da denúncia');
  }
});
*/
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor está ouvindo na porta ${PORT}`);
});
